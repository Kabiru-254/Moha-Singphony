import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  RealtimeSyncService
} from '../../services/realtime-sync.service';
import { DialogService } from '../../services/dialog.service';

import {
  MUSICAL_KEYS,
  Setlist,
  SetlistSection,
  SetlistSong,
  SongService
} from '../../services/song.service';

interface SongForm {
  title: string;
  key: string;
  notes: string;
  structure: string;
}

@Component({
  selector: 'app-songlist-creation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './songlist-creation.component.html',
  styleUrl: './songlist-creation.component.css'
})
export class SonglistCreationComponent implements OnInit, OnDestroy {
  readonly keys = [...MUSICAL_KEYS];

  setlists: Setlist[] = [];
  active: Setlist | null = null;
  broadcastId: string | null = null;

  newTitle = '';
  newSectionName = '';

  songDrafts: Record<string, SongForm> = {};

  editingEntry: string | null = null;
  editDraft: SongForm = this.emptySongForm();

  notice = '';
  saving = false;

  private readonly subscriptions = new Subscription();

  constructor(
    private songs: SongService,
    public realtime: RealtimeSyncService,
    private dialog: DialogService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.songs.setlists$.subscribe(map => {
        this.setlists = Object.values(map).sort(
          (a, b) => b.date.getTime() - a.date.getTime()
        );
      })
    );

    this.subscriptions.add(
      this.songs.setlist$.subscribe(setlist => {
        // Form bindings must not mutate the service's objects.
        this.active = setlist.id
          ? structuredClone(setlist)
          : null;
      })
    );

    this.subscriptions.add(
      this.songs.broadcastSetlistId$.subscribe(id => {
        this.broadcastId = id;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get editingLiveEntry(): boolean {
    if (
      !this.active ||
      !this.editingEntry ||
      this.broadcastId !== this.active.id
    ) {
      return false;
    }

    return this.songs.snapshot().setlist.songs.some(
      song => song.entryId === this.editingEntry
    );
  }

  createSetlist(): void {
    if (!this.realtime.canSend || !this.newTitle.trim()) {
      return;
    }

    this.songs.createSetlist({
      name: this.newTitle.trim(),
      date: new Date()
    });

    this.newTitle = '';
    this.editingEntry = null;
    this.notice = '';
  }

  select(setlist: Setlist): void {
    this.songs.setActiveSetlist(setlist.id);
    this.editingEntry = null;
    this.newSectionName = '';
    this.notice = '';
  }

  saveDetails(): boolean {
    if (!this.active || !this.realtime.canSend) {
      return false;
    }

    const name = this.active.name.trim();

    if (!name) {
      this.notice = 'Enter a setlist title.';
      return false;
    }

    this.songs.updateSetlist(this.active.id, {
      name,
      date: new Date(this.active.date)
    });

    return true;
  }

  updateDate(event: Event): void {
    if (!this.active || !this.realtime.canSend) {
      return;
    }

    const value = (event.target as HTMLInputElement).value;

    if (!value) {
      return;
    }

    const date = new Date(`${value}T12:00:00`);

    if (!Number.isFinite(date.getTime())) {
      return;
    }

    this.songs.updateSetlist(this.active.id, { date });
  }

  async save(): Promise<void> {
    if (!this.saveDetails()) {
      return;
    }

    await this.confirmSave('Setlist saved.');
  }

  async broadcast(): Promise<void> {
    if (
      !this.active?.songs.length ||
      !this.realtime.canSend ||
      !this.saveDetails()
    ) {
      return;
    }

    const applying = this.broadcastId === this.active.id;

    this.songs.setBroadcastSetlist(this.active.id);

    await this.confirmSave(
      applying
        ? 'Live changes applied.'
        : 'Setlist is broadcasting.'
    );
  }

  async deleteSetlist(): Promise<void> {
    if (!this.active || !this.realtime.canSend) {
      return;
    }

    const confirmed = await this.dialog.confirm({
      title: `Delete "${this.active.name}"?`,
      text: 'This cannot be undone.',
      confirmText: 'Delete',
      danger: true
    });

    if (!confirmed) {
      return;
    }

    this.songs.deleteSetlist(this.active.id);
    this.editingEntry = null;
    this.notice = '';
  }

  addSection(): void {
    if (
      !this.active ||
      !this.realtime.canSend ||
      !this.newSectionName.trim()
    ) {
      return;
    }

    this.songs.addSection(
      this.active.id,
      this.newSectionName.trim()
    );

    this.newSectionName = '';
    this.notice = '';
  }

  renameSection(section: SetlistSection, event: Event): void {
    if (!this.active || !this.realtime.canSend) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const name = input.value.trim();

    if (!name) {
      input.value = section.name;
      return;
    }

    this.songs.renameSection(
      this.active.id,
      section.id,
      name
    );

    this.notice = '';
  }

  async removeSection(section: SetlistSection): Promise<void> {
    if (!this.active || !this.realtime.canSend) {
      return;
    }

    const confirmed = await this.dialog.confirm({
      title: `Remove "${section.name}" and its songs?`,
      text: 'This cannot be undone.',
      confirmText: 'Remove',
      danger: true
    });

    if (!confirmed) {
      return;
    }

    this.songs.removeSection(this.active.id, section.id);
    this.editingEntry = null;
    this.notice = '';
  }

  moveSection(
    section: SetlistSection,
    direction: -1 | 1
  ): void {
    if (!this.active || !this.realtime.canSend) {
      return;
    }

    this.songs.moveSection(
      this.active.id,
      section.id,
      direction
    );

    this.notice = '';
  }

  draft(sectionId: string): SongForm {
    return this.songDrafts[sectionId] ??=
      this.emptySongForm();
  }

  addSong(section: SetlistSection): void {
    if (!this.active || !this.realtime.canSend) {
      return;
    }

    const draft = this.draft(section.id);

    if (!draft.title.trim()) {
      return;
    }

    this.songs.addSong(this.active.id, section.id, {
      title: draft.title.trim(),
      key: draft.key,
      notes: draft.notes,
      structure: this.parseStructure(draft.structure)
    });

    this.songDrafts[section.id] = this.emptySongForm();
    this.notice = '';
  }

  editSong(song: SetlistSong): void {
    this.editingEntry = song.entryId;

    this.editDraft = {
      title: song.title,
      key: song.liveKey,
      notes: song.notes || '',
      structure: song.structure.join(', ')
    };
  }

  saveSongEdit(): void {
    if (
      !this.active ||
      !this.editingEntry ||
      !this.realtime.canSend ||
      !this.editDraft.title.trim()
    ) {
      return;
    }

    this.songs.updateSong(
      this.active.id,
      this.editingEntry,
      {
        title: this.editDraft.title.trim(),
        notes: this.editDraft.notes.trim(),
        structure: this.parseStructure(
          this.editDraft.structure
        ),

        // Existing broadcast keys are changed through Live controls.
        // New or non-broadcast entries may be edited here.
        ...(!this.editingLiveEntry
          ? {
            plannedKey: this.editDraft.key,
            liveKey: this.editDraft.key
          }
          : {})
      }
    );

    this.editingEntry = null;
    this.notice = '';
  }

  cancelSongEdit(): void {
    this.editingEntry = null;
  }

  removeSong(entryId: string): void {
    if (!this.active || !this.realtime.canSend) {
      return;
    }

    this.songs.removeSong(this.active.id, entryId);

    if (this.editingEntry === entryId) {
      this.editingEntry = null;
    }

    this.notice = '';
  }

  moveSong(
    section: SetlistSection,
    entryId: string,
    direction: -1 | 1
  ): void {
    if (!this.active || !this.realtime.canSend) {
      return;
    }

    this.songs.moveSong(
      this.active.id,
      section.id,
      entryId,
      direction
    );

    this.notice = '';
  }

  moveTo(entryId: string, sectionId: string): void {
    if (!this.active || !this.realtime.canSend) {
      return;
    }

    this.songs.moveSongToSection(
      this.active.id,
      entryId,
      sectionId
    );

    this.notice = '';
  }

  trackSetlist(_: number, setlist: Setlist): string {
    return setlist.id;
  }

  trackSection(_: number, section: SetlistSection): string {
    return section.id;
  }

  trackSong(_: number, song: SetlistSong): string {
    return song.entryId;
  }

  private async confirmSave(successText: string): Promise<void> {
    this.saving = true;
    this.notice = 'Saving…';

    try {
      await this.realtime.flush();
      this.notice = successText;
    } catch {
      this.notice =
        'Save failed. Keep this window open and use Retry save.';
    } finally {
      this.saving = false;
    }
  }

  private emptySongForm(): SongForm {
    return {
      title: '',
      key: 'C',
      notes: '',
      structure: ''
    };
  }

  private parseStructure(value: string): string[] {
    return value
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);
  }
}
