import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';

import {
  CurrentSongState,
  Message,
  MessageService,
  RecipientRole
} from '../../services/message.service';

import {
  SetlistSong,
  SongService
} from '../../services/song.service';

import {
  RealtimeSyncService
} from '../../services/realtime-sync.service';

@Component({
  selector: 'app-musicians',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './musicians.component.html',
  styleUrl: './musicians.component.css'
})
export class MusiciansComponent implements OnInit, OnDestroy {
  currentSongState: CurrentSongState | null = null;
  nextSong: SetlistSong | null = null;

  cueText = '';
  sender = '';
  urgency = 1;

  remaining: number | null = null;
  fullscreenError = '';

  private lastCue = '';
  private lastSender: RecipientRole | null = null;
  private lastCueAt = 0;

  private cueTimer?: ReturnType<typeof setTimeout>;
  private countdownTimer?: ReturnType<typeof setInterval>;

  private readonly subscriptions = new Subscription();

  constructor(
    private messages: MessageService,
    public songs: SongService,
    public realtime: RealtimeSyncService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      combineLatest([
        this.messages.currentSong$,
        this.songs.broadcastSetlist$
      ]).subscribe(([state]) => {
        this.currentSongState = state;
        this.nextSong = this.songs.getNextSong();
      })
    );

    this.subscriptions.add(
      this.messages
        .getMessagesForRole(RecipientRole.MUSICIAN)
        .subscribe(message => {
          this.showCue(message);
        })
    );

    this.subscriptions.add(
      this.songs.endingAt$.subscribe(() => {
        this.updateCountdown();
      })
    );

    this.countdownTimer = setInterval(() => {
      this.updateCountdown();
    }, 250);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();

    if (this.cueTimer) {
      clearTimeout(this.cueTimer);
    }

    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  }

  async fullscreen(): Promise<void> {
    this.fullscreenError = '';

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      this.fullscreenError =
        'Full-screen mode is unavailable in this browser.';
    }
  }

  private showCue(message: Message): void {
    const text = this.messageText(message);

    if (!text) {
      return;
    }

    const now = Date.now();
    const expiresAt = message.expiresAt ?? now + 4000;

    if (expiresAt <= now) {
      return;
    }

    const repeated =
      text === this.lastCue &&
      message.sender === this.lastSender &&
      now - this.lastCueAt < 4000;

    this.urgency = repeated
      ? Math.min(this.urgency + 1, 3)
      : 1;

    this.lastCue = text;
    this.lastSender = message.sender;
    this.lastCueAt = now;

    this.cueText = text;
    this.sender = message.sender.split('_').join(' ');

    // Cancel the previous timer so an earlier cue cannot
    // hide a newer one.
    if (this.cueTimer) {
      clearTimeout(this.cueTimer);
    }

    const duration = Math.min(
      4000,
      expiresAt - now
    );

    this.cueTimer = setTimeout(() => {
      this.cueText = '';
      this.sender = '';
      this.urgency = 1;
    }, duration);
  }

  private messageText(message: Message): string {
    const content = message.content;

    if (content.key) {
      return content.key === '?'
        ? 'WHAT KEY?'
        : `KEY: ${content.key}`;
    }

    if (content.direction) {
      return String(content.direction).toUpperCase();
    }

    return (
      content.instruction ||
      content.text ||
      content.request ||
      ''
    );
  }

  private updateCountdown(): void {
    const endingAt = this.songs.endingAt$.value;

    this.remaining = endingAt === null
      ? null
      : Math.max(
        0,
        Math.ceil((endingAt - Date.now()) / 1000)
      );
  }
}
