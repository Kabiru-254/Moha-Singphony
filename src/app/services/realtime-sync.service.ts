import { Injectable } from '@angular/core';
import { MessageService, Message, CurrentSongState } from './message.service';
import { SongService, Setlist } from './song.service';

interface RealtimeConfig {
  provider?: 'firebase';
  firebaseDatabaseUrl?: string; // e.g., https://your-project-id-default-rtdb.firebaseio.com
  roomId?: string; // logical room/channel name
  enabled?: boolean;
}

@Injectable({ providedIn: 'root' })
export class RealtimeSyncService {
  private clientId = this.generateId();
  private config: RealtimeConfig | null = null;
  private eventSource?: EventSource;
  private songEventSource?: EventSource;
  private initialized = false;

  constructor(private messageService: MessageService, private songService: SongService) {}

  async initFromConfig(): Promise<void> {
    if (this.initialized) return;

    try {
      const resp = await fetch('/config.json', { cache: 'no-store' });
      if (!resp.ok) {
        // No config.json found or not served; just skip enabling realtime
        return;
      }
      const cfgAll = await resp.json();
      const urlParams = new URLSearchParams(window.location.search);
      const roomOverride = urlParams.get('room') || urlParams.get('r');
      const realtime: RealtimeConfig = {
        provider: cfgAll?.realtime?.provider,
        firebaseDatabaseUrl: cfgAll?.realtime?.firebaseDatabaseUrl,
        roomId: roomOverride || cfgAll?.realtime?.roomId || 'demo',
        enabled: cfgAll?.realtime?.enabled !== false
      };
      if (realtime.enabled && realtime.provider === 'firebase' && realtime.firebaseDatabaseUrl) {
        this.config = realtime;
        this.initialized = true;
        this.bindLocalStreams();
        this.startFirebaseListeners();
      }
    } catch (e) {
      // Ignore config errors for now
      console.warn('[RealtimeSync] Failed to load config.json:', e);
    }
  }

  private bindLocalStreams() {
    // Outgoing messages -> Firebase
    this.messageService.messages$.subscribe(msg => {
      if (!this.config) return;
      const outgoing: Message = { ...msg, originId: this.clientId };
      // Write to /rooms/{roomId}/messages/{id}.json
      const path = `${this.config.firebaseDatabaseUrl}/rooms/${encodeURIComponent(this.config.roomId!)}/messages/${outgoing.id}.json`;
      fetch(path, { method: 'PUT', body: JSON.stringify(outgoing) }).catch(() => {});
    });

    // Outgoing currentSongState -> Firebase (only on local user actions)
    this.messageService.currentSongLocal$.subscribe((state: CurrentSongState) => {
      if (!this.config) return;
      const withOrigin: any = { ...state, _originId: this.clientId };
      const path = `${this.config.firebaseDatabaseUrl}/rooms/${encodeURIComponent(this.config.roomId!)}/currentSong.json`;
      fetch(path, { method: 'PUT', body: JSON.stringify(withOrigin) }).catch(() => {});
    });

    // Outgoing setlists -> Firebase (only on local mutations)
    this.songService.setlistsLocal$.subscribe(map => {
      if (!this.config) return;
      const room = encodeURIComponent(this.config.roomId!);
      const path = `${this.config.firebaseDatabaseUrl}/rooms/${room}/setlists.json`;
      // Serialize Dates to ISO strings
      const serialized: Record<string, any> = {};
      Object.keys(map || {}).forEach(id => {
        const sl: any = map[id];
        serialized[id] = { ...sl, date: sl?.date instanceof Date ? sl.date.toISOString() : sl?.date };
      });
      fetch(path, { method: 'PUT', body: JSON.stringify(serialized) }).catch(() => {});
    });

    // Outgoing active setlist id -> Firebase (only on local changes)
    this.songService.activeSetlistLocal$.subscribe(id => {
      if (!this.config) return;
      const room = encodeURIComponent(this.config.roomId!);
      const path = `${this.config.firebaseDatabaseUrl}/rooms/${room}/activeSetlistId.json`;
      fetch(path, { method: 'PUT', body: JSON.stringify(id) }).catch(() => {});
    });

    // Outgoing broadcast setlist id -> Firebase (only on local changes)
    this.songService.broadcastSetlistLocal$.subscribe(id => {
      if (!this.config) return;
      const room = encodeURIComponent(this.config.roomId!);
      const path = `${this.config.firebaseDatabaseUrl}/rooms/${room}/broadcastSetlistId.json`;
      fetch(path, { method: 'PUT', body: JSON.stringify(id) }).catch(() => {});
    });
  }

  private startFirebaseListeners() {
    if (!this.config) return;
    const base = this.config.firebaseDatabaseUrl!.replace(/\/$/, '');
    const room = encodeURIComponent(this.config.roomId!);

    // Messages SSE
    const messagesUrl = `${base}/rooms/${room}/messages.json`;
    const currentSongUrl = `${base}/rooms/${room}/currentSong.json`;
    const setlistsUrl = `${base}/rooms/${room}/setlists.json`;
    const activeSetlistUrl = `${base}/rooms/${room}/activeSetlistId.json`;

    // Firebase RTDB REST streaming uses text/event-stream with event types 'put' and 'patch'
    const es = new EventSource(messagesUrl);
    this.eventSource = es;

    const handleMessagesEvent = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        // Firebase RTDB streaming payload shape: { path: string, data: any }
        const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : null;
        if (data == null) return; // ignore deletes or empty

        if (typeof data === 'object' && !Array.isArray(data)) {
          // Initial or multi-child payload: iterate child nodes (messages keyed by id)
          Object.values(data).forEach((val: any) => this.tryIngestMessage(val));
        } else {
          // Single node payload
          this.tryIngestMessage(data);
        }
      } catch (_) {}
    };

    es.addEventListener('put', handleMessagesEvent as EventListener);
    es.addEventListener('patch', handleMessagesEvent as EventListener);
    es.onerror = () => {
      // On error, EventSource will retry; nothing to do
    };

    // Current song SSE for realtime updates
    const esSong = new EventSource(currentSongUrl);
    this.songEventSource = esSong;

    const handleSongEvent = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : null;
        if (!data) return;
        if (data._originId && data._originId === this.clientId) return;
        const copy: any = { ...data };
        delete copy._originId;
        this.messageService.setCurrentSongStateFromRemote(copy as CurrentSongState);
      } catch {}
    };

    esSong.addEventListener('put', handleSongEvent as EventListener);
    esSong.addEventListener('patch', handleSongEvent as EventListener);
    esSong.onerror = () => {
      // EventSource auto-reconnects; no-op
    };

    // Setlists SSE for realtime updates
    const esSetlists = new EventSource(setlistsUrl);
    const handleSetlistsEvent = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : null;
        if (data == null) return;
        // Coercion of dates happens in SongService
        this.songService.setSetlistsFromRemote(data as Record<string, Setlist>);
      } catch {}
    };
    esSetlists.addEventListener('put', handleSetlistsEvent as EventListener);
    esSetlists.addEventListener('patch', handleSetlistsEvent as EventListener);
    esSetlists.onerror = () => {};

    // Active setlist id SSE
    const esActive = new EventSource(activeSetlistUrl);
    const handleActiveEvent = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : null;
        // data can be string id or null
        this.songService.setActiveSetlistFromRemote(data as string | null);
      } catch {}
    };
    esActive.addEventListener('put', handleActiveEvent as EventListener);
    esActive.addEventListener('patch', handleActiveEvent as EventListener);
    esActive.onerror = () => {};

    // Broadcast setlist id SSE
    const broadcastUrl = `${base}/rooms/${room}/broadcastSetlistId.json`;
    const esBroadcast = new EventSource(broadcastUrl);
    const handleBroadcastEvent = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : null;
        this.songService.setBroadcastSetlistFromRemote(data as string | null);
      } catch {}
    };
    esBroadcast.addEventListener('put', handleBroadcastEvent as EventListener);
    esBroadcast.addEventListener('patch', handleBroadcastEvent as EventListener);
    esBroadcast.onerror = () => {};
  }

  private tryIngestMessage(val: any) {
    if (!val) return;
    // Avoid echoing own-origin messages
    if (val.originId && val.originId === this.clientId) return;
    // Coerce timestamp back to Date if stored as string
    if (val.timestamp && typeof val.timestamp === 'string') {
      try { val.timestamp = new Date(val.timestamp); } catch {}
    }
    this.messageService.receiveExternalMessage(val as Message);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
}
