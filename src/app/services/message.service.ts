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

  // Observable streams
  public messages$ = this.messagesSubject.asObservable();
  public currentSong$ = this.currentSongSubject.asObservable();

  // Message history
  private messageHistory: Message[] = [];

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
    this.messageHistory.push(completeMessage);
    this.messagesSubject.next(completeMessage);
  }

  // Update current song
  updateCurrentSong(songState: Partial<CurrentSongState>): void {
    const currentState = this.currentSongSubject.getValue();
    this.currentSongSubject.next({
      ...currentState,
      ...songState
    });

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
        if (message.recipients.includes(role) || message.recipients.includes(RecipientRole.ALL)) {
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
