import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SoundStatus = 'ready' | 'checking' | 'adjusting' | 'issue' | 'monitoring';

@Component({
  selector: 'app-sound-status-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sound-status-hero.component.html',
  styleUrl: './sound-status-hero.component.css'
})
export class SoundStatusHeroComponent {
  status = input.required<SoundStatus>();
  sessionName = input<string>('Morning Worship');
  lastUpdate = input<Date | string>(new Date());
  connectedDevices = input<number>(0);
  connectedMusicians = input<number>(0);

  statusConfig = computed(() => {
    const map: Record<SoundStatus, { label: string; icon: string; color: string; bg: string; ring: string; pulse: boolean }> = {
      ready: {
        label: 'Ready',
        icon: 'check_circle',
        color: '#22c55e',
        bg: 'color-mix(in srgb, #22c55e 12%, transparent)',
        ring: 'color-mix(in srgb, #22c55e 35%, transparent)',
        pulse: false
      },
      checking: {
        label: 'Checking',
        icon: 'tune',
        color: '#f59e0b',
        bg: 'color-mix(in srgb, #f59e0b 12%, transparent)',
        ring: 'color-mix(in srgb, #f59e0b 35%, transparent)',
        pulse: true
      },
      adjusting: {
        label: 'Adjusting',
        icon: 'settings',
        color: '#3b82f6',
        bg: 'color-mix(in srgb, #3b82f6 12%, transparent)',
        ring: 'color-mix(in srgb, #3b82f6 35%, transparent)',
        pulse: true
      },
      issue: {
        label: 'Issue Detected',
        icon: 'error',
        color: '#ef4444',
        bg: 'color-mix(in srgb, #ef4444 12%, transparent)',
        ring: 'color-mix(in srgb, #ef4444 35%, transparent)',
        pulse: true
      },
      monitoring: {
        label: 'Monitoring',
        icon: 'hearing',
        color: '#06b6d4',
        bg: 'color-mix(in srgb, #06b6d4 12%, transparent)',
        ring: 'color-mix(in srgb, #06b6d4 35%, transparent)',
        pulse: false
      }
    };
    return map[this.status()];
  });
}
