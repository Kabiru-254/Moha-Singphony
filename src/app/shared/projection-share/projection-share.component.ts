import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs';

import {
  SongService,
} from '../../services/song.service';

import {
  RealtimeSyncService,
} from '../../services/realtime-sync.service';

@Component({
  selector: 'app-projection-share',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="share-panel">
      <p class="eyebrow">To projection team</p>
      <h2>Share a setlist</h2>

      <p class="description">
        Send a preparation copy without starting the broadcast.
        Save your edits first, then share again whenever needed.
      </p>

      <label>
        Saved setlist

        <select
          [(ngModel)]="selectedId"
          [disabled]="busy || !realtime.canSend"
        >
          <option value="">Choose a setlist</option>

          <option
            *ngFor="let list of lists$ | async"
            [value]="list.id"
            [disabled]="!list.songs.length"
          >
            {{ list.name }} · {{ list.date | date:'mediumDate' }}
          </option>
        </select>
      </label>

      <button
        type="button"
        class="share-button"
        [disabled]="
          !selectedId ||
          busy ||
          !realtime.canSend
        "
        (click)="share()"
      >
        {{ busy ? 'Saving…' : 'Share with projection' }}
      </button>

      <div
        class="shared-copy"
        *ngIf="songs.projectionPreview$ | async as preview"
      >
        <span>Currently shared</span>
        <strong>{{ preview.setlist.name }}</strong>

        <small>
          {{ preview.sharedAt | date:'medium' }}
        </small>

        <button
          type="button"
          class="clear-button"
          [disabled]="busy || !realtime.canSend"
          (click)="clear()"
        >
          Remove shared preview
        </button>
      </div>

      <p class="notice" role="status" *ngIf="notice">
        {{ notice }}
      </p>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      color: #253d33;
    }

    .share-panel {
      padding: 22px;
      border: 1px solid #dce3d6;
      border-radius: 20px;
      background: #fffef9;
    }

    .eyebrow {
      margin: 0 0 8px;
      color: #586c52;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    h2 {
      margin: 0 0 12px;
      font: 600 26px Georgia, serif;
    }

    .description {
      margin: 0 0 18px;
      color: #526354;
      line-height: 1.6;
    }

    label {
      display: grid;
      gap: 8px;
      font-weight: 600;
    }

    select,
    button {
      box-sizing: border-box;
      width: 100%;
      min-height: 48px;
      padding: 12px;
      border: 1px solid #cbd5c5;
      border-radius: 12px;
      font: inherit;
    }

    select {
      background: white;
      color: #253d33;
    }

    button {
      cursor: pointer;
    }

    .share-button {
      margin-top: 12px;
      background: #365341;
      color: white;
      border-color: #365341;
      font-weight: 600;
    }

    .shared-copy {
      display: grid;
      gap: 6px;
      margin-top: 18px;
      padding: 14px;
      border-radius: 12px;
      background: #edf2e6;
    }

    .shared-copy span,
    .shared-copy small {
      color: #526354;
    }

    .clear-button {
      margin-top: 8px;
      background: #fffef9;
      color: #354c3c;
    }

    .notice {
      margin-bottom: 0;
      line-height: 1.5;
    }

    button:disabled,
    select:disabled {
      opacity: .6;
      cursor: not-allowed;
    }

    button:focus-visible,
    select:focus-visible {
      outline: 3px solid #7e956c;
      outline-offset: 3px;
    }
  `],
})
export class ProjectionShareComponent {
  readonly lists$;

  selectedId = '';
  busy = false;
  notice = '';

  constructor(
    public readonly songs: SongService,
    public readonly realtime: RealtimeSyncService
  ) {
    this.lists$ = this.songs.setlists$.pipe(
      map(lists =>
        Object.values(lists).sort(
          (a, b) =>
            b.date.getTime() - a.date.getTime()
        )
      )
    );
  }

  async share(): Promise<void> {
    if (
      this.busy ||
      !this.realtime.canSend ||
      !this.selectedId
    ) {
      return;
    }

    this.busy = true;
    this.notice = '';

    try {
      const shared =
        this.songs.shareSetlistWithProjection(
          this.selectedId
        );

      if (!shared) {
        this.notice =
          'Choose a saved setlist containing at least one song.';
        return;
      }

      await this.realtime.flush();

      this.notice =
        'Setlist saved for projection. Broadcasting has not changed.';
    } catch {
      this.notice =
        'Sharing could not be confirmed. Keep this page open ' +
        'and use Retry in the connection bar.';
    } finally {
      this.busy = false;
    }
  }

  async clear(): Promise<void> {
    if (this.busy || !this.realtime.canSend) {
      return;
    }

    this.busy = true;
    this.notice = '';

    try {
      this.songs.clearProjectionPreview();

      await this.realtime.flush();

      this.notice =
        'Shared preview removed. Broadcasting has not changed.';
    } catch {
      this.notice =
        'Removal could not be confirmed. Keep this page open ' +
        'and use Retry in the connection bar.';
    } finally {
      this.busy = false;
    }
  }
}
