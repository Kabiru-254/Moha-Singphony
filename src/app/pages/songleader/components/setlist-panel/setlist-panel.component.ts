import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, CdkDropList, CdkDrag, CdkDragPreview, moveItemInArray } from '@angular/cdk/drag-drop';
import { Song, CurrentSongState } from '../../../../services/message.service';
import { Setlist } from '../../../../services/song.service';
import { SongCardComponent, SongStatus } from '../song-card/song-card.component';

@Component({
  selector: 'app-setlist-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, CdkDropList, CdkDrag, CdkDragPreview, SongCardComponent],
  templateUrl: './setlist-panel.component.html',
  styleUrl: './setlist-panel.component.css'
})
export class SetlistPanelComponent {
  setlist = input.required<Setlist | null>();
  currentSongState = input.required<CurrentSongState | null>();
  searchResults = input<Song[]>([]);
  searchQuery = input<string>('');

  queryChange = output<string>();
  addSong = output<Song>();
  selectSong = output<Song>();
  broadcastSong = output<Song>();
  removeSong = output<Song>();
  reorder = output<Song[]>();
  broadcastSetlist = output<void>();
  addNewSong = output<void>();

  localQuery = signal('');

  songs = computed(() => this.setlist()?.songs || []);

  currentSongId = computed(() => this.currentSongState()?.song?.id ?? null);

  filteredResults = computed(() => {
    const query = this.searchQuery();
    return query.trim() ? this.searchResults() : [];
  });

  onQueryInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.queryChange.emit(value);
  }

  onDrop(event: CdkDragDrop<Song[]>): void {
    const songs = [...this.songs()];
    moveItemInArray(songs, event.previousIndex, event.currentIndex);
    this.reorder.emit(songs);
  }

  onAddSong(song: Song): void {
    this.addSong.emit(song);
    this.queryChange.emit('');
  }

  trackBySongId(index: number, song: Song): number {
    return song.id;
  }

  getStatus(song: Song, index: number): SongStatus {
    const currentId = this.currentSongId();
    if (currentId === song.id) return 'current';
    const currentIndex = this.songs().findIndex(s => s.id === currentId);
    if (currentIndex === -1) return index === 0 ? 'next' : 'upcoming';
    if (index === currentIndex + 1) return 'next';
    if (index < currentIndex) return 'completed';
    return 'upcoming';
  }
}
