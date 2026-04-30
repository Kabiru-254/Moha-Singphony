import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Song, MessageService } from './message.service';

export interface Setlist {
  id: string; // unique id (string for easier Firebase map keys)
  name: string;
  songs: Song[];
  date: Date; // local Date in app; serialize to ISO for network
  lastUpdated?: number; // epoch millis for conflict resolution (optional)
  // Optional per-song overrides for this setlist
  overrides?: { [songId: number]: { key?: string } };
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

  // Multiple setlists state
  private setlistsSubject = new BehaviorSubject<Record<string, Setlist>>({});
  private activeSetlistIdSubject = new BehaviorSubject<string | null>(null);
  private activeSetlistSubject = new BehaviorSubject<Setlist>({ id: 'default', name: 'Default', songs: [], date: new Date() });
  private broadcastSetlistIdSubject = new BehaviorSubject<string | null>(null);
  private broadcastSetlistSubject = new BehaviorSubject<Setlist>({ id: 'default', name: 'Default', songs: [], date: new Date() });

  // Local-only outbound streams for realtime publish
  private setlistsLocalSubject = new BehaviorSubject<Record<string, Setlist>>({});
  private activeSetlistLocalSubject = new BehaviorSubject<string | null>(null);
  private broadcastSetlistLocalSubject = new BehaviorSubject<string | null>(null);

  // Other subjects
  private songsSubject = new BehaviorSubject<Song[]>(this.songs);
  private searchResultsSubject = new BehaviorSubject<Song[]>([]);

  // Observables
  public songs$ = this.songsSubject.asObservable();
  public setlists$ = this.setlistsSubject.asObservable();
  public activeSetlistId$ = this.activeSetlistIdSubject.asObservable();
  public broadcastSetlistId$ = this.broadcastSetlistIdSubject.asObservable();
  // Keep old name for backward compatibility: current active setlist
  public setlist$ = this.activeSetlistSubject.asObservable();
  public broadcastSetlist$ = this.broadcastSetlistSubject.asObservable();
  public searchResults$ = this.searchResultsSubject.asObservable();
  public setlistsLocal$ = this.setlistsLocalSubject.asObservable();
  public activeSetlistLocal$ = this.activeSetlistLocalSubject.asObservable();
  public broadcastSetlistLocal$ = this.broadcastSetlistLocalSubject.asObservable();

  constructor(private messageService: MessageService) {
    // Bootstrap with a default empty setlist for today so UI has something to work with
    const defaultId = this.createSetlist({ name: 'Sunday Service', date: new Date() }, /*silent*/ true);
    this.setActiveSetlist(defaultId, /*silent*/ true);
  }

  // ---------- Helpers ----------
  private generateSetlistId(): string {
    return 'sl_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  private recomputeActiveSetlist(): void {
    const id = this.activeSetlistIdSubject.getValue();
    const map = this.setlistsSubject.getValue();
    const active = id && map[id] ? map[id] : { id: 'default', name: 'Default', songs: [], date: new Date() };
    this.activeSetlistSubject.next(active);
  }

  private recomputeBroadcastSetlist(): void {
    const id = this.broadcastSetlistIdSubject.getValue();
    const map = this.setlistsSubject.getValue();
    const broadcast = id && map[id] ? map[id] : { id: 'default', name: 'Default', songs: [], date: new Date() };
    this.broadcastSetlistSubject.next(broadcast);
  }

  private emitLocals(): void {
    // Emit the latest maps for realtime publishing (dates should be serialized by caller if needed)
    this.setlistsLocalSubject.next(this.setlistsSubject.getValue());
  }

  // ---------- Songs catalog ----------
  getAllSongs(): Observable<Song[]> { return this.songs$; }

  getSongById(id: number): Song | undefined { return this.songs.find(song => song.id === id); }

  addSong(song: Omit<Song, 'id'>): Song {
    const newSong: Song = { ...song, id: this.generateSongId() };
    this.songs = [...this.songs, newSong];
    this.songsSubject.next(this.songs);
    return newSong;
  }

  updateSong(updatedSong: Song): void {
    this.songs = this.songs.map(s => s.id === updatedSong.id ? updatedSong : s);
    this.songsSubject.next(this.songs);
    // Also update any setlist entries referencing this song
    const map = { ...this.setlistsSubject.getValue() };
    let touched = false;
    Object.keys(map).forEach(id => {
      const list = map[id];
      const idx = list.songs.findIndex(s => s.id === updatedSong.id);
      if (idx !== -1) {
        list.songs = list.songs.map(s => s.id === updatedSong.id ? updatedSong : s);
        list.lastUpdated = Date.now();
        touched = true;
      }
    });
    if (touched) {
      this.setlistsSubject.next(map);
      this.recomputeActiveSetlist();
      this.emitLocals();
    }
  }

  deleteSong(id: number): void {
    this.songs = this.songs.filter(s => s.id !== id);
    this.songsSubject.next(this.songs);
    // Remove from all setlists
    const map = { ...this.setlistsSubject.getValue() };
    let touched = false;
    Object.keys(map).forEach(key => {
      const before = map[key].songs.length;
      map[key].songs = map[key].songs.filter(s => s.id !== id);
      if (map[key].songs.length !== before) {
        map[key].lastUpdated = Date.now();
        touched = true;
      }
    });
    if (touched) {
      this.setlistsSubject.next(map);
      this.recomputeActiveSetlist();
      this.emitLocals();
    }
  }

  private generateSongId(): number {
    return Math.max(0, ...this.songs.map(s => s.id)) + 1;
  }

  // ---------- Search ----------
  searchSongs(query: string): void {
    if (!query.trim()) { this.searchResultsSubject.next([]); return; }
    const results = this.songs.filter(song => song.title.toLowerCase().includes(query.toLowerCase()));
    this.searchResultsSubject.next(results);
  }

  // ---------- Setlists CRUD ----------
  createSetlist(input: { name: string; date: Date }, silent: boolean = false): string {
    const id = this.generateSetlistId();
    const map = { ...this.setlistsSubject.getValue() };
    map[id] = { id, name: input.name, songs: [], date: input.date, lastUpdated: Date.now(), overrides: {} };
    this.setlistsSubject.next(map);
    this.recomputeActiveSetlist();
    this.recomputeBroadcastSetlist();
    if (!silent) this.emitLocals();
    return id;
  }

  updateSetlist(id: string, patch: Partial<Pick<Setlist, 'name' | 'date' | 'songs'>>): void {
    const map = { ...this.setlistsSubject.getValue() };
    if (!map[id]) return;
    const next: Setlist = { ...map[id], ...patch, lastUpdated: Date.now() };
    // Ensure date is Date
    if (next.date && typeof (next.date as any) === 'string') {
      next.date = new Date(next.date as any);
    }
    map[id] = next;
    this.setlistsSubject.next(map);
    this.recomputeActiveSetlist();
    this.recomputeBroadcastSetlist();
    this.emitLocals();
  }

  deleteSetlist(id: string): void {
    const map = { ...this.setlistsSubject.getValue() };
    if (!(id in map)) return;
    delete map[id];
    this.setlistsSubject.next(map);
    if (this.activeSetlistIdSubject.getValue() === id) {
      this.setActiveSetlist(null); // clears active if the one deleted was active
    } else {
      this.recomputeActiveSetlist();
    }
    this.emitLocals();
  }

  setActiveSetlist(id: string | null, silent: boolean = false): void {
    this.activeSetlistIdSubject.next(id);
    this.recomputeActiveSetlist();
    if (!silent) this.activeSetlistLocalSubject.next(id);
  }

  setBroadcastSetlist(id: string | null, silent: boolean = false): void {
    this.broadcastSetlistIdSubject.next(id);
    this.recomputeBroadcastSetlist();
    if (!silent) this.broadcastSetlistLocalSubject.next(id);
  }

  // Song operations on active setlist
  addToActiveSetlist(songId: number): void {
    const id = this.activeSetlistIdSubject.getValue();
    if (!id) return;
    const song = this.getSongById(songId);
    const map = { ...this.setlistsSubject.getValue() };
    if (song && map[id] && !map[id].songs.some(s => s.id === songId)) {
      map[id] = { ...map[id], songs: [...map[id].songs, song], lastUpdated: Date.now() };
      this.setlistsSubject.next(map);
      this.recomputeActiveSetlist();
      this.emitLocals();
    }
  }

  removeFromActiveSetlist(songId: number): void {
    const id = this.activeSetlistIdSubject.getValue();
    if (!id) return;
    const map = { ...this.setlistsSubject.getValue() };
    if (map[id]) {
      map[id] = { ...map[id], songs: map[id].songs.filter(s => s.id !== songId), lastUpdated: Date.now() };
      this.setlistsSubject.next(map);
      this.recomputeActiveSetlist();
      this.emitLocals();
    }
  }

  reorderActiveSetlist(songIds: number[]): void {
    const id = this.activeSetlistIdSubject.getValue();
    if (!id) return;
    const map = { ...this.setlistsSubject.getValue() };
    const list = map[id];
    if (!list) return;
    const ordered: Song[] = [];
    songIds.forEach(sid => {
      const s = list.songs.find(ss => ss.id === sid);
      if (s) ordered.push(s);
    });
    map[id] = { ...list, songs: ordered, lastUpdated: Date.now() };
    this.setlistsSubject.next(map);
    this.recomputeActiveSetlist();
    this.emitLocals();
  }

  // Per-song key override for active setlist
  overrideKeyForActiveSetlist(songId: number, key: string): void {
    const id = this.activeSetlistIdSubject.getValue();
    if (!id) return;
    const map = { ...this.setlistsSubject.getValue() };
    const list = map[id];
    if (!list) return;
    const overrides = { ...(list.overrides || {}) };
    overrides[songId] = { ...(overrides[songId] || {}), key };
    map[id] = { ...list, overrides, lastUpdated: Date.now() };
    this.setlistsSubject.next(map);
    this.recomputeActiveSetlist();
    this.recomputeBroadcastSetlist();
    this.emitLocals();
  }

  // ---------- Remote ingestion (from realtime sync) ----------
  setSetlistsFromRemote(remoteMap: Record<string, Setlist>): void {
    // Coerce date strings to Date
    Object.values(remoteMap || {}).forEach(s => {
      if (s && typeof (s as any).date === 'string') {
        s.date = new Date((s as any).date);
      }
    });
    this.setlistsSubject.next(remoteMap || {});
    this.recomputeActiveSetlist();
    this.recomputeBroadcastSetlist();
  }

  setActiveSetlistFromRemote(id: string | null): void {
    this.activeSetlistIdSubject.next(id);
    this.recomputeActiveSetlist();
  }

  setBroadcastSetlistFromRemote(id: string | null): void {
    this.broadcastSetlistIdSubject.next(id);
    this.recomputeBroadcastSetlist();
  }

  // ---------- Current song selection ----------
  selectCurrentSong(songId: number, key: string = ''): void {
    const song = this.getSongById(songId);
    if (song) {
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
}
