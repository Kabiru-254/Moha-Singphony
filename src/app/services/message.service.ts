import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

export enum MessageType {
  KEY_CHANGE = 'KEY_CHANGE',
  TEMPO_CHANGE = 'TEMPO_CHANGE',
  MUSICAL_INSTRUCTION = 'MUSICAL_INSTRUCTION',
  SOUND_REQUEST = 'SOUND_REQUEST',
  GENERAL_COMMUNICATION = 'GENERAL_COMMUNICATION',
  SERVICE_COORDINATION = 'SERVICE_COORDINATION',
  CUSTOM_MESSAGE = 'CUSTOM_MESSAGE',
  ACKNOWLEDGMENT = 'ACKNOWLEDGMENT'
}

export enum RecipientRole {
  SONG_LEADER = 'SONG_LEADER',
  MUSICIAN = 'MUSICIAN',
  PIANIST = 'PIANIST',
  SOUND_TEAM = 'SOUND_TEAM',
  DEACON = 'DEACON',
  ALL = 'ALL'
}

export interface Message {
  id: string;
  type: MessageType;
  content: any;
  sender: RecipientRole;
  recipients: RecipientRole[];
  timestamp: Date;
  acknowledged?: boolean;

  // Identifies the device that originally sent the message.
  originId?: string;

  // Epoch milliseconds after which the cue must not be displayed.
  expiresAt?: number;
}

export interface Song {
  id: number;
  title: string;
  keys: string[];

  // Retained for compatibility with existing components.
  tempo: number;

  structure: string[];
  notes?: string;
}

export interface CurrentSongState {
  song: Song | null;
  currentKey: string;

  // Retained for compatibility; not used for faster/slower cues.
  tempo: number;

  currentSection?: string;
  isPlaying: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private readonly cueDurationMs = 4000;
  private readonly historyLimit = 200;

  // All messages received by this device, including its own messages.
  private readonly messagesSubject = new Subject<Message>();

  // Only messages created on this device. Firebase subscribes to this.
  private readonly messagesLocalSubject = new Subject<Message>();

  private readonly currentSongSubject =
    new BehaviorSubject<CurrentSongState>({
      song: null,
      currentKey: '?',
      tempo: 0,
      isPlaying: false
    });

  // Only state changes initiated on this device.
  private readonly currentSongLocalSubject =
    new Subject<CurrentSongState>();

  readonly messages$ = this.messagesSubject.asObservable();
  readonly messagesLocal$ = this.messagesLocalSubject.asObservable();

  readonly currentSong$ = this.currentSongSubject.asObservable();

  readonly currentSongLocal$ =
    this.currentSongLocalSubject.asObservable();

  private messageHistory: Message[] = [];

  getCurrentSongState(): CurrentSongState {
    return this.currentSongSubject.getValue();
  }

  sendMessage(message: Omit<Message, 'id' | 'timestamp'>): void {
    const now = Date.now();

    const completeMessage: Message = {
      ...message,
      id: this.generateId(),
      timestamp: new Date(now),
      acknowledged: false,
      expiresAt: now + this.cueDurationMs
    };

    this.rememberMessage(completeMessage);

    // Update local recipients.
    this.messagesSubject.next(completeMessage);

    // Publish through Firebase once the transport is updated.
    this.messagesLocalSubject.next(completeMessage);
  }

  receiveExternalMessage(message: Message): void {
    if (
      !message?.id ||
      !Array.isArray(message.recipients) ||
      !message.content
    ) {
      return;
    }

    const alreadyReceived = this.messageHistory.some(
      existing => existing.id === message.id
    );

    if (alreadyReceived) {
      return;
    }

    // Firebase serializes Date objects, so restore the timestamp.
    const timestamp = message.timestamp instanceof Date
      ? message.timestamp
      : new Date(message.timestamp);

    if (!Number.isFinite(timestamp.getTime())) {
      return;
    }

    const receivedMessage: Message = {
      ...message,
      timestamp
    };

    this.rememberMessage(receivedMessage);

    // Never emit received messages to messagesLocal$.
    this.messagesSubject.next(receivedMessage);
  }

  updateCurrentSong(songState: Partial<CurrentSongState>, sender: RecipientRole = RecipientRole.SONG_LEADER): void {
    const currentState = this.currentSongSubject.getValue();

    const nextState: CurrentSongState = {
      ...currentState,
      ...songState
    };

    // Persistent state updates locally first.
    this.currentSongSubject.next(nextState);

    // Tell Firebase that this device initiated the update.
    this.currentSongLocalSubject.next(nextState);

    // Selecting a key again should still produce a visible cue.
    if (songState.currentKey) {
      this.sendMessage({
        type: MessageType.KEY_CHANGE,
        content: {
          key: songState.currentKey
        },
        sender,
        recipients: [RecipientRole.ALL]
      });
    }

    // Avoid creating a second simultaneous cue when a key was also sent.
    if (
      songState.song &&
      songState.song !== currentState.song &&
      !songState.currentKey
    ) {
      this.sendMessage({
        type: MessageType.GENERAL_COMMUNICATION,
        content: {
          text: `Now playing: ${songState.song.title}`
        },
        sender,
        recipients: [RecipientRole.MUSICIAN]
      });
    }
  }

  setCurrentSongStateFromRemote(state: CurrentSongState): void {
    // Restore persistent state without publishing it back to Firebase.
    this.currentSongSubject.next(state);
  }

  getMessagesForRole(role: RecipientRole): Observable<Message> {
    return new Observable<Message>(observer => {
      const subscription = this.messages$.subscribe(message => {
        const recipients = message.recipients;

        if (!Array.isArray(recipients)) {
          return;
        }

        const intendedForRole =
          recipients.includes(role) ||
          recipients.includes(RecipientRole.ALL);

        if (!intendedForRole) {
          return;
        }

        const timestamp = message.timestamp instanceof Date
          ? message.timestamp.getTime()
          : new Date(message.timestamp).getTime();

        const expiresAt =
          message.expiresAt ?? timestamp + this.cueDurationMs;

        // Expired cues may remain in history but must not flash again.
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
          return;
        }

        observer.next(message);
      });

      return () => subscription.unsubscribe();
    });
  }

  acknowledgeMessage(messageId: string, role: RecipientRole): void {
    // Retained for existing screens. Musicians do not acknowledge cues.
    const message = this.messageHistory.find(
      existing => existing.id === messageId
    );

    if (!message) {
      return;
    }

    message.acknowledged = true;
    this.messagesSubject.next({ ...message });
  }

  getMessageHistory(): Message[] {
    return [...this.messageHistory];
  }

  private rememberMessage(message: Message): void {
    this.messageHistory = [
      ...this.messageHistory,
      message
    ].slice(-this.historyLimit);
  }

  private generateId(): string {
    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2)
    );
  }
}
