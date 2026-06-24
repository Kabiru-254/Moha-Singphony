import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message, MessageType } from '../../../../services/message.service';

@Component({
  selector: 'app-broadcast-feed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './broadcast-feed.component.html',
  styleUrl: './broadcast-feed.component.css'
})
export class BroadcastFeedComponent {
  messages = input<Message[]>([]);

  trackByMessage(index: number, message: Message): string {
    return message.id;
  }

  getIcon(type: MessageType): string {
    switch (type) {
      case MessageType.KEY_CHANGE: return 'music_note';
      case MessageType.TEMPO_CHANGE: return 'speed';
      case MessageType.MUSICAL_INSTRUCTION: return 'campaign';
      case MessageType.SOUND_REQUEST: return 'headphones';
      case MessageType.SERVICE_COORDINATION: return 'warning';
      case MessageType.CUSTOM_MESSAGE: return 'chat';
      case MessageType.GENERAL_COMMUNICATION: return 'cast';
      default: return 'info';
    }
  }

  getColor(type: MessageType): string {
    switch (type) {
      case MessageType.KEY_CHANGE: return 'text-ms-primary';
      case MessageType.TEMPO_CHANGE: return 'text-ms-success';
      case MessageType.MUSICAL_INSTRUCTION: return 'text-ms-secondary';
      case MessageType.SOUND_REQUEST: return 'text-ms-warning';
      case MessageType.SERVICE_COORDINATION: return 'text-ms-danger';
      case MessageType.CUSTOM_MESSAGE: return 'text-ms-info';
      case MessageType.GENERAL_COMMUNICATION: return 'text-ms-primary';
      default: return 'text-[var(--ms-text-muted)]';
    }
  }

  getLabel(message: Message): string {
    switch (message.type) {
      case MessageType.KEY_CHANGE: return `Key changed to ${message.content?.key || 'C'}`;
      case MessageType.TEMPO_CHANGE: return `Tempo ${message.content?.direction === 'increase' ? 'increased' : 'decreased'} to ${message.content?.tempo || 0}`;
      case MessageType.MUSICAL_INSTRUCTION: return message.content?.instruction || 'Instruction';
      case MessageType.SOUND_REQUEST: return message.content?.request || 'Sound request';
      case MessageType.SERVICE_COORDINATION: return message.content?.instruction || 'Coordination';
      case MessageType.CUSTOM_MESSAGE: return message.content?.text || 'Message';
      case MessageType.GENERAL_COMMUNICATION: return message.content?.text || 'Announcement';
      default: return 'Broadcast';
    }
  }
}
