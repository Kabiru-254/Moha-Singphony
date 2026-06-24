import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Musician {
  name: string;
  role: string;
  instrument: string;
  online: boolean;
  avatar?: string;
}

@Component({
  selector: 'app-musicians-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './musicians-widget.component.html',
  styleUrl: './musicians-widget.component.css'
})
export class MusiciansWidgetComponent {
  musicians = input<Musician[]>([]);
  totalConnected = input<number>(0);

  private instrumentGradients: Record<string, string> = {
    'Drums': 'linear-gradient(135deg, #ef4444, #f97316)',
    'Bass': 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    'Keys': 'linear-gradient(135deg, #06b6d4, #3b82f6)',
    'Vocals': 'linear-gradient(135deg, #ec4899, #8b5cf6)',
    'Lead Guitar': 'linear-gradient(135deg, #22c55e, #10b981)',
    'Acoustic': 'linear-gradient(135deg, #f59e0b, #fbbf24)',
  };

  trackByMusician(index: number, musician: Musician): string {
    return musician.name + musician.role;
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  getAvatarGradient(instrument: string): string {
    return this.instrumentGradients[instrument] || 'linear-gradient(135deg, #6366f1, #8b5cf6)';
  }
}
