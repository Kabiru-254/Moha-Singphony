import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { CurrentSongState } from '../../../../services/message.service';

@Component({
  selector: 'app-song-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './song-hero.component.html',
  styleUrl: './song-hero.component.css',
  animations: [
    trigger('bannerPulse', [
      transition(':enter', [
        style({ transform: 'scale(0.96)', opacity: 0 }),
        animate('350ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'scale(1)', opacity: 1 }))
      ]),
      transition('* => *', [
        style({ transform: 'scale(0.98)' }),
        animate('200ms ease-out', style({ transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class SongHeroComponent {
  state = input.required<CurrentSongState | null>();
  currentInstruction = input<string>('');

  broadcast = output<void>();
  toggleKeyPanel = output<void>();

  showKeyPanel = signal(false);

  title = computed(() => this.state()?.song?.title || 'No Song Selected');
  artist = computed(() => 'Worship Team');
  key = computed(() => this.state()?.currentKey || 'C');
  tempo = computed(() => this.state()?.tempo || 100);
  section = computed(() => this.state()?.currentSection || 'Intro');
  hasSong = computed(() => !!this.state()?.song);

  onBroadcast(): void {
    this.broadcast.emit();
  }

  onToggleKeyPanel(): void {
    this.toggleKeyPanel.emit();
  }
}
