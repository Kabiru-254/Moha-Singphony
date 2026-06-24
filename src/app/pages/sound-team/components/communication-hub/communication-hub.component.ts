import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecipientRole } from '../../../../services/message.service';

export type MessagePriority = 'normal' | 'important' | 'urgent';

export interface MessageDraft {
  text: string;
  recipients: RecipientRole[];
  priority: MessagePriority;
}

@Component({
  selector: 'app-communication-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './communication-hub.component.html',
  styleUrl: './communication-hub.component.css'
})
export class CommunicationHubComponent {
  maxLength = input<number>(280);
  templates = input<{ label: string; text: string }[]>([
    { label: 'Please confirm', text: 'Please confirm the adjustment is good.' },
    { label: 'Stand by', text: 'Stand by for the next cue.' },
    { label: 'Check monitor', text: 'Can you check your monitor level?' }
  ]);

  sendMessage = output<MessageDraft>();

  draft = signal<MessageDraft>({ text: '', recipients: [RecipientRole.ALL], priority: 'normal' });
  expanded = signal(false);
  RecipientRole = RecipientRole;

  recipientOptions = [
    { role: RecipientRole.SONG_LEADER, label: 'Song Leader', icon: 'mic' },
    { role: RecipientRole.MUSICIAN, label: 'Musicians', icon: 'music_note' },
    { role: RecipientRole.ALL, label: 'Everyone', icon: 'people' }
  ];

  priorityOptions: { value: MessagePriority; label: string; color: string }[] = [
    { value: 'normal', label: 'Normal', color: '#94a3b8' },
    { value: 'important', label: 'Important', color: '#f59e0b' },
    { value: 'urgent', label: 'Urgent', color: '#ef4444' }
  ];

  characterCount = () => this.draft().text.length;
  canSend = () => this.draft().text.trim().length > 0 && this.draft().recipients.length > 0;
  isOverLimit = () => this.draft().text.length > this.maxLength();

  toggleRecipient(role: RecipientRole): void {
    const current = this.draft().recipients;
    let next: RecipientRole[];
    if (role === RecipientRole.ALL) {
      next = current.includes(RecipientRole.ALL) ? [] : [RecipientRole.ALL];
    } else {
      next = current.includes(role)
        ? current.filter(r => r !== role)
        : [...current.filter(r => r !== RecipientRole.ALL), role];
      if (next.length === 0) next = [RecipientRole.ALL];
    }
    this.draft.update(d => ({ ...d, recipients: next }));
  }

  setPriority(priority: MessagePriority): void {
    this.draft.update(d => ({ ...d, priority }));
  }

  applyTemplate(text: string): void {
    this.draft.update(d => ({ ...d, text }));
    this.expanded.set(true);
  }

  onTextChange(text: string): void {
    this.draft.update(d => ({ ...d, text }));
  }

  onSend(): void {
    if (!this.canSend()) return;
    this.sendMessage.emit({ ...this.draft() });
    this.draft.update(d => ({ ...d, text: '' }));
    this.expanded.set(false);
  }
}
