import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { MessageService, MessageType, RecipientRole, Message, CurrentSongState } from '../../services/message.service';
import { NotificationService } from '../../services/notification.service';
import { NotificationComponent } from '../../shared/notification/notification.component';

import { SoundTeamHeaderComponent } from './components/sound-team-header/sound-team-header.component';
import { SoundStatusHeroComponent, SoundStatus } from './components/sound-status-hero/sound-status-hero.component';
import { SoundControlPanelComponent } from './components/sound-control-panel/sound-control-panel.component';
import { QuickResponseCenterComponent, QuickResponse } from './components/quick-response-center/quick-response-center.component';
import { CommunicationHubComponent, MessageDraft } from './components/communication-hub/communication-hub.component';
import { LiveFeedComponent } from './components/live-feed/live-feed.component';
import { ChannelStatusWidgetComponent, Channel } from './components/channel-status-widget/channel-status-widget.component';
import { SystemHealthWidgetComponent, SystemHealthItem } from './components/system-health-widget/system-health-widget.component';
import { IssueTrackerWidgetComponent, ActiveIssue } from './components/issue-tracker-widget/issue-tracker-widget.component';
import { RecentActionsWidgetComponent, RecentAction } from './components/recent-actions-widget/recent-actions-widget.component';

@Component({
  selector: 'app-sound-team',
  standalone: true,
  imports: [
    CommonModule,
    NotificationComponent,
    SoundTeamHeaderComponent,
    SoundStatusHeroComponent,
    SoundControlPanelComponent,
    QuickResponseCenterComponent,
    CommunicationHubComponent,
    LiveFeedComponent,
    ChannelStatusWidgetComponent,
    SystemHealthWidgetComponent,
    IssueTrackerWidgetComponent,
    RecentActionsWidgetComponent
  ],
  templateUrl: './sound-team.component.html',
  styleUrl: './sound-team.component.css'
})
export class SoundTeamComponent implements OnInit, OnDestroy {
  // Theme
  isDarkMode = signal(false);

  soundStatus = signal<SoundStatus>('ready');
  lastUpdate = signal<Date>(new Date());
  sessionName = signal('Morning Worship');
  connectedDevices = signal(12);
  connectedMusicians = signal(7);

  // Messages
  messages = signal<Message[]>([]);
  currentSongState = signal<CurrentSongState | null>(null);
  unreadCount = signal(0);

  // Issues
  issues = signal<ActiveIssue[]>([
    { id: '1', title: 'Monitor Feedback', severity: 'high', timestamp: new Date(), resolved: false },
    { id: '2', title: 'Low Vocal Volume', severity: 'medium', timestamp: new Date(), resolved: false },
    { id: '3', title: 'Drum Mic Distortion', severity: 'low', timestamp: new Date(), resolved: true }
  ]);

  // Channels
  channels = signal<Channel[]>([
    { name: 'Vocals', icon: 'mic', signal: 'good', volume: 'good', connection: 'connected' },
    { name: 'Drums', icon: 'drums', signal: 'good', volume: 'high', connection: 'connected' },
    { name: 'Bass', icon: 'music_note', signal: 'good', volume: 'good', connection: 'connected' },
    { name: 'Keys', icon: 'piano', signal: 'weak', volume: 'low', connection: 'intermittent' },
    { name: 'Lead Guitar', icon: 'electric_bolt', signal: 'good', volume: 'good', connection: 'connected' },
    { name: 'Acoustic', icon: 'graphic_eq', signal: 'good', volume: 'muted', connection: 'connected' }
  ]);

  // Systems
  systems = signal<SystemHealthItem[]>([
    { name: 'Wireless Mics', icon: 'mic', status: 'healthy' },
    { name: 'Mixing Console', icon: 'tune', status: 'healthy' },
    { name: 'In-Ear Monitors', icon: 'headphones', status: 'warning' },
    { name: 'Stage Monitors', icon: 'speaker', status: 'critical' },
    { name: 'Network', icon: 'wifi', status: 'healthy' }
  ]);

  // Recent actions
  recentActions = signal<RecentAction[]>([
    { id: '1', icon: 'check_circle', label: 'Marked Ready', timestamp: new Date(Date.now() - 1000 * 60 * 5), color: '#22c55e' },
    { id: '2', icon: 'trending_up', label: 'Raised Lead Mic', timestamp: new Date(Date.now() - 1000 * 60 * 4), color: '#3b82f6' },
    { id: '3', icon: 'build', label: 'Reduced Feedback', timestamp: new Date(Date.now() - 1000 * 60 * 2), color: '#f59e0b' }
  ]);

  // Quick responses
  quickResponses = signal<QuickResponse[]>([
    { id: '1', title: 'Checking', description: 'On it now', icon: 'tune', group: 'communication', message: 'On it — checking' },
    { id: '2', title: 'Is It Better?', description: 'Request confirmation', icon: 'help', group: 'communication', message: 'Is it OK now?' },
    { id: '3', title: 'Vocals Adjusted', description: 'Vocal mix updated', icon: 'mic', group: 'volume', message: 'Adjusted vocals — please confirm' },
    { id: '4', title: 'Instruments Adjusted', description: 'Band mix updated', icon: 'music_note', group: 'volume', message: 'Adjusted instruments — please confirm' },
    { id: '5', title: 'Lead Mic Increased', description: 'Lead vocal boosted', icon: 'trending_up', group: 'volume', message: 'Raised lead mic — please confirm' },
    { id: '6', title: 'Feedback Reduced', description: 'Feedback handled', icon: 'build', group: 'troubleshooting', message: 'Reduced feedback — please confirm' }
  ]);

  // Message templates
  messageTemplates = signal([
    { label: 'Please confirm', text: 'Please confirm the adjustment is good.' },
    { label: 'Stand by', text: 'Stand by for the next cue.' },
    { label: 'Check monitor', text: 'Can you check your monitor level?' },
    { label: 'Sound ready', text: 'Sound team is ready.' }
  ]);

  private subscriptions: Subscription = new Subscription();

  constructor(
    private messageService: MessageService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Theme
    const savedTheme = localStorage.getItem('theme');
    const dark = savedTheme === 'dark';
    this.isDarkMode.set(dark);
    document.documentElement.classList.toggle('dark', dark);

    // Subscribe to messages
    this.subscriptions.add(
      this.messageService.getMessagesForRole(RecipientRole.SOUND_TEAM).subscribe(message => {
        this.messages.update(list => [message, ...list].slice(0, 50));
        this.lastUpdate.set(new Date());
        this.notificationService.createNotificationFromMessage(message);
        this.unreadCount.update(c => c + 1);
      })
    );

    // Subscribe to current song updates
    this.subscriptions.add(
      this.messageService.currentSong$.subscribe(songState => {
        this.currentSongState.set(songState);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  toggleTheme(): void {
    const next = !this.isDarkMode();
    this.isDarkMode.set(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  onStateChange(state: SoundStatus): void {
    this.soundStatus.set(state);
    this.lastUpdate.set(new Date());
    this.addAction(stateLabel(state), statusIcon(state), statusColor(state));

    this.messageService.sendMessage({
      type: MessageType.SERVICE_COORDINATION,
      content: { instruction: `Sound team is ${stateLabel(state).toLowerCase()}` },
      sender: RecipientRole.SOUND_TEAM,
      recipients: [RecipientRole.SONG_LEADER, RecipientRole.MUSICIAN]
    });

    this.notificationService.showNotification(`Broadcast: ${stateLabel(state)}`, state === 'issue' ? 'urgent' : 'info');
  }

  onQuickResponse(response: QuickResponse): void {
    this.messageService.sendMessage({
      type: MessageType.ACKNOWLEDGMENT,
      content: { text: response.message },
      sender: RecipientRole.SOUND_TEAM,
      recipients: [RecipientRole.SONG_LEADER, RecipientRole.MUSICIAN]
    });
    this.addAction(response.title, response.icon, '#3b82f6');
    this.notificationService.showNotification(`Sent: ${response.title}`, 'resolved');
  }

  onSendMessage(draft: MessageDraft): void {
    const isUrgent = draft.priority === 'urgent';
    this.messageService.sendMessage({
      type: MessageType.CUSTOM_MESSAGE,
      content: {
        text: draft.text,
        isUrgent,
        priority: draft.priority
      },
      sender: RecipientRole.SOUND_TEAM,
      recipients: draft.recipients
    });
    this.addAction('Message sent', 'send', isUrgent ? '#ef4444' : '#8b5cf6');
    this.notificationService.showNotification('Message sent', isUrgent ? 'urgent' : 'resolved');
  }

  onResolveIssue(issueId: string): void {
    this.issues.update(list => list.map(i => i.id === issueId ? { ...i, resolved: true } : i));
    this.addAction('Issue resolved', 'check_circle', '#22c55e');
    this.notificationService.showNotification('Issue marked resolved', 'resolved');
  }

  private addAction(label: string, icon: string, color: string): void {
    this.recentActions.update(list => [{ id: generateId(), icon, label, timestamp: new Date(), color }, ...list].slice(0, 10));
  }
}

function stateLabel(state: SoundStatus): string {
  switch (state) {
    case 'ready': return 'Ready';
    case 'checking': return 'Checking';
    case 'adjusting': return 'Adjusting';
    case 'monitoring': return 'Monitoring';
    case 'issue': return 'Issue Detected';
    default: return state;
  }
}

function statusIcon(state: SoundStatus): string {
  switch (state) {
    case 'ready': return 'check_circle';
    case 'checking': return 'tune';
    case 'adjusting': return 'settings';
    case 'monitoring': return 'hearing';
    case 'issue': return 'error';
    default: return 'info';
  }
}

function statusColor(state: SoundStatus): string {
  switch (state) {
    case 'ready': return '#22c55e';
    case 'checking': return '#f59e0b';
    case 'adjusting': return '#3b82f6';
    case 'monitoring': return '#06b6d4';
    case 'issue': return '#ef4444';
    default: return '#94a3b8';
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
