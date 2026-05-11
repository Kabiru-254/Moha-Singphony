import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { MessageService, MessageType, RecipientRole, Message, CurrentSongState } from '../../services/message.service';
import { NotificationService } from '../../services/notification.service';
import { NotificationComponent } from '../../shared/notification/notification.component';

@Component({
  selector: 'app-sound-team',
  imports: [
    FormsModule,
    CommonModule,
    NotificationComponent
  ],
  templateUrl: './sound-team.component.html',
  standalone: true,
  styleUrl: './sound-team.component.css'
})
export class SoundTeamComponent implements OnInit, OnDestroy {
  // Make RecipientRole enum available in the template
  RecipientRole = RecipientRole;
  MessageType = MessageType;

  // Messages
  messages: Message[] = [];
  currentSongState: CurrentSongState | null = null;

  // Quick replies (focused on acknowledging and requesting confirmation)
  quickReplies: string[] = [
    'On it — checking',
    'Adjusted vocals — please confirm',
    'Adjusted instruments — please confirm',
    'Reduced feedback — please confirm',
    'Raised lead mic — please confirm',
    'Is it OK now?'
  ];

  // Custom message
  customMessage: string = '';
  selectedRecipients: RecipientRole[] = [];

  // UI state
  theme: string = 'light';
  soundReady: boolean = false;

  // Subscriptions
  private subscriptions: Subscription = new Subscription();

  constructor(
    private messageService: MessageService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Subscribe to messages
    this.subscriptions.add(
      this.messageService.getMessagesForRole(RecipientRole.SOUND_TEAM).subscribe(message => {
        this.messages.unshift(message); // Add to beginning of array
        if (this.messages.length > 20) {
          this.messages.pop(); // Remove oldest message if more than 20
        }
        this.notificationService.createNotificationFromMessage(message);
      })
    );

    // Subscribe to current song updates
    this.subscriptions.add(
      this.messageService.currentSong$.subscribe(songState => {
        this.currentSongState = songState;
      })
    );

    // Initialize theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.theme = savedTheme;
      document.documentElement.classList.toggle('dark', this.theme === 'dark');
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', this.theme === 'dark');
    localStorage.setItem('theme', this.theme);
  }

  sendQuickReply(reply: string) {
    this.messageService.sendMessage({
      type: MessageType.ACKNOWLEDGMENT,
      content: { text: reply },
      sender: RecipientRole.SOUND_TEAM,
      recipients: [RecipientRole.SONG_LEADER, RecipientRole.MUSICIAN]
    });
    this.notificationService.showNotification(`Sent: ${reply}`, 'resolved');
  }

  toggleSoundReady() {
    this.soundReady = !this.soundReady;
    this.messageService.sendMessage({
      type: MessageType.ACKNOWLEDGMENT,
      content: { text: this.soundReady ? 'Sound Ready ✅' : 'Sound Not Ready ❌' },
      sender: RecipientRole.SOUND_TEAM,
      recipients: [RecipientRole.SONG_LEADER, RecipientRole.MUSICIAN]
    });
    this.notificationService.showNotification(
      this.soundReady ? 'Sound Ready status sent' : 'Sound Not Ready status sent',
      this.soundReady ? 'resolved' : 'info'
    );
  }

  sendCustomMessage() {
    if (this.customMessage.trim() && this.selectedRecipients.length > 0) {
      this.messageService.sendMessage({
        type: MessageType.CUSTOM_MESSAGE,
        content: { text: this.customMessage, isUrgent: false },
        sender: RecipientRole.SOUND_TEAM,
        recipients: this.selectedRecipients
      });

      this.notificationService.showNotification('Message sent', 'resolved');
      this.customMessage = '';
    }
  }

  toggleRecipient(role: RecipientRole) {
    const index = this.selectedRecipients.indexOf(role);
    if (index === -1) {
      this.selectedRecipients.push(role);
    } else {
      this.selectedRecipients.splice(index, 1);
    }
  }

  isRecipientSelected(role: RecipientRole): boolean {
    return this.selectedRecipients.includes(role);
  }
}
