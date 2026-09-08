import { CommonModule } from '@angular/common';

import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  Router,
  RouterOutlet
} from '@angular/router';

import {
  distinctUntilChanged,
  Subscription
} from 'rxjs';

import {
  RealtimeSyncService
} from './services/realtime-sync.service';

import {
  SongService
} from './services/song.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'MOHA-Singphony';

  private readonly subscriptions = new Subscription();

  private countdownTimer?: ReturnType<typeof setInterval>;

  private finishingService = false;
  private observedClosingCountdown = false;
  private navigatingHome = false;
  private destroyed = false;

  constructor(
    public realtime: RealtimeSyncService,
    private songs: SongService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.restoreTheme();
    this.watchServiceEnding();

    await this.realtime.initFromConfig();

    if (this.destroyed) {
      return;
    }

    // Use the persisted deadline, rather than decrementing a local
    // counter, so refreshing does not restart the countdown.
    this.countdownTimer = setInterval(() => {
      this.checkClosingCountdown();
    }, 250);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.subscriptions.unsubscribe();

    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  }

  private restoreTheme(): void {
    try {
      const savedTheme = localStorage.getItem('theme');

      document.documentElement.classList.toggle(
        'dark',
        savedTheme === 'dark'
      );
    } catch {
      // The app can still run if browser storage is unavailable.
    }
  }

  private watchServiceEnding(): void {
    this.subscriptions.add(
      this.songs.endingAt$.subscribe(endingAt => {
        if (endingAt !== null) {
          this.observedClosingCountdown = true;
        }
      })
    );

    this.subscriptions.add(
      this.songs.ended$
        .pipe(distinctUntilChanged())
        .subscribe(ended => {
          if (
            !ended ||
            !this.observedClosingCountdown ||
            this.navigatingHome
          ) {
            return;
          }

          // Allow finishService() to complete all state changes
          // before flushing the final snapshot to Firebase.
          queueMicrotask(() => {
            if (!this.destroyed) {
              void this.returnHomeAfterSaving();
            }
          });
        })
    );
  }

  private checkClosingCountdown(): void {
    const endingAt = this.songs.endingAt$.value;

    if (
      endingAt === null ||
      Date.now() < endingAt ||
      !this.realtime.canSend ||
      this.finishingService
    ) {
      return;
    }

    this.finishingService = true;

    try {
      // Clears the live broadcast but retains saved setlists.
      // The ended$ subscription handles saving and navigation.
      this.songs.finishService();
    } finally {
      this.finishingService = false;
    }
  }

  private async returnHomeAfterSaving(): Promise<void> {
    if (this.navigatingHome) {
      return;
    }

    this.navigatingHome = true;

    try {
      await this.realtime.flush();

      if (this.destroyed) {
        return;
      }

      await this.router.navigate(
        ['/role-selection'],
        {
          queryParamsHandling: 'preserve'
        }
      );

      this.observedClosingCountdown = false;
    } catch {
      // Keep the current screen open if saving fails.
      // RealtimeSyncService exposes the error for the status bar.
    } finally {
      this.navigatingHome = false;
    }
  }
}
