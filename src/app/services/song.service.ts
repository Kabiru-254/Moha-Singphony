import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Song, CurrentSongState, MessageService } from './message.service';

export interface Setlist {
  id: number;
  name: string;
  songs: Song[];
  date: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SongService {
  // Mock database of songs
  private songs: Song[] = [
    {
      id: 1,
      title: 'Amazing Grace',
      keys: ['C', 'D', 'E', 'F', 'G', 'A'],
      tempo: 100,
      structure: ['Verse 1', 'Chorus', 'Verse 2', 'Chorus', 'Bridge', 'Chorus'],
      notes: 'Traditional arrangement'
    },
    {
      id: 2,
      title: 'How Great Thou Art',
      keys: ['C', 'D', 'E', 'G'],
      tempo: 100,
      structure: ['Verse 1', 'Chorus', 'Verse 2', 'Chorus', 'Verse 3', 'Chorus'],
      notes: 'Emphasize dynamics on chorus'
    },
    {
      id: 3,
      title: 'Great Is Thy Faithfulness',
      keys: ['D', 'E', 'F', 'G'],
      tempo: 80,
      structure: ['Verse 1', 'Chorus', 'Verse 2', 'Chorus', 'Verse 3', 'Chorus'],
      notes: 'Gentle intro, build on chorus'
    },
    {
      id: 4,
      title: 'Blessed Assurance',
      keys: ['C', 'D', 'E', 'F', 'G'],
      tempo: 100,
      structure: ['Verse 1', 'Chorus', 'Verse 2', 'Chorus', 'Verse 3', 'Chorus'],
      notes: 'Joyful throughout'
    },
    {
      id: 5,
      title: 'Holy Spirit',
      keys: ['D', 'E', 'F'],
      tempo: 80,
      structure: ['Intro', 'Verse 1', 'Chorus', 'Verse 2', 'Chorus', 'Bridge', 'Chorus'],
      notes: 'Start soft, build through bridge'
    }
  ];

  // Current setlist
  private currentSetlist: Setlist = {
    id: 1,
    name: 'Sunday Morning Service',
    songs: [],
    date: new Date()
  };

  // Subjects
  private songsSubject = new BehaviorSubject<Song[]>(this.songs);
  private setlistSubject = new BehaviorSubject<Setlist>(this.currentSetlist);
  private searchResultsSubject = new BehaviorSubject<Song[]>([]);

  // Observables
  public songs$ = this.songsSubject.asObservable();
  public setlist$ = this.setlistSubject.asObservable();
  public searchResults$ = this.searchResultsSubject.asObservable();

  constructor(private messageService: MessageService) { }

  // Get all songs
  getAllSongs(): Observable<Song[]> {
    return this.songs$;
  }

  // Get song by id
  getSongById(id: number): Song | undefined {
    return this.songs.find(song => song.id === id);
  }

  // Add song
  addSong(song: Omit<Song, 'id'>): Song {
    const newSong: Song = {
      ...song,
      id: this.generateId()
    };
    this.songs = [...this.songs, newSong];
    this.songsSubject.next(this.songs);
    return newSong;
  }

  // Update song
  updateSong(updatedSong: Song): void {
    this.songs = this.songs.map(song =>
      song.id === updatedSong.id ? updatedSong : song
    );
    this.songsSubject.next(this.songs);

    // Update setlist if the song is in it
    if (this.currentSetlist.songs.some(song => song.id === updatedSong.id)) {
      this.currentSetlist.songs = this.currentSetlist.songs.map(song =>
        song.id === updatedSong.id ? updatedSong : song
      );
      this.setlistSubject.next(this.currentSetlist);
    }
  }

  // Delete song
  deleteSong(id: number): void {
    this.songs = this.songs.filter(song => song.id !== id);
    this.songsSubject.next(this.songs);

    // Remove from setlist if present
    this.currentSetlist.songs = this.currentSetlist.songs.filter(song => song.id !== id);
    this.setlistSubject.next(this.currentSetlist);
  }

  // Search songs
  searchSongs(query: string): void {
    if (!query.trim()) {
      this.searchResultsSubject.next([]);
      return;
    }

    const results = this.songs.filter(song =>
      song.title.toLowerCase().includes(query.toLowerCase())
    );
    this.searchResultsSubject.next(results);
  }

  // Add song to setlist
  addToSetlist(songId: number): void {
    const song = this.getSongById(songId);
    if (song && !this.currentSetlist.songs.some(s => s.id === songId)) {
      this.currentSetlist.songs = [...this.currentSetlist.songs, song];
      this.setlistSubject.next(this.currentSetlist);
    }
  }

  // Remove song from setlist
  removeFromSetlist(songId: number): void {
    this.currentSetlist.songs = this.currentSetlist.songs.filter(song => song.id !== songId);
    this.setlistSubject.next(this.currentSetlist);
  }

  // Reorder setlist
  reorderSetlist(songIds: number[]): void {
    const orderedSongs: Song[] = [];
    songIds.forEach(id => {
      const song = this.currentSetlist.songs.find(s => s.id === id);
      if (song) {
        orderedSongs.push(song);
      }
    });
    this.currentSetlist.songs = orderedSongs;
    this.setlistSubject.next(this.currentSetlist);
  }

  // Select current song
  selectCurrentSong(songId: number, key: string = ''): void {
    const song = this.getSongById(songId);
    if (song) {
      // Use the first available key if none specified
      const selectedKey = key || song.keys[0] || 'C';

      this.messageService.updateCurrentSong({
        song,
        currentKey: selectedKey,
        tempo: song.tempo,
        currentSection: song.structure[0],
        isPlaying: true
      });
    }
  }

  // Generate a unique ID
  private generateId(): number {
    return Math.max(0, ...this.songs.map(song => song.id)) + 1;
  }
}
