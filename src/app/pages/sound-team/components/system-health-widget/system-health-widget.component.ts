import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SystemHealthItem {
  name: string;
  icon: string;
  status: 'healthy' | 'warning' | 'critical';
}

@Component({
  selector: 'app-system-health-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './system-health-widget.component.html',
  styleUrl: './system-health-widget.component.css'
})
export class SystemHealthWidgetComponent {
  systems = input<SystemHealthItem[]>([]);

  statusColor(status: SystemHealthItem['status']): string {
    switch (status) {
      case 'healthy': return '#22c55e';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#94a3b8';
    }
  }

  statusBg(status: SystemHealthItem['status']): string {
    switch (status) {
      case 'healthy': return 'color-mix(in srgb, #22c55e 12%, transparent)';
      case 'warning': return 'color-mix(in srgb, #f59e0b 12%, transparent)';
      case 'critical': return 'color-mix(in srgb, #ef4444 12%, transparent)';
      default: return 'color-mix(in srgb, #94a3b8 12%, transparent)';
    }
  }
}
