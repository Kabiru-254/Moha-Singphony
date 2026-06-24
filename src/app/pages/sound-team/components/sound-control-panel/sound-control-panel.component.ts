import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SoundStatus } from '../sound-status-hero/sound-status-hero.component';

export interface SoundStateOption {
  value: SoundStatus;
  label: string;
  icon: string;
  color: string;
  description: string;
}

@Component({
  selector: 'app-sound-control-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sound-control-panel.component.html',
  styleUrl: './sound-control-panel.component.css'
})
export class SoundControlPanelComponent {
  activeState = input.required<SoundStatus>();
  stateChange = output<SoundStatus>();

  states: SoundStateOption[] = [
    {
      value: 'ready',
      label: 'Ready',
      icon: 'check_circle',
      color: '#22c55e',
      description: 'All systems good'
    },
    {
      value: 'checking',
      label: 'Checking',
      icon: 'tune',
      color: '#f59e0b',
      description: 'Running sound check'
    },
    {
      value: 'adjusting',
      label: 'Adjusting',
      icon: 'settings',
      color: '#3b82f6',
      description: 'Making live adjustments'
    },
    {
      value: 'monitoring',
      label: 'Monitoring',
      icon: 'hearing',
      color: '#06b6d4',
      description: 'Listening and watching'
    },
    {
      value: 'issue',
      label: 'Issue Detected',
      icon: 'error',
      color: '#ef4444',
      description: 'Technical problem reported'
    }
  ];

  isActive = computed(() => (state: SoundStatus) => this.activeState() === state);
}
