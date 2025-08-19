import { Injectable } from '@angular/core';
import { MessageService, Message, CurrentSongState } from './message.service';

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
  private initialized = false;

  constructor(private messageService: MessageService) {}

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

    // Outgoing currentSongState -> Firebase
    this.messageService.currentSong$.subscribe((state: CurrentSongState) => {
      if (!this.config) return;
      const withOrigin: any = { ...state, _originId: this.clientId };
      const path = `${this.config.firebaseDatabaseUrl}/rooms/${encodeURIComponent(this.config.roomId!)}/currentSong.json`;
      fetch(path, { method: 'PUT', body: JSON.stringify(withOrigin) }).catch(() => {});
    });
  }

  private startFirebaseListeners() {
    if (!this.config) return;
    const base = this.config.firebaseDatabaseUrl!.replace(/\/$/, '');
    const room = encodeURIComponent(this.config.roomId!);

    // Messages SSE
    const messagesUrl = `${base}/rooms/${room}/messages.json`;
    const currentSongUrl = `${base}/rooms/${room}/currentSong.json`;

    // Firebase RTDB REST streaming uses text/event-stream by appending .json and setting header. EventSource will set that.
    const es = new EventSource(messagesUrl);
    this.eventSource = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // When entire tree is returned, iterate; when single child event, handle appropriately.
        if (!data) return;
        if (typeof data === 'object' && !Array.isArray(data)) {
          Object.values(data).forEach((val: any) => this.tryIngestMessage(val));
        }
      } catch (_) {}
    };
    es.onerror = () => {
      // On error, EventSource will retry; nothing to do
    };

    // Poll currentSong as a fallback (SSE for single object can be flaky). Keep it simple
    const pollCurrent = async () => {
      try {
        const resp = await fetch(currentSongUrl, { cache: 'no-store' });
        if (resp.ok) {
          const state = await resp.json();
          if (state && state._originId !== this.clientId) {
            const copy: any = { ...state };
            delete copy._originId;
            this.messageService.setCurrentSongStateFromRemote(copy as CurrentSongState);
          }
        }
      } catch {}
    };
    // Polling interval small enough for demo, large enough to not spam
    setInterval(pollCurrent, 1500);
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
