import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';

import { MessageService, MessageType, RecipientRole, Song, CurrentSongState, Message } from '../../services/message.service';
import { SongService, Setlist } from '../../services/song.service';
import { NotificationService } from '../../services/notification.service';
import { NotificationComponent } from '../../shared/notification/notification.component';

import { AppBarComponent } from './components/app-bar/app-bar.component';
import { SongHeroComponent } from './components/song-hero/song-hero.component';
import { SetlistPanelComponent } from './components/setlist-panel/setlist-panel.component';
import { LiveControlCenterComponent } from './components/live-control-center/live-control-center.component';
import { AnalyticsWidgetComponent } from './components/analytics-widget/analytics-widget.component';
import { BroadcastFeedComponent } from './components/broadcast-feed/broadcast-feed.component';
import { MusiciansWidgetComponent, Musician } from './components/musicians-widget/musicians-widget.component';
import { QuickNotesComponent } from './components/quick-notes/quick-notes.component';
import { KeySelectorComponent } from './components/key-selector/key-selector.component';

@Component({
  selector: 'app-songleader',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NotificationComponent,
    AppBarComponent,
    SongHeroComponent,
    SetlistPanelComponent,
    LiveControlCenterComponent,
    AnalyticsWidgetComponent,
    BroadcastFeedComponent,
    MusiciansWidgetComponent,
    QuickNotesComponent,
    KeySelectorComponent
  ],
  templateUrl: './songleader.component.html',
  styleUrl: './songleader.component.css',
  animations: [
    trigger('panelExpand', [
      transition(':enter', [
        style({ height: 0, opacity: 0, transform: 'translateY(-8px)' }),
        animate('300ms cubic-bezier(0.16, 1, 0.3, 1)', style({ height: '*', opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        style({ height: '*', opacity: 1, transform: 'translateY(0)' }),
        animate('250ms cubic-bezier(0.16, 1, 0.3, 1)', style({ height: 0, opacity: 0, transform: 'translateY(-8px)' }))
      ])
    ])
  ]
})
export class SongleaderComponent implements OnInit, OnDestroy {
  // Enums for template
  RecipientRole = RecipientRole;
  MessageType = MessageType;

  // Signals for reactive state
  songs = signal<Song[]>([]);
  filteredSongs = signal<Song[]>([]);
  currentSongState = signal<CurrentSongState | null>(null);
  currentSetlist = signal<Setlist | null>(null);
  searchQuery = signal('');
  theme = signal<'light' | 'dark'>('light');
  showKeyPanel = signal(false);
  showSongSetupModal = signal(false);
  broadcastingCommand = signal<string | null>(null);
  quickNotes = signal('');
  messageHistory = signal<Message[]>([]);

  // New song form
  newSong = signal<{ title: string; key: string; structure: string }>({
    title: '',
    key: 'C',
    structure: ''
  });

  allKeys = signal(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);

  // Computed derived state
  currentKey = computed(() => this.currentSongState()?.currentKey || 'C');
  currentTempo = computed(() => this.currentSongState()?.tempo || 100);
  setlistSongs = computed(() => this.currentSetlist()?.songs || []);

  songsPlayed = computed(() => {
    const songs = this.setlistSongs();
    const currentId = this.currentSongState()?.song?.id;
    const currentIndex = songs.findIndex(s => s.id === currentId);
    return currentIndex >= 0 ? currentIndex + 1 : 0;
  });

  songsRemaining = computed(() => {
    const songs = this.setlistSongs();
    const currentId = this.currentSongState()?.song?.id;
    const currentIndex = songs.findIndex(s => s.id === currentId);
    return currentIndex >= 0 ? Math.max(0, songs.length - currentIndex - 1) : songs.length;
  });

  averageTempo = computed(() => {
    const songs = this.setlistSongs();
    if (songs.length === 0) return this.currentTempo();
    const total = songs.reduce((sum, s) => sum + s.tempo, 0);
    return Math.round(total / songs.length);
  });

  messagesSent = computed(() => this.messageHistory().length);

  // Mock connected musicians
  musicians: Musician[] = [
    { name: 'Elvis Akello', role: 'Drummer', instrument: 'Drums', online: true },
    { name: 'James Makumi', role: 'Bassist', instrument: 'Bass', online: true },
    { name: 'Joel Njoroge', role: 'Keys', instrument: 'Keys', online: true },
    { name: 'Nadai Mumo', role: 'BGV Leader', instrument: 'Vocals', online: true },
    { name: 'Billy Paul', role: 'Lead', instrument: 'Lead Guitar', online: true },
    { name: 'Caleb Karisa', role: 'Acoustic', instrument: 'Acoustic Guitar', online: true }
  ];

  private subscriptions: Subscription = new Subscription();

  constructor(
    private router: Router,
    private messageService: MessageService,
    private songService: SongService,
    protected notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Load songs
    this.subscriptions.add(
      this.songService.songs$.subscribe(songs => {
        this.songs.set(songs);
        this.filteredSongs.set(songs);
      })
    );

    // Current song state
    this.subscriptions.add(
      this.messageService.currentSong$.subscribe(state => {
        this.currentSongState.set(state);
      })
    );

    // Setlist updates
    this.subscriptions.add(
      this.songService.setlist$.subscribe(setlist => {
        this.currentSetlist.set(setlist);
      })
    );

    // Subscribe to search results
    this.subscriptions.add(
      this.songService.searchResults$.subscribe(results => {
        this.filteredSongs.set(results);
      })
    );

    // Subscribe to messages
    this.subscriptions.add(
      this.messageService.getMessagesForRole(RecipientRole.SONG_LEADER).subscribe(message => {
        this.notificationService.createNotificationFromMessage(message);
        this.messageHistory.update(history => [...history, message]);
      })
    );

    // Theme initialization
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme === 'dark' ? 'dark' : 'light';
    this.theme.set(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // Theme
  toggleTheme(): void {
    const next = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    try { localStorage.setItem('theme', next); } catch {}
  }

  // Search
  onSearchQueryChange(query: string): void {
    this.searchQuery.set(query);
    this.songService.searchSongs(query);
  }

  // Song selection
  selectSong(song: Song): void {
    this.songService.selectCurrentSong(song.id);
  }

  // Setlist management
  addToSetlist(song: Song): void {
    this.songService.addToActiveSetlist(song.id);
    this.notificationService.showNotification(`Added ${song.title} to setlist`, 'resolved');
  }

  removeFromSetlist(song: Song): void {
    this.songService.removeFromActiveSetlist(song.id);
    this.notificationService.showNotification('Song removed from setlist', 'info');
  }

  onReorderSetlist(songs: Song[]): void {
    this.songService.reorderActiveSetlist(songs.map(s => s.id));
    this.notificationService.showNotification('Setlist reordered', 'info');
  }

  broadcastSong(song: Song): void {
    this.selectSong(song);
    this.messageService.sendMessage({
      type: MessageType.GENERAL_COMMUNICATION,
      content: { text: `Now playing: ${song.title} in ${this.currentSongState()?.currentKey || song.keys[0]}` },
      sender: RecipientRole.SONG_LEADER,
      recipients: [RecipientRole.MUSICIAN, RecipientRole.SOUND_TEAM]
    });
    this.notificationService.showNotification(`Broadcasting: ${song.title}`, 'cue');
  }

  broadcastCurrentSong(): void {
    const song = this.currentSongState()?.song;
    if (song) {
      this.broadcastSong(song);
    }
  }

  broadcastSetlist(): void {
    const setlist = this.currentSetlist();
    if (setlist) {
      this.songService.setBroadcastSetlist(setlist.id);
      this.notificationService.showNotification('Setlist broadcasted to team', 'cue');
    }
  }

  // Key selection
  selectKey(key: string): void {
    this.messageService.updateCurrentSong({ currentKey: key });
    this.showKeyPanel.set(false);
  }

  toggleKeyPanel(): void {
    this.showKeyPanel.update(v => !v);
  }

  transposeKey(step: number): void {
    const state = this.currentSongState();
    if (!state) return;
    const keys = this.allKeys();
    const currentIndex = keys.indexOf(state.currentKey);
    if (currentIndex === -1) return;
    const newIndex = (currentIndex + step + keys.length) % keys.length;
    this.messageService.updateCurrentSong({ currentKey: keys[newIndex] });
  }

  // Tempo
  adjustTempo(direction: 'faster' | 'slower'): void {
    const state = this.currentSongState();
    if (!state) return;
    const step = 5;
    const newTempo = direction === 'faster'
      ? state.tempo + step
      : Math.max(10, state.tempo - step);
    if (newTempo !== state.tempo) {
      this.messageService.updateCurrentSong({ tempo: newTempo });
    }
  }

  setTempo(tempo: number): void {
    const state = this.currentSongState();
    if (!state) return;
    const clamped = Math.max(40, Math.min(240, tempo));
    if (clamped !== state.tempo) {
      this.messageService.updateCurrentSong({ tempo: clamped });
    }
  }

  // Musical instruction with broadcasting feedback
  sendMusicalInstruction(instruction: string): void {
    this.broadcastingCommand.set(instruction);
    this.messageService.sendMessage({
      type: MessageType.MUSICAL_INSTRUCTION,
      content: { instruction },
      sender: RecipientRole.SONG_LEADER,
      recipients: [RecipientRole.MUSICIAN, RecipientRole.PIANIST]
    });
    this.notificationService.showNotification(`Broadcast: ${instruction}`, 'cue');
    setTimeout(() => this.broadcastingCommand.set(null), 1500);
  }

  // Song setup modal
  openSongSetupModal(): void {
    this.newSong.set({ title: '', key: 'C', structure: '' });
    this.showSongSetupModal.set(true);
  }

  closeSongSetupModal(): void {
    this.showSongSetupModal.set(false);
  }

  setNewSongTitle(event: Event | undefined): void {
    if (!event) return;
    const value = (event.target as HTMLInputElement).value;
    this.newSong.update(s => ({ ...s, title: value }));
  }

  setNewSongKey(key: string): void {
    this.newSong.update(s => ({ ...s, key }));
  }

  setNewSongStructure(event: Event | undefined): void {
    if (!event) return;
    const value = (event.target as HTMLInputElement).value;
    this.newSong.update(s => ({ ...s, structure: value }));
  }

  saveSong(): void {
    const song = this.newSong();
    if (!song.title.trim()) return;

    const structureArray = song.structure
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);

    const created = this.songService.addSong({
      title: song.title,
      keys: [song.key],
      tempo: 100,
      structure: structureArray.length > 0 ? structureArray : ['Verse', 'Chorus']
    });

    if (created && created.id != null) {
      this.songService.addToActiveSetlist(created.id);
      this.notificationService.showNotification('Song created and added to setlist', 'resolved');
    } else {
      this.notificationService.showNotification('Song created successfully', 'resolved');
    }

    this.closeSongSetupModal();
  }

  onNotesChange(notes: string): void {
    this.quickNotes.set(notes);
  }
}
