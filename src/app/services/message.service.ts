import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

// Message types
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

// Recipient roles
export enum RecipientRole {
  SONG_LEADER = 'SONG_LEADER',
  MUSICIAN = 'MUSICIAN',
  PIANIST = 'PIANIST',
  SOUND_TEAM = 'SOUND_TEAM',
  DEACON = 'DEACON',
  ALL = 'ALL'
}

// Message interface
export interface Message {
  id: string;
  type: MessageType;
  content: any;
  sender: RecipientRole;
  recipients: RecipientRole[];
  timestamp: Date;
  acknowledged?: boolean;
  // Optional origin identifier for sync services to prevent echo loops
  originId?: string;
}

// Song interface
export interface Song {
  id: number;
  title: string;
  keys: string[];
  tempo: number;
  structure: string[];
  notes?: string;
}

// Current song state
export interface CurrentSongState {
  song: Song | null;
  currentKey: string;
  tempo: number;
  currentSection?: string;
  isPlaying: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  // Message subjects
  private messagesSubject = new Subject<Message>();
  private currentSongSubject = new BehaviorSubject<CurrentSongState>({
    song: null,
    currentKey: 'C',
    tempo: 100, // Default tempo value (100 = medium)
    isPlaying: false
  });
  // Emits only for local (this-client) initiated song state changes.
  private currentSongLocalSubject = new Subject<CurrentSongState>();

  // Observable streams
  public messages$ = this.messagesSubject.asObservable();
  public currentSong$ = this.currentSongSubject.asObservable();
  public currentSongLocal$ = this.currentSongLocalSubject.asObservable();

  // Message history
  private messageHistory: Message[] = [];
  // Session start time to suppress historical notifications on first load
  private sessionStart: Date = new Date();

  constructor() { }

  // Send a message
  sendMessage(message: Omit<Message, 'id' | 'timestamp'>): void {
    const completeMessage: Message = {
      ...message,
      id: this.generateId(),
      timestamp: new Date(),
      acknowledged: false
    };

    this.messageHistory.push(completeMessage);
    this.messagesSubject.next(completeMessage);
  }

  // Accept a message coming from an external transport (e.g., realtime sync)
  receiveExternalMessage(completeMessage: Message): void {
    // Basic de-duplication: if id exists in history, ignore
    if (this.messageHistory.find(m => m.id === completeMessage.id)) {
      return;
    }

    // Sanitize incoming message to avoid runtime errors from malformed payloads
    const safeRecipients = Array.isArray((completeMessage as any).recipients)
      ? (completeMessage as any).recipients
      : [RecipientRole.ALL];
    const safeTimestamp = (completeMessage as any).timestamp instanceof Date
      ? (completeMessage as any).timestamp
      : new Date((completeMessage as any).timestamp || Date.now());

    const sanitized: Message = {
      ...completeMessage,
      recipients: safeRecipients,
      timestamp: safeTimestamp
    } as Message;

    this.messageHistory.push(sanitized);
    this.messagesSubject.next(sanitized);
  }

  // Update current song (local user action)
  updateCurrentSong(songState: Partial<CurrentSongState>): void {
    const currentState = this.currentSongSubject.getValue();
    const nextState: CurrentSongState = {
      ...currentState,
      ...songState
    } as CurrentSongState;

    // Update global observable for local UI
    this.currentSongSubject.next(nextState);
    // Emit on local-only stream so transports can publish to network
    this.currentSongLocalSubject.next(nextState);

    // If key or tempo changed, send a message
    if (songState.currentKey && songState.currentKey !== currentState.currentKey) {
      this.sendMessage({
        type: MessageType.KEY_CHANGE,
        content: { key: songState.currentKey },
        sender: RecipientRole.SONG_LEADER,
        recipients: [RecipientRole.ALL]
      });
    }

    if (songState.tempo && songState.tempo !== currentState.tempo) {
      const direction = songState.tempo > currentState.tempo ? 'increase' : 'decrease';
      this.sendMessage({
        type: MessageType.TEMPO_CHANGE,
        content: { tempo: songState.tempo, direction },
        sender: RecipientRole.SONG_LEADER,
        recipients: [RecipientRole.ALL]
      });
    }
  }

  // Acknowledge a message
  acknowledgeMessage(messageId: string, role: RecipientRole): void {
    const message = this.messageHistory.find(m => m.id === messageId);
    if (message) {
      message.acknowledged = true;
      this.messagesSubject.next({ ...message });
    }
  }

  // Get messages for a specific role
  getMessagesForRole(role: RecipientRole): Observable<Message> {
    return new Observable<Message>(observer => {
      const subscription = this.messages$.subscribe(message => {
        const recipientsArr: RecipientRole[] = Array.isArray((message as any).recipients)
          ? (message as any).recipients
          : [RecipientRole.ALL];

        // Only emit notifications for messages created at/after this session started
        const ts = (message as any).timestamp instanceof Date
          ? ((message as any).timestamp as Date)
          : new Date((message as any).timestamp);
        const isRecent = ts && ts.getTime() >= this.sessionStart.getTime();

        if (isRecent && (recipientsArr.includes(role) || recipientsArr.includes(RecipientRole.ALL))) {
          observer.next(message);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    });
  }

  // Get message history
  getMessageHistory(): Message[] {
    return [...this.messageHistory];
  }

  // Set current song state from an external source without generating new messages
  setCurrentSongStateFromRemote(state: CurrentSongState): void {
    this.currentSongSubject.next(state);
  }

  // Generate a unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
