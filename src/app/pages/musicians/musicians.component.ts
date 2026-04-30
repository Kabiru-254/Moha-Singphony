import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, combineLatest } from 'rxjs';

import {MessageService, RecipientRole, CurrentSongState, MessageType, Message, Song} from '../../services/message.service';
import { NotificationService } from '../../services/notification.service';
import { NotificationComponent } from '../../shared/notification/notification.component';
import { SongService } from '../../services/song.service';

@Component({
  selector: 'app-musicians',
  standalone: true,
  imports: [
    CommonModule,
    NotificationComponent
  ],
  templateUrl: './musicians.component.html',
  styleUrl: './musicians.component.css'
})
export class MusiciansComponent implements OnInit, OnDestroy {
  // Current song state
  currentSongState: CurrentSongState | null = null;
  isOffline = false;
  nextSong: Song | null = null;

  // UI state
  theme: string = 'light';
  showFlash: boolean = false;

  // Message history
  messages: { type: string; content: any; timestamp: Date; sender: RecipientRole }[] = [];
  latestMessage: Message | null = null;

  // Subscriptions
  private subscriptions: Subscription = new Subscription();

  constructor(
    private messageService: MessageService,
    private notificationService: NotificationService,
    private songService: SongService
  ) {}

  ngOnInit(): void {
    // Subscribe to current song and broadcast setlist to compute next song robustly
    this.subscriptions.add(
      combineLatest([
        this.messageService.currentSong$,
        this.songService.broadcastSetlist$
      ]).subscribe(([songState, setlist]) => {
        this.currentSongState = songState;
        if (setlist && setlist.songs && setlist.songs.length > 0) {
          if (songState?.song) {
            const currentIndex = setlist.songs.findIndex(s => s.id === songState.song!.id);
            this.nextSong = currentIndex !== -1 && currentIndex < setlist.songs.length - 1
              ? setlist.songs[currentIndex + 1]
              : null;
          } else {
            this.nextSong = setlist.songs[0] || null;
          }
        } else {
          this.nextSong = null;
        }
      })
    );

    // Subscribe to messages
    this.subscriptions.add(
      this.messageService.getMessagesForRole(RecipientRole.MUSICIAN).subscribe(message => {
        // Handle incoming messages for musicians
        this.notificationService.createNotificationFromMessage(message);

        // Set as latest message and show flash
        this.latestMessage = message;
        this.showFlash = true;

        // Hide flash after 3 seconds
        setTimeout(() => {
          this.showFlash = false;
        }, 3000);

        // Add to message history
        this.messages.unshift({
          type: message.type,
          content: this.getMessageContent(message),
          timestamp: message.timestamp,
          sender: message.sender
        });
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', this.theme === 'dark');
    try { localStorage.setItem('theme', this.theme); } catch {}
  }

  // Helper method to extract message content
  private getMessageContent(message: any): any {
    return message.content;
  }

  protected readonly MessageType = MessageType;
  protected readonly RecipientRole = RecipientRole;
}
