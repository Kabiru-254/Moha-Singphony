import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Channel {
  name: string;
  icon: string;
  signal: 'good' | 'weak' | 'lost';
  volume: 'good' | 'low' | 'high' | 'muted';
  connection: 'connected' | 'intermittent' | 'disconnected';
}

@Component({
  selector: 'app-channel-status-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './channel-status-widget.component.html',
  styleUrl: './channel-status-widget.component.css'
})
export class ChannelStatusWidgetComponent {
  channels = input<Channel[]>([]);

  statusColor(status: Channel['signal'] | Channel['volume'] | Channel['connection']): string {
    switch (status) {
      case 'good':
      case 'connected':
        return '#22c55e';
      case 'weak':
      case 'low':
      case 'intermittent':
        return '#f59e0b';
      case 'lost':
      case 'high':
      case 'disconnected':
      case 'muted':
        return '#ef4444';
      default:
        return '#94a3b8';
    }
  }
}
