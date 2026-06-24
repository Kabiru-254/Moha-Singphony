import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message, MessageType, RecipientRole } from '../../../../services/message.service';

@Component({
  selector: 'app-live-feed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './live-feed.component.html',
  styleUrl: './live-feed.component.css'
})
export class LiveFeedComponent {
  messages = input.required<Message[]>();
  autoScroll = input<boolean>(false);

  MessageType = MessageType;
  RecipientRole = RecipientRole;

  senderName(sender: RecipientRole): string {
    switch (sender) {
      case RecipientRole.SONG_LEADER: return 'Song Leader';
      case RecipientRole.MUSICIAN: return 'Musician';
      case RecipientRole.SOUND_TEAM: return 'Sound Team';
      case RecipientRole.PIANIST: return 'Pianist';
      case RecipientRole.DEACON: return 'Deacon';
      default: return 'System';
    }
  }

  messageText(message: Message): string {
    const c = message.content;
    switch (message.type) {
      case MessageType.KEY_CHANGE: return `Key changed to ${c.key}`;
      case MessageType.TEMPO_CHANGE: return `Tempo ${c.direction} to ${c.tempo} BPM`;
      case MessageType.MUSICAL_INSTRUCTION: return c.instruction;
      case MessageType.SOUND_REQUEST: return c.request;
      case MessageType.CUSTOM_MESSAGE: return c.text;
      case MessageType.ACKNOWLEDGMENT: return c.text;
      case MessageType.GENERAL_COMMUNICATION: return c.text;
      case MessageType.SERVICE_COORDINATION: return c.instruction;
      default: return 'Unknown message';
    }
  }

  typeColor(type: MessageType): string {
    switch (type) {
      case MessageType.KEY_CHANGE: return '#3b82f6';
      case MessageType.TEMPO_CHANGE: return '#22c55e';
      case MessageType.MUSICAL_INSTRUCTION: return '#f59e0b';
      case MessageType.SOUND_REQUEST: return '#ef4444';
      case MessageType.CUSTOM_MESSAGE: return '#8b5cf6';
      case MessageType.ACKNOWLEDGMENT: return '#22c55e';
      case MessageType.SERVICE_COORDINATION: return '#ef4444';
      default: return '#94a3b8';
    }
  }
}
