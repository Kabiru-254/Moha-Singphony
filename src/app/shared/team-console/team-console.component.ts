import { CommonModule } from '@angular/common';

import {
  Component,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';

import {
  CurrentSongState,
  Message,
  MessageService,
  MessageType,
  RecipientRole
} from '../../services/message.service';

import {
  MUSICAL_KEYS,
  SetlistSong,
  SongService
} from '../../services/song.service';

import {
  RealtimeSyncService
} from '../../services/realtime-sync.service';

export interface TeamCue {
  label: string;
  group: string;
  type: MessageType;
  recipients: RecipientRole[];
}

interface CueGroup {
  name: string;
  cues: TeamCue[];
}

@Component({
  selector: 'app-team-console',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './team-console.component.html',
  styleUrl: './team-console.component.css'
})
export class TeamConsoleComponent implements OnInit, OnDestroy {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() icon = 'music_note';
  @Input() showServiceContext = true;
  @Input() copySongLeader = true;

  @Input() role: RecipientRole = RecipientRole.SOUND_TEAM;
  @Input() canSetKey = false;
  @Input() cues: TeamCue[] = [];
  @Input() replyOptions: string[] = [];
  @Input() allowedRecipients: RecipientRole[] | null = null;

  readonly keys = [...MUSICAL_KEYS];

  readonly roleOptions: {
    value: RecipientRole;
    label: string;
  }[] = [
    {
      value: RecipientRole.SONG_LEADER,
      label: 'Song leader',
    },
    {
      value: RecipientRole.MUSICIAN,
      label: 'Musicians',
    },
    {
      value: RecipientRole.PIANIST,
      label: 'Pianist',
    },
    {
      value: RecipientRole.SOUND_TEAM,
      label: 'Sound team',
    },
    {
      value: RecipientRole.DEACON,
      label: 'Deacon',
    },
    {
      value: RecipientRole.INTERPRETER,
      label: 'Interpreter',
    },
    {
      value: RecipientRole.PROJECTION_TEAM,
      label: 'Projection team',
    },
    {
      value: RecipientRole.ALL,
      label: 'Everyone',
    },
  ];

  groups: CueGroup[] = [];

  state: CurrentSongState | null = null;
  nextSong: SetlistSong | null = null;

  incoming: Message | null = null;
  recent: Message[] = [];
  selectedRequest: Message | null = null;

  keyRequested = false;

  customText = '';
  customRecipients: RecipientRole[] = [
    RecipientRole.SONG_LEADER
  ];

  feedback = '';

  private readonly subscriptions = new Subscription();

  private incomingTimer?: ReturnType<typeof setTimeout>;
  private feedbackTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private messages: MessageService,
    public songs: SongService,
    public realtime: RealtimeSyncService
  ) {}

  ngOnInit(): void {
    this.groups = [...new Set(
      this.cues.map(cue => cue.group)
    )].map(name => ({
      name,
      cues: this.cues.filter(cue => cue.group === name)
    }));

    this.subscriptions.add(
      combineLatest([
        this.messages.currentSong$,
        this.songs.broadcastSetlist$
      ]).subscribe(([state]) => {
        this.state = state;
        this.nextSong = this.songs.getNextSong();

        if (state.currentKey !== '?') {
          this.keyRequested = false;
        }
      })
    );

    this.subscriptions.add(
      this.messages
        .getMessagesForRole(this.role)
        .subscribe(message => {
          if (message.sender === this.role) {
            return;
          }

          this.receiveMessage(message);
        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();

    if (this.incomingTimer) {
      clearTimeout(this.incomingTimer);
    }

    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }
  }

  get availableRecipients() {
    return this.roleOptions.filter((option) => {
      if (option.value === this.role) {
        return false;
      }

      return (
        this.allowedRecipients === null ||
        this.allowedRecipients.includes(option.value)
      );
    });
  }

  selectKey(key: string): void {
    if (!this.canSetKey || !this.realtime.canSend) {
      return;
    }

    this.songs.setDirectKey(key, this.role);
    this.keyRequested = false;

    this.showFeedback(`Key set to ${key}`);
  }

  sendCue(cue: TeamCue): void {
    if (!this.realtime.canSend) {
      return;
    }

    const recipients = this.withSongLeader(cue.recipients);

    if (!recipients.length) {
      this.showFeedback('This recipient is not available.');
      return;
    }

    this.messages.sendMessage({
      type: cue.type,
      content:
        cue.type === MessageType.SOUND_REQUEST
          ? { request: cue.label }
          : { text: cue.label },
      sender: this.role,
      recipients,
    });

    this.showFeedback(cue.label);
  }

  selectRequest(message: Message): void {
    this.selectedRequest = message;
  }

  reply(text: string): void {
    const request = this.selectedRequest;

    if (!request || !this.realtime.canSend) {
      return;
    }

    const recipients = this.withSongLeader([request.sender]);

    if (!recipients.length) {
      this.showFeedback(
        'Your role cannot reply to this sender.'
      );
      return;
    }

    this.messages.sendMessage({
      type: MessageType.GENERAL_COMMUNICATION,
      content: {
        text,
        replyTo: request.id,
        requestText: this.messageText(request),
      },
      sender: this.role,
      recipients,
    });

    this.showFeedback(
      `${text} — to ${this.roleLabel(request.sender)}`
    );
  }

  toggleRecipient(role: RecipientRole): void {
    if (role === RecipientRole.ALL) {
      this.customRecipients = this.customRecipients.includes(
        RecipientRole.ALL
      )
        ? []
        : [RecipientRole.ALL];

      return;
    }

    const selected = this.customRecipients.filter(
      recipient => recipient !== RecipientRole.ALL
    );

    this.customRecipients = selected.includes(role)
      ? selected.filter(recipient => recipient !== role)
      : [...selected, role];
  }

  sendCustom(): void {
    const text = this.customText.trim();

    if (!text || !this.realtime.canSend) {
      return;
    }

    const recipients = this.withSongLeader(
      this.customRecipients
    );

    if (!recipients.length) {
      this.showFeedback('Select a recipient.');
      return;
    }

    this.messages.sendMessage({
      type: MessageType.CUSTOM_MESSAGE,
      content: { text },
      sender: this.role,
      recipients,
    });

    this.customText = '';
    this.showFeedback('Message sent');
  }

  messageText(message: Message): string {
    const content = message.content;

    if (content.key) {
      return content.key === '?'
        ? 'What key are we in?'
        : `Key: ${content.key}`;
    }

    if (content.direction) {
      return String(content.direction).toUpperCase();
    }

    return (
      content.request ||
      content.text ||
      content.instruction ||
      ''
    );
  }

  roleLabel(role: RecipientRole): string {
    return this.roleOptions.find(
      option => option.value === role
    )?.label ?? role.split('_').join(' ');
  }

  private receiveMessage(message: Message): void {
    if (this.incomingTimer) {
      clearTimeout(this.incomingTimer);
    }

    this.incoming = message;

    this.recent = [
      message,
      ...this.recent
    ].slice(0, 10);

    // Automatically focus the first incoming request.
    // Later requests do not replace a reply the operator is working on.
    if (!this.selectedRequest) {
      this.selectedRequest = message;
    }

    if (
      this.canSetKey &&
      message.sender === RecipientRole.SONG_LEADER &&
      message.type === MessageType.KEY_CHANGE &&
      message.content.key === '?'
    ) {
      this.keyRequested = true;
    }

    const now = Date.now();

    const duration = Math.max(
      0,
      Math.min(
        4000,
        (message.expiresAt ?? now + 4000) - now
      )
    );

    this.incomingTimer = setTimeout(() => {
      this.incoming = null;
    }, duration);
  }

  private withSongLeader(
    recipients: RecipientRole[]
  ): RecipientRole[] {
    const targets = new Set<RecipientRole>(recipients);

    if (
      this.copySongLeader &&
      this.role !== RecipientRole.SONG_LEADER
    ) {
      targets.add(RecipientRole.SONG_LEADER);
    }

    // Restricted consoles can only send to explicitly allowed roles.
    if (this.allowedRecipients !== null) {
      return [...targets].filter(
        (recipient) =>
          recipient !== RecipientRole.ALL &&
          recipient !== this.role &&
          this.allowedRecipients!.includes(recipient)
      );
    }

    if (targets.has(RecipientRole.ALL)) {
      return [RecipientRole.ALL];
    }

    return [...targets];
  }


  private showFeedback(text: string): void {
    this.feedback = text;

    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }

    this.feedbackTimer = setTimeout(() => {
      this.feedback = '';
    }, 2500);
  }
}
