import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { combineLatest, map } from 'rxjs';

import {
  MessageService,
  RecipientRole,
} from '../../services/message.service';

import {
  SetlistSong,
  SongService,
} from '../../services/song.service';

import {
  TeamConsoleComponent,
} from '../../shared/team-console/team-console.component';

@Component({
  selector: 'app-projection-team',
  standalone: true,
  imports: [
    CommonModule,
    TeamConsoleComponent,
  ],
  templateUrl: './projection-team.component.html',
  styleUrl: './projection-team.component.css',
})
export class ProjectionTeamComponent {
  readonly role = RecipientRole.PROJECTION_TEAM;

  readonly allowedRecipients: RecipientRole[] = [
    RecipientRole.SONG_LEADER,
    RecipientRole.DEACON,
    RecipientRole.SOUND_TEAM,
  ];

  readonly vm$;

  constructor(
    songs: SongService,
    messages: MessageService
  ) {
    this.vm$ = combineLatest([
      songs.broadcastSetlist$,
      songs.projectionPreview$,
      messages.currentSong$,
    ]).pipe(
      map(([broadcast, preview, current]) => {
        const live = broadcast.id ? broadcast : null;

        const currentEntry =
          current.song as SetlistSong | null;

        return {
          live,
          preview,
          currentId: live
            ? currentEntry?.entryId ?? null
            : null,
          nextId: live
            ? songs.getNextSong()?.entryId ?? null
            : null,
        };
      })
    );
  }
}
