import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Song, CurrentSongState } from '../../../../services/message.service';

export type SongStatus = 'current' | 'next' | 'upcoming' | 'completed';

@Component({
  selector: 'app-song-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './song-card.component.html',
  styleUrl: './song-card.component.css'
})
export class SongCardComponent {
  song = input.required<Song>();
  status = input<SongStatus>('upcoming');
  currentKey = input<string>('');
  index = input<number>(0);
  draggable = input<boolean>(false);
  selected = output<Song>();
  broadcast = output<Song>();
  remove = output<Song>();

  get displayKey(): string {
    return this.currentKey() || this.song().keys[0] || 'C';
  }

  get displayTempo(): string {
    return `${this.song().tempo} BPM`;
  }

  get isCurrent(): boolean {
    return this.status() === 'current';
  }

  onSelect(): void {
    this.selected.emit(this.song());
  }

  onBroadcast(event: MouseEvent): void {
    event.stopPropagation();
    this.broadcast.emit(this.song());
  }

  onRemove(event: MouseEvent): void {
    event.stopPropagation();
    this.remove.emit(this.song());
  }
}
