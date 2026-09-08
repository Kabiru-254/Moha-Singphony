import { CommonModule } from '@angular/common';

import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  combineLatest,
  Subscription
} from 'rxjs';

import {
  CurrentSongState,
  Message,
  MessageService,
  MessageType,
  RecipientRole
} from '../../services/message.service';

import {
  RealtimeSyncService
} from '../../services/realtime-sync.service';

import {
  MUSICAL_KEYS,
  Setlist,
  SetlistSong,
  SongService
} from '../../services/song.service';

@Component({
  selector: 'app-songleader',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './songleader.component.html',
  styleUrl: './songleader.component.css'
})
export class SongleaderComponent implements OnInit, OnDestroy {
  readonly keys = [...MUSICAL_KEYS];

  readonly recipients = [
    {
      value: RecipientRole.MUSICIAN,
      label: 'Musicians'
    },
    {
      value: RecipientRole.PIANIST,
      label: 'Pianist'
    },
    {
      value: RecipientRole.SOUND_TEAM,
      label: 'Sound team'
    },
    {
      value: RecipientRole.DEACON,
      label: 'Deacon'
    },
    {
      value: RecipientRole.ALL,
      label: 'Everyone'
    }
  ];

  // These predefined musical cues target the musicians display.
  readonly cues = [
    'FASTER',
    'SLOWER',
    'BUILD',
    'BREAK IT DOWN',
    'HOLD',
    'REPEAT',
    'STOP',
    'END',
    'DRUMS ONLY',
    'KEYS ONLY',
    'STRINGS ONLY',
    'VOICES ONLY',
    'COME IN',
    'DROP OUT'
  ];

  state: CurrentSongState | null = null;

  broadcast: Setlist | null = null;
  broadcastId: string | null = null;
  nextSong: SetlistSong | null = null;

  customText = '';

  customRecipients: RecipientRole[] = [
    RecipientRole.MUSICIAN
  ];

  incoming: Message | null = null;
  recent: Message[] = [];

  // Brief feedback identifying the last pressed cue button.
  activeCue = '';

  endSeconds = 30;
  remaining: number | null = null;

  private readonly subscriptions = new Subscription();

  private cueTimer?: ReturnType<typeof setTimeout>;
  private incomingTimer?: ReturnType<typeof setTimeout>;
  private countdownTimer?: ReturnType<typeof setInterval>;

  constructor(
    private messages: MessageService,
    public songs: SongService,
    public realtime: RealtimeSyncService
  ) {}

  ngOnInit(): void {
    this.watchLiveState();
    this.watchIncomingMessages();

    this.subscriptions.add(
      this.songs.endingAt$.subscribe(() => {
        this.updateCountdown();
      })
    );

    // This component only displays the countdown.
    // AppComponent handles completing it and returning Home.
    this.countdownTimer = setInterval(() => {
      this.updateCountdown();
    }, 250);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();

    if (this.cueTimer) {
      clearTimeout(this.cueTimer);
    }

    if (this.incomingTimer) {
      clearTimeout(this.incomingTimer);
    }

    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  }

  // --------------------------------------------------
  // Current broadcast state
  // --------------------------------------------------

  private watchLiveState(): void {
    this.subscriptions.add(
      combineLatest([
        this.messages.currentSong$,
        this.songs.broadcastSetlist$,
        this.songs.broadcastSetlistId$
      ]).subscribe(([state, setlist, broadcastId]) => {
        this.state = state;

        this.broadcast = setlist.id
          ? setlist
          : null;

        this.broadcastId = broadcastId;
        this.nextSong = this.songs.getNextSong();
      })
    );
  }

  // --------------------------------------------------
  // Persistent key controls
  // --------------------------------------------------

  setKey(key: string): void {
    if (!this.realtime.canSend) {
      return;
    }

    this.songs.setDirectKey(key);
  }

  transpose(step: -1 | 1): void {
    if (!this.realtime.canSend) {
      return;
    }

    this.songs.transposeCurrent(step);
  }

  askKey(): void {
    if (!this.realtime.canSend) {
      return;
    }

    // Updates the persistent key and emits one key-change cue.
    // The musicians display will render "?" as "WHAT KEY?".
    this.songs.setDirectKey('?');
  }

  // --------------------------------------------------
  // Song navigation
  // --------------------------------------------------

  previous(): void {
    if (!this.realtime.canSend) {
      return;
    }

    this.songs.previousEntry();
  }

  next(): void {
    if (!this.realtime.canSend) {
      return;
    }

    this.songs.nextEntry();
  }

  selectSong(song: SetlistSong): void {
    if (!this.realtime.canSend) {
      return;
    }

    this.songs.selectEntry(song.entryId);
  }

  setUpNext(entryId: string | null): void {
    if (!this.realtime.canSend) {
      return;
    }

    this.songs.setNext(entryId);
  }

  adhoc(): void {
    if (!this.realtime.canSend) {
      return;
    }

    // Clears song, section and up-next information.
    // The persistent current key is retained.
    this.songs.setBroadcastSetlist(null);
  }

  // --------------------------------------------------
  // Temporary musical cues
  // --------------------------------------------------

  cue(text: string): void {
    if (!this.realtime.canSend) {
      return;
    }

    const isTempoCue =
      text === 'FASTER' ||
      text === 'SLOWER';

    this.messages.sendMessage({
      type: isTempoCue
        ? MessageType.TEMPO_CHANGE
        : MessageType.MUSICAL_INSTRUCTION,

      content: isTempoCue
        ? { direction: text.toLowerCase() }
        : { instruction: text },

      sender: RecipientRole.SONG_LEADER,
      recipients: [RecipientRole.MUSICIAN]
    });

    this.activeCue = text;

    if (this.cueTimer) {
      clearTimeout(this.cueTimer);
    }

    // This timer controls button feedback only.
    // The receiving screen controls the four-second cue display.
    this.cueTimer = setTimeout(() => {
      this.activeCue = '';
    }, 900);
  }

  // --------------------------------------------------
  // Custom messages
  // --------------------------------------------------

  sendCustom(): void {
    const text = this.customText.trim();

    if (
      !this.realtime.canSend ||
      !text ||
      !this.customRecipients.length
    ) {
      return;
    }

    // "Everyone" already includes all individual roles.
    const recipients = this.customRecipients.includes(
      RecipientRole.ALL
    )
      ? [RecipientRole.ALL]
      : [...new Set(this.customRecipients)];

    this.messages.sendMessage({
      type: MessageType.CUSTOM_MESSAGE,
      content: { text },
      sender: RecipientRole.SONG_LEADER,
      recipients
    });

    this.customText = '';
  }

  // --------------------------------------------------
  // Incoming communication
  // --------------------------------------------------

  private watchIncomingMessages(): void {
    this.subscriptions.add(
      this.messages
        .getMessagesForRole(RecipientRole.SONG_LEADER)
        .subscribe(message => {
          // Do not display our own outgoing cues as incoming alerts.
          if (message.sender === RecipientRole.SONG_LEADER) {
            return;
          }

          if (this.incomingTimer) {
            clearTimeout(this.incomingTimer);
          }

          this.incoming = message;

          this.recent = [
            message,
            ...this.recent
          ].slice(0, 5);

          const expiresAt =
            message.expiresAt ?? Date.now() + 4000;

          const remainingDuration = Math.max(
            0,
            Math.min(4000, expiresAt - Date.now())
          );

          this.incomingTimer = setTimeout(() => {
            this.incoming = null;
          }, remainingDuration);
        })
    );
  }

  messageText(message: Message): string {
    const content = message.content;

    if (content.key) {
      return content.key === '?'
        ? 'WHAT KEY?'
        : `KEY: ${content.key}`;
    }

    if (content.direction) {
      return String(content.direction).toUpperCase();
    }

    return (
      content.text ||
      content.instruction ||
      content.request ||
      ''
    );
  }

  // --------------------------------------------------
  // Closing the service
  // --------------------------------------------------

  endService(): void {
    if (
      !this.realtime.canSend ||
      this.songs.endingAt$.value !== null
    ) {
      return;
    }

    const seconds = Number(this.endSeconds);

    if (
      !Number.isFinite(seconds) ||
      seconds < 1 ||
      seconds > 600
    ) {
      return;
    }

    this.cue(
      'Play groove at your discretion until done'
    );

    this.songs.startEnding(seconds);
  }

  cancelEnding(): void {
    if (!this.realtime.canSend) {
      return;
    }

    this.songs.cancelEnding();
  }

  private updateCountdown(): void {
    const endingAt = this.songs.endingAt$.value;

    this.remaining = endingAt === null
      ? null
      : Math.max(
        0,
        Math.ceil((endingAt - Date.now()) / 1000)
      );
  }

  toggleRecipient(role: RecipientRole): void {
    if (!this.realtime.canSend) {
      return;
    }

    if (role === RecipientRole.ALL) {
      this.customRecipients = this.customRecipients.includes(
        RecipientRole.ALL
      )
        ? []
        : [RecipientRole.ALL];

      return;
    }

    // Selecting an individual role clears "Everyone".
    const selected = this.customRecipients.filter(
      recipient => recipient !== RecipientRole.ALL
    );

    this.customRecipients = selected.includes(role)
      ? selected.filter(recipient => recipient !== role)
      : [...selected, role];
  }
}
