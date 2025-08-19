import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { MessageService, RecipientRole, MessageType, CurrentSongState } from '../../services/message.service';
import { NotificationService } from '../../services/notification.service';
import { NotificationComponent } from '../../shared/notification/notification.component';

@Component({
  selector: 'app-pianist',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NotificationComponent
  ],
  templateUrl: './pianist.component.html',
  styleUrl: './pianist.component.css'
})
export class PianistComponent implements OnInit, OnDestroy {
  // Make enums available in template
  RecipientRole = RecipientRole;
  MessageType = MessageType;

  // Current song state
  currentSongState: CurrentSongState | null = null;

  // UI state
  theme: string = 'light';
  showKeyGrid: boolean = false;

  // Message history
  messages: { type: string; content: string; timestamp: Date }[] = [];

  // Response options
  customMessage: string = '';
  allKeys: string[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  quickResponses: string[] = [
    'Need more monitor volume',
    'Ready for next song',
    'Need chord chart',
    'Got it'
  ];

  // Subscriptions
  private subscriptions: Subscription = new Subscription();

  constructor(
    private messageService: MessageService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Subscribe to current song updates
    this.subscriptions.add(
      this.messageService.currentSong$.subscribe(songState => {
        this.currentSongState = songState;
      })
    );

    // Subscribe to messages
    this.subscriptions.add(
      this.messageService.getMessagesForRole(RecipientRole.PIANIST).subscribe(message => {
        // Handle incoming messages for pianist
        this.notificationService.createNotificationFromMessage(message);

        // Add to message history
        this.messages.unshift({
          type: message.type,
          content: this.getMessageContent(message),
          timestamp: message.timestamp
        });

        // If song leader asks for key, show key grid
        if (message.type === MessageType.CUSTOM_MESSAGE &&
            message.content.text &&
            message.content.text.toLowerCase().includes('what key')) {
          this.showKeyGrid = true;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', this.theme === 'dark');
  }

  // Send a quick response
  sendQuickResponse(response: string) {
    this.messageService.sendMessage({
      type: MessageType.CUSTOM_MESSAGE,
      content: { text: response, isUrgent: false },
      sender: RecipientRole.PIANIST,
      recipients: [RecipientRole.SONG_LEADER]
    });
  }

  // Send a custom message
  sendCustomMessage() {
    if (this.customMessage.trim()) {
      this.messageService.sendMessage({
        type: MessageType.CUSTOM_MESSAGE,
        content: { text: this.customMessage, isUrgent: false },
        sender: RecipientRole.PIANIST,
        recipients: [RecipientRole.SONG_LEADER]
      });

      this.customMessage = '';
    }
  }

  // Send key selection
  selectKey(key: string) {
    this.messageService.sendMessage({
      type: MessageType.KEY_CHANGE,
      content: { key },
      sender: RecipientRole.PIANIST,
      recipients: [RecipientRole.SONG_LEADER]
    });

    this.showKeyGrid = false;
  }

  // Toggle key grid
  toggleKeyGrid() {
    this.showKeyGrid = !this.showKeyGrid;
  }

  // Helper method to extract message content
  private getMessageContent(message: any): string {
    if (message.content.instruction) {
      return message.content.instruction;
    } else if (message.content.key) {
      return `Key changed to ${message.content.key}`;
    } else if (message.content.tempo) {
      return `Tempo changed to ${message.content.tempo}`;
    } else if (message.content.text) {
      return message.content.text;
    }
    return JSON.stringify(message.content);
  }
}
