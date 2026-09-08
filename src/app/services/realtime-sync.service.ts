import { Injectable, NgZone, signal } from '@angular/core';
import { initializeApp } from 'firebase/app';

import {
  connectDatabaseEmulator,
  Database,
  getDatabase,
  onValue,
  ref,
  update
} from 'firebase/database';

import {
  Message,
  MessageService
} from './message.service';

import {
  Setlist,
  SongService
} from './song.service';

interface RealtimeConfig {
  firebaseDatabaseUrl: string;
  projectId?: string;
  roomId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RealtimeSyncService {
  readonly connected = signal(false);
  readonly ready = signal(false);

  // Number of writes awaiting Firebase confirmation.
  readonly pending = signal(0);

  readonly failed = signal(false);
  readonly error = signal('');

  readonly mode = signal('MOHA Singphony');
  readonly room = signal('local-test');

  private db?: Database;
  private path = '';
  private initialized = false;

  private readonly clientId =
    crypto.randomUUID?.() ??
    `client_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  private updates: Record<string, unknown> = {};
  private failedUpdates: Record<string, unknown> = {};

  private scheduled = false;

  private knownLists: Record<string, Setlist> = {};

  private readonly pendingWrites = new Set<Promise<void>>();

  private messagesLoaded = false;
  private seenMessages = new Set<string>();

  private cueSlot = 0;

  constructor(
    private messages: MessageService,
    private songs: SongService,
    private zone: NgZone
  ) {}

  get canSend(): boolean {
    return (
      this.connected() &&
      this.ready() &&
      !this.error()
    );
  }

  async initFromConfig(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    try {
      const response = await fetch('/config.json', {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('Could not load config.json.');
      }

      const configFile = await response.json();
      const config = configFile.realtime as RealtimeConfig;

      if (!config) {
        throw new Error(
          'The realtime configuration is missing from config.json.'
        );
      }

      const params = new URLSearchParams(location.search);

      const useEmulator =
        params.get('backend') === 'emulator';

      const roomId =
        params.get('room') ||
        config.roomId ||
        'local-test';

      if (!/^[a-zA-Z0-9_-]{1,80}$/.test(roomId)) {
        throw new Error(
          'Room must contain only letters, numbers, ' +
          'hyphens or underscores, with a maximum of 80 characters.'
        );
      }

      if (!useEmulator && !config.firebaseDatabaseUrl) {
        throw new Error(
          'firebaseDatabaseUrl is missing from config.json.'
        );
      }

      this.room.set(roomId);

      this.mode.set(
        useEmulator
          ? 'Local Firebase emulator'
          : 'MOHA Singphony'
      );

      // Keep the new data model separate from the old prototype data.
      this.path = `musifyV2/rooms/${roomId}`;

      const app = initializeApp(
        {
          databaseURL: useEmulator
            ? 'https://demo-musify-default-rtdb.firebaseio.com'
            : config.firebaseDatabaseUrl,

          projectId: useEmulator
            ? 'demo-musify'
            : config.projectId || 'moha-singphony'
        },
        this.clientId
      );

      this.db = getDatabase(app);

      if (useEmulator) {
        connectDatabaseEmulator(
          this.db,
          location.hostname,
          9000
        );
      }

      this.listenForConnection();
      this.listenForState();
      this.listenForMessages();

      this.bindLocalChanges();
      this.registerPendingSaveWarning();
    } catch (error) {
      this.error.set(this.errorMessage(error));
    }
  }

  // --------------------------------------------------
  // Incoming Firebase updates
  // --------------------------------------------------

  private listenForConnection(): void {
    if (!this.db) {
      return;
    }

    onValue(
      ref(this.db, '.info/connected'),
      snapshot => {
        this.zone.run(() => {
          this.connected.set(snapshot.val() === true);
        });
      }
    );
  }

  private listenForState(): void {
    if (!this.db) {
      return;
    }

    onValue(
      ref(this.db, this.path),
      snapshot => {
        this.zone.run(() => {
          const data = snapshot.val() || {};

          // Local changes have already updated this device.
          // Do not reapply our own optimistic Firebase events.
          if (
            data._originId !== this.clientId ||
            !this.ready()
          ) {
            this.knownLists = data.setlists || {};

            this.songs.setSetlistsFromRemote(
              this.knownLists
            );

            this.songs.ingestLive(data.live || null);
            this.songs.ingestProjectionPreview(
              data.projectionPreview ?? null
            );
          }

          this.ready.set(true);

          if (!this.failed()) {
            this.error.set('');
          }
        });
      },
      error => {
        this.zone.run(() => {
          this.error.set(
            `Database access failed: ${error.message}`
          );
        });
      }
    );
  }

  private listenForMessages(): void {
    if (!this.db) {
      return;
    }

    onValue(
      ref(this.db, `${this.path}/cues`),
      snapshot => {
        this.zone.run(() => {
          const values = Object.values(
            snapshot.val() || {}
          ) as Message[];

          for (const message of values) {
            if (!message?.id) {
              continue;
            }

            // The initial snapshot contains existing cues.
            // Remember them without replaying them.
            if (!this.messagesLoaded) {
              this.seenMessages.add(message.id);
              continue;
            }

            if (this.seenMessages.has(message.id)) {
              continue;
            }

            this.seenMessages.add(message.id);

            const sentByThisDevice =
              message.originId === this.clientId;

            const stillVisible =
              (message.expiresAt || 0) > Date.now();

            if (!sentByThisDevice && stillVisible) {
              this.messages.receiveExternalMessage(message);
            }
          }

          this.messagesLoaded = true;

          // Bound the device's duplicate-tracking memory.
          if (this.seenMessages.size > 1000) {
            this.seenMessages = new Set(
              values
                .filter(message => !!message?.id)
                .map(message => message.id)
            );
          }
        });
      },
      error => {
        this.zone.run(() => {
          this.error.set(
            `Message access failed: ${error.message}`
          );
        });
      }
    );
  }

  // --------------------------------------------------
  // Outgoing local changes
  // --------------------------------------------------

  private bindLocalChanges(): void {
    this.songs.setlistsLocal$.subscribe(map => {
      const ids = new Set([
        ...Object.keys(this.knownLists),
        ...Object.keys(map)
      ]);

      // Write only changed setlists instead of replacing
      // the entire collection on every edit.
      for (const id of ids) {
        const nextValue = JSON.stringify(map[id]);
        const previousValue = JSON.stringify(
          this.knownLists[id]
        );

        if (nextValue !== previousValue) {
          this.queue(
            `setlists/${id}`,
            map[id] ?? null
          );
        }
      }

      this.knownLists = structuredClone(map);
    });

    this.songs.liveLocal$.subscribe(() => {
      this.queue('live', this.songs.snapshot());
    });
    this.songs.projectionPreviewLocal$.subscribe(
      preview => {
        this.queue('projectionPreview', preview);
      }
    );

    // Important: subscribe to messagesLocal$, not messages$.
    // Received messages must never be published back to Firebase.
    this.messages.messagesLocal$.subscribe(message => {
      if (!this.canSend) {
        this.error.set(
          'Not connected. This cue was not delivered.'
        );
        return;
      }

      // Rolling transient buffer with at most 128 slots.
      // Each message still has its own ID for duplicate detection.
      const slot =
        (Date.now() + this.cueSlot++) % 128;

      this.queue(`cues/${slot}`, {
        ...message,
        originId: this.clientId
      });
    });
  }

  private queue(path: string, value: unknown): void {
    this.updates[path] = value;

    if (this.scheduled) {
      return;
    }

    this.scheduled = true;

    // Group synchronous changes from a single action.
    // For example: updated setlist keys + updated live state.
    queueMicrotask(() => {
      this.scheduled = false;
      this.sendBatch();
    });
  }

  private sendBatch(): void {
    if (
      !this.db ||
      Object.keys(this.updates).length === 0
    ) {
      return;
    }

    // Serialize dates and remove undefined optional properties.
    const data: Record<string, unknown> = JSON.parse(
      JSON.stringify({
        ...this.updates,
        _originId: this.clientId
      })
    );

    this.updates = {};

    this.pending.update(count => count + 1);

    const write = update(
      ref(this.db, this.path),
      data
    )
      .then(() => {
        this.zone.run(() => {
          if (!this.failed()) {
            this.error.set('');
          }
        });
      })
      .catch(error => {
        this.failedUpdates = {
          ...this.failedUpdates,
          ...data
        };

        this.zone.run(() => {
          this.failed.set(true);

          this.error.set(
            `Save failed: ${this.errorMessage(error)}. ` +
            'Keep this window open and retry.'
          );
        });

        throw error;
      })
      .finally(() => {
        this.zone.run(() => {
          this.pending.update(count => count - 1);
          this.pendingWrites.delete(write);
        });
      });

    this.pendingWrites.add(write);

    // Errors are displayed through the error signal.
    // flush() can still observe the rejected write.
    void write.catch(() => {});
  }

  // --------------------------------------------------
  // Explicit saving and retry
  // --------------------------------------------------

  async flush(): Promise<void> {
    this.sendBatch();

    await Promise.all([...this.pendingWrites]);

    if (this.error()) {
      throw new Error(this.error());
    }
  }

  async retry(): Promise<void> {
    if (!this.connected()) {
      return;
    }

    this.updates = {
      ...this.failedUpdates,
      ...this.updates
    };

    this.failedUpdates = {};

    this.failed.set(false);
    this.error.set('');

    try {
      await this.flush();
    } catch {
      // The connection strip will display the save error.
    }
  }

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  private registerPendingSaveWarning(): void {
    window.addEventListener('beforeunload', event => {
      const hasPendingChanges =
        this.pending() > 0 ||
        Object.keys(this.updates).length > 0 ||
        this.failed();

      if (hasPendingChanges) {
        event.preventDefault();
        event.returnValue = '';
      }
    });
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : String(error);
  }
}
