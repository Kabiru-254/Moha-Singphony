import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { MessageService, MessageType, RecipientRole, Song, CurrentSongState } from '../../services/message.service';
import { SongService, Setlist } from '../../services/song.service';
import { NotificationService } from '../../services/notification.service';
import { NotificationComponent } from '../../shared/notification/notification.component';

@Component({
  selector: 'app-songleader',
  imports: [
    FormsModule,
    CommonModule,
    NotificationComponent
  ],
  templateUrl: './songleader.component.html',
  standalone: true,
  styleUrl: './songleader.component.css'
})
export class SongleaderComponent implements OnInit, OnDestroy {
  // Make RecipientRole enum available in the template
  RecipientRole = RecipientRole;
  MessageType = MessageType;

  // Songs and song state
  songs: Song[] = [];
  filteredSongs: Song[] = [];
  currentSongState: CurrentSongState | null = null;
  currentSetlist: Setlist | null = null;
  searchQuery: string = '';

  // Song setup modal
  showSongSetupModal: boolean = false;
  newSong: {
    title: string;
    key: string;
    structure: string;
  } = {
    title: '',
    key: 'C',
    structure: ''
  };

  // Keys grid
  allKeys: string[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // Commands
  musicalInstructions: string[] = [
    'Break it down',
    'Build up',
    'Keys+Strings Only',
    'No drums',
    'Transpose up',
    'Transpose down'
  ];

  soundRequests: string[] = [
    'Can\'t hear band',
    'Can\'t hear keys',
    'Can\'t hear me',
    'Sound OK'
  ];

  deaconMessages: string[] = [
    'Call the Minister',
    'Extend worship time',
    'Wrap up soon'
  ];

  // Message composition
  customMessage: string = '';
  selectedRecipients: RecipientRole[] = [];

  // UI state
  theme: string = 'light';
  activeTab: 'all' | 'musicians' | 'sound' | 'deacon' = 'all';
  showKeyGrid: boolean = false;

  // Subscriptions
  private subscriptions: Subscription = new Subscription();

  constructor(
    private router: Router,
    private messageService: MessageService,
    private songService: SongService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Load songs
    this.subscriptions.add(
      this.songService.songs$.subscribe(songs => {
        this.songs = songs;
        this.filteredSongs = songs;
      })
    );

    // Subscribe to current song updates
    this.subscriptions.add(
      this.messageService.currentSong$.subscribe(songState => {
        this.currentSongState = songState;
      })
    );

    // Subscribe to setlist updates
    this.subscriptions.add(
      this.songService.setlist$.subscribe(setlist => {
        this.currentSetlist = setlist;
      })
    );

    // Subscribe to messages
    this.subscriptions.add(
      this.messageService.getMessagesForRole(RecipientRole.SONG_LEADER).subscribe(message => {
        // Handle incoming messages for song leader
        this.notificationService.createNotificationFromMessage(message);
      })
    );

    // Initialize theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.theme = savedTheme;
      document.documentElement.classList.toggle('dark', this.theme === 'dark');
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', this.theme === 'dark');
    try { localStorage.setItem('theme', this.theme); } catch {}
  }

  navigateToSongManagement() {
    this.router.navigate(['/song-leader']);
  }

  searchSongs() {
    if (!this.searchQuery.trim()) {
      this.filteredSongs = this.songs;
      return;
    }

    this.filteredSongs = this.songs.filter(song =>
      song.title.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  selectSong(song: Song) {
    this.songService.selectCurrentSong(song.id);
  }

  selectKey(key: string) {
    // Allow key selection even if no song is currently selected; update global state and broadcast locally
    this.messageService.updateCurrentSong({
      currentKey: key
    });
    this.showKeyGrid = false;
  }

  transposeKey(step: number) {
    if (this.currentSongState) {
      const currentIndex = this.allKeys.indexOf(this.currentSongState.currentKey);
      if (currentIndex !== -1) {
        const newIndex = (currentIndex + step + this.allKeys.length) % this.allKeys.length;
        this.messageService.updateCurrentSong({
          currentKey: this.allKeys[newIndex]
        });
      }
    }
  }

  adjustTempo(direction: 'faster' | 'slower') {
    if (this.currentSongState) {
      const currentTempo = this.currentSongState.tempo;
      let newTempo = currentTempo;

      // Adjust tempo by 5 units each time
      const tempoStep = 5;

      if (direction === 'faster') {
        newTempo = currentTempo + tempoStep;
      } else if (direction === 'slower') {
        // Ensure tempo doesn't go below 10 (very slow but still audible)
        newTempo = Math.max(10, currentTempo - tempoStep);
      }

      if (newTempo !== currentTempo) {
        this.messageService.updateCurrentSong({
          tempo: newTempo
        });
      }
    }
  }

  sendMusicalInstruction(instruction: string) {
    this.messageService.sendMessage({
      type: MessageType.MUSICAL_INSTRUCTION,
      content: { instruction },
      sender: RecipientRole.SONG_LEADER,
      recipients: [RecipientRole.MUSICIAN, RecipientRole.PIANIST]
    });
  }

  sendSoundRequest(request: string) {
    this.messageService.sendMessage({
      type: MessageType.SOUND_REQUEST,
      content: { request },
      sender: RecipientRole.SONG_LEADER,
      recipients: [RecipientRole.SOUND_TEAM]
    });
  }

  sendDeaconMessage(message: string) {
    this.messageService.sendMessage({
      type: MessageType.SERVICE_COORDINATION,
      content: { instruction: message },
      sender: RecipientRole.SONG_LEADER,
      recipients: [RecipientRole.DEACON]
    });
  }

  sendCustomMessage() {
    if (this.customMessage.trim() && this.selectedRecipients.length > 0) {
      this.messageService.sendMessage({
        type: MessageType.CUSTOM_MESSAGE,
        content: { text: this.customMessage, isUrgent: false },
        sender: RecipientRole.SONG_LEADER,
        recipients: this.selectedRecipients
      });

      this.customMessage = '';
    }
  }

  toggleRecipient(role: RecipientRole) {
    const index = this.selectedRecipients.indexOf(role);
    if (index === -1) {
      this.selectedRecipients.push(role);
    } else {
      this.selectedRecipients.splice(index, 1);
    }
  }

  isRecipientSelected(role: RecipientRole): boolean {
    return this.selectedRecipients.includes(role);
  }

  setActiveTab(tab: 'all' | 'musicians' | 'sound' | 'deacon') {
    this.activeTab = tab;
  }

  toggleKeyGrid() {
    this.showKeyGrid = !this.showKeyGrid;
  }

  togglePlayPause() {
    if (this.currentSongState) {
      this.messageService.updateCurrentSong({
        isPlaying: !this.currentSongState.isPlaying
      });
    }
  }

  // Setlist management methods
  addToSetlist(songId: number) {
    this.songService.addToActiveSetlist(songId);
    this.notificationService.showNotification('Song added to setlist', 'success');
  }

  removeFromSetlist(songId: number) {
    this.songService.removeFromActiveSetlist(songId);
    this.notificationService.showNotification('Song removed from setlist', 'info');
  }

  isInSetlist(songId: number): boolean {
    return !!this.currentSetlist?.songs?.some(s => s.id === songId);
  }

  addToSetlistAndClearSearch(songId: number) {
    if (!this.isInSetlist(songId)) {
      this.addToSetlist(songId);
    }
    this.searchQuery = '';
    this.filteredSongs = this.songs;
  }

  broadcastSong(song: Song) {
    this.selectSong(song);
    this.messageService.sendMessage({
      type: MessageType.GENERAL_COMMUNICATION,
      content: { text: `Now playing: ${song.title} in ${this.currentSongState?.currentKey || song.keys[0]}` },
      sender: RecipientRole.SONG_LEADER,
      recipients: [RecipientRole.MUSICIAN, RecipientRole.SOUND_TEAM]
    });
    this.notificationService.showNotification(`Broadcasting: ${song.title}`, 'success');
  }

  broadcastSetlist() {
    if (this.currentSetlist) {
      this.songService.setBroadcastSetlist(this.currentSetlist.id);
      this.notificationService.showNotification('Setlist broadcasted to team', 'success');
    }
  }

  // Song setup modal methods
  openSongSetupModal() {
    this.showSongSetupModal = true;
    this.newSong = {
      title: '',
      key: 'C',
      structure: ''
    };
  }

  closeSongSetupModal() {
    this.showSongSetupModal = false;
  }

  saveSong() {
    if (this.newSong.title) {
      const structureArray = this.newSong.structure
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);

      const created = this.songService.addSong({
        title: this.newSong.title,
        keys: [this.newSong.key],
        tempo: 100, // Default medium tempo
        structure: structureArray.length > 0 ? structureArray : ['Verse', 'Chorus']
      });

      // Immediately add to today's setlist
      if (created && created.id != null) {
        this.songService.addToActiveSetlist(created.id);
        this.notificationService.showNotification('Song created and added to setlist', 'success');
      } else {
        this.notificationService.showNotification('Song created successfully', 'success');
      }

      this.closeSongSetupModal();
    }
  }
}
