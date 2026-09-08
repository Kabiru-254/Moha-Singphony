import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

import {
  CurrentSongState,
  MessageService, RecipientRole,
  Song
} from './message.service';

export const MUSICAL_KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F',
  'F#', 'G', 'G#', 'A', 'Bb', 'B'
] as const;

export interface SetlistSong extends Song {
  // Identifies this particular occurrence of a song.
  entryId: string;

  plannedKey: string;
  liveKey: string;
}

export interface SetlistSection {
  id: string;
  name: string;
  songs: SetlistSong[];
}

export interface Setlist {
  id: string;
  name: string;
  date: Date;
  sections: SetlistSection[];

  // Flattened section songs, in their playing order.
  songs: SetlistSong[];

  lastUpdated?: number;
}

export interface LiveServiceSnapshot {
  setlist: Setlist;
  current: CurrentSongState;
  nextOverride: string | null;
  endingAt: number | null;
  ended: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SongService {
  private readonly setlistsSubject =
    new BehaviorSubject<Record<string, Setlist>>({});

  private readonly activeSetlistIdSubject =
    new BehaviorSubject<string | null>(null);

  private readonly activeSetlistSubject =
    new BehaviorSubject<Setlist>(this.emptySetlist());

  private readonly broadcastSetlistIdSubject =
    new BehaviorSubject<string | null>(null);

  private readonly broadcastSetlistSubject =
    new BehaviorSubject<Setlist>(this.emptySetlist());

  // Subjects deliberately have no initial value.
  // Opening a screen must not publish empty defaults to Firebase.
  private readonly setlistsLocalSubject =
    new Subject<Record<string, Setlist>>();

  private readonly activeSetlistLocalSubject =
    new Subject<string | null>();

  private readonly broadcastSetlistLocalSubject =
    new Subject<string | null>();

  readonly liveLocal$ = new Subject<void>();

  readonly endingAt$ =
    new BehaviorSubject<number | null>(null);

  readonly ended$ =
    new BehaviorSubject<boolean>(false);

  readonly setlists$ = this.setlistsSubject.asObservable();

  readonly activeSetlistId$ =
    this.activeSetlistIdSubject.asObservable();

  readonly broadcastSetlistId$ =
    this.broadcastSetlistIdSubject.asObservable();

  readonly setlist$ =
    this.activeSetlistSubject.asObservable();

  readonly broadcastSetlist$ =
    this.broadcastSetlistSubject.asObservable();

  readonly setlistsLocal$ =
    this.setlistsLocalSubject.asObservable();

  // Retained while we replace the existing Firebase transport.
  readonly activeSetlistLocal$ =
    this.activeSetlistLocalSubject.asObservable();

  readonly broadcastSetlistLocal$ =
    this.broadcastSetlistLocalSubject.asObservable();

  nextOverride: string | null = null;

  constructor(private messageService: MessageService) {
    this.messageService.currentSongLocal$.subscribe(() => {
      this.liveLocal$.next();
    });
  }

  // --------------------------------------------------
  // State exchanged with Firebase
  // --------------------------------------------------

  snapshot(): LiveServiceSnapshot {
    return {
      setlist: this.broadcastSetlistSubject.value,
      current: this.currentState(),
      nextOverride: this.nextOverride,
      endingAt: this.endingAt$.value,
      ended: this.ended$.value
    };
  }

  ingestLive(value: LiveServiceSnapshot | null): void {
    const setlist = value?.setlist
      ? this.normalize(value.setlist)
      : this.emptySetlist();

    this.nextOverride = value?.nextOverride ?? null;

    this.broadcastSetlistIdSubject.next(setlist.id || null);
    this.broadcastSetlistSubject.next(setlist);

    this.endingAt$.next(value?.endingAt ?? null);
    this.ended$.next(value?.ended ?? false);

    this.messageService.setCurrentSongStateFromRemote(
      value?.current ?? {
        song: null,
        currentKey: '?',
        tempo: 0,
        isPlaying: false
      }
    );
  }

  setSetlistsFromRemote(
    remoteMap: Record<string, Setlist>
  ): void {
    const normalized: Record<string, Setlist> = {};

    Object.entries(remoteMap || {}).forEach(([id, value]) => {
      normalized[id] = this.normalize(value);
    });

    this.setlistsSubject.next(normalized);
    this.recomputeActiveSetlist();
  }

  setActiveSetlistFromRemote(id: string | null): void {
    this.setActiveSetlist(id, true);
  }

  setBroadcastSetlistFromRemote(id: string | null): void {
    this.setBroadcastSetlist(id, true);
  }

  // --------------------------------------------------
  // Setlist management
  // --------------------------------------------------

  createSetlist(input: {
    name: string;
    date?: Date;
  }): string {
    const id = this.generateId('setlist');

    const setlist = this.normalize({
      id,
      name: input.name.trim(),
      date: input.date ?? new Date(),
      sections: [],
      songs: [],
      lastUpdated: Date.now()
    });

    this.commit({
      ...this.setlistsSubject.value,
      [id]: setlist
    });

    this.setActiveSetlist(id);

    return id;
  }

  updateSetlist(
    id: string,
    patch: Partial<Pick<Setlist, 'name' | 'date' | 'sections'>>
  ): void {
    const current = this.setlistsSubject.value[id];

    if (!current) {
      return;
    }

    const updated = this.normalize({
      ...current,
      ...patch,
      lastUpdated: Date.now()
    });

    this.commit({
      ...this.setlistsSubject.value,
      [id]: updated
    });
  }

  deleteSetlist(id: string): void {
    const map = { ...this.setlistsSubject.value };

    delete map[id];
    this.commit(map);

    if (this.activeSetlistIdSubject.value === id) {
      this.setActiveSetlist(null);
    }

    if (this.broadcastSetlistIdSubject.value === id) {
      this.setBroadcastSetlist(null);
    }
  }

  setActiveSetlist(
    id: string | null,
    silent = false
  ): void {
    this.activeSetlistIdSubject.next(id);
    this.recomputeActiveSetlist();

    if (!silent) {
      this.activeSetlistLocalSubject.next(id);
    }
  }

  // --------------------------------------------------
  // Broadcasting and applying structural edits
  // --------------------------------------------------

  setBroadcastSetlist(
    id: string | null,
    silent = false
  ): void {
    const draft = id
      ? this.setlistsSubject.value[id]
      : null;

    // An empty setlist cannot be broadcast.
    if (id && !draft?.songs.length) {
      return;
    }

    const previous = this.broadcastSetlistSubject.value;

    const applyingLiveChanges =
      !!id && previous.id === id;

    const existingLiveKeys = new Map(
      previous.songs.map(song => [
        song.entryId,
        song.liveKey
      ])
    );

    // Clone the draft so later edits cannot leak into the broadcast.
    const next = draft
      ? this.normalize(structuredClone(draft))
      : this.emptySetlist();

    if (applyingLiveChanges) {
      next.sections.forEach(section => {
        section.songs.forEach(song => {
          // Preserve live keys when applying structural changes.
          const liveKey = existingLiveKeys.get(song.entryId);

          if (liveKey !== undefined) {
            song.liveKey = liveKey;
          }

          song.keys = [song.liveKey];
        });
      });
    }

    if (!applyingLiveChanges) {
      this.nextOverride = null;
    }

    if (
      this.nextOverride &&
      !next.songs.some(song => song.entryId === this.nextOverride)
    ) {
      this.nextOverride = null;
    }

    this.broadcastSetlistIdSubject.next(id);
    this.broadcastSetlistSubject.next(next);

    this.ended$.next(false);
    this.endingAt$.next(null);

    if (silent) {
      return;
    }

    const currentId =
      (this.currentState().song as SetlistSong | null)?.entryId;

    const retainedCurrentSong = applyingLiveChanges
      ? next.songs.find(song => song.entryId === currentId)
      : null;

    if (next.songs.length) {
      // New broadcast: start at the first song.
      // Applying edits: retain the current entry if it still exists.
      this.selectEntry(
        retainedCurrentSong?.entryId ?? next.songs[0].entryId,
        false
      );
    } else {
      // Switch to ad-hoc mode, retaining the current key.
      this.messageService.updateCurrentSong({
        song: null,
        currentSection: '',
        isPlaying: false
      });
    }

    this.liveLocal$.next();
  }

  // --------------------------------------------------
  // Sections
  // --------------------------------------------------

  addSection(setlistId: string, name: string): void {
    const setlist = this.setlistsSubject.value[setlistId];

    if (!setlist || !name.trim()) {
      return;
    }

    this.updateSetlist(setlistId, {
      sections: [
        ...setlist.sections,
        {
          id: this.generateId('section'),
          name: name.trim(),
          songs: []
        }
      ]
    });
  }

  renameSection(
    setlistId: string,
    sectionId: string,
    name: string
  ): void {
    const setlist = this.setlistsSubject.value[setlistId];

    if (!setlist || !name.trim()) {
      return;
    }

    this.updateSetlist(setlistId, {
      sections: setlist.sections.map(section =>
        section.id === sectionId
          ? { ...section, name: name.trim() }
          : section
      )
    });
  }

  removeSection(
    setlistId: string,
    sectionId: string
  ): void {
    const setlist = this.setlistsSubject.value[setlistId];

    if (!setlist) {
      return;
    }

    this.updateSetlist(setlistId, {
      sections: setlist.sections.filter(
        section => section.id !== sectionId
      )
    });
  }

  moveSection(
    setlistId: string,
    sectionId: string,
    direction: -1 | 1
  ): void {
    const setlist = this.setlistsSubject.value[setlistId];

    if (!setlist) {
      return;
    }

    const sections = [...setlist.sections];
    const from = sections.findIndex(
      section => section.id === sectionId
    );
    const to = from + direction;

    if (from < 0 || to < 0 || to >= sections.length) {
      return;
    }

    [sections[from], sections[to]] = [
      sections[to],
      sections[from]
    ];

    this.updateSetlist(setlistId, { sections });
  }

  // --------------------------------------------------
  // Song entries
  // --------------------------------------------------

  addSong(
    setlistId: string,
    sectionId: string,
    input: {
      title: string;
      key: string;
      notes?: string;
      structure?: string[];
    }
  ): void {
    const setlist = this.setlistsSubject.value[setlistId];

    if (!setlist || !input.title.trim()) {
      return;
    }

    const song: SetlistSong = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      entryId: this.generateId('song'),
      title: input.title.trim(),
      keys: [input.key],
      plannedKey: input.key,
      liveKey: input.key,
      tempo: 0,
      notes: input.notes?.trim() || undefined,
      structure: input.structure ?? []
    };

    this.updateSetlist(setlistId, {
      sections: setlist.sections.map(section =>
        section.id === sectionId
          ? {
            ...section,
            songs: [...section.songs, song]
          }
          : section
      )
    });
  }

  updateSong(
    setlistId: string,
    entryId: string,
    patch: Partial<
      Pick<
        SetlistSong,
        'title' | 'plannedKey' | 'liveKey' | 'notes' | 'structure'
      >
    >
  ): void {
    const setlist = this.setlistsSubject.value[setlistId];

    if (!setlist) {
      return;
    }

    this.updateSetlist(setlistId, {
      sections: setlist.sections.map(section => ({
        ...section,
        songs: section.songs.map(song =>
          song.entryId === entryId
            ? {
              ...song,
              ...patch,
              keys: [patch.liveKey ?? song.liveKey]
            }
            : song
        )
      }))
    });
  }

  removeSong(setlistId: string, entryId: string): void {
    const setlist = this.setlistsSubject.value[setlistId];

    if (!setlist) {
      return;
    }

    this.updateSetlist(setlistId, {
      sections: setlist.sections.map(section => ({
        ...section,
        songs: section.songs.filter(
          song => song.entryId !== entryId
        )
      }))
    });
  }

  moveSong(
    setlistId: string,
    sectionId: string,
    entryId: string,
    direction: -1 | 1
  ): void {
    const setlist = this.setlistsSubject.value[setlistId];

    if (!setlist) {
      return;
    }

    const sections = setlist.sections.map(section => {
      if (section.id !== sectionId) {
        return section;
      }

      const songs = [...section.songs];
      const from = songs.findIndex(
        song => song.entryId === entryId
      );
      const to = from + direction;

      if (from < 0 || to < 0 || to >= songs.length) {
        return section;
      }

      [songs[from], songs[to]] = [
        songs[to],
        songs[from]
      ];

      return { ...section, songs };
    });

    this.updateSetlist(setlistId, { sections });
  }

  moveSongToSection(
    setlistId: string,
    entryId: string,
    targetId: string
  ): void {
    const setlist = this.setlistsSubject.value[setlistId];

    const song = setlist?.songs.find(
      entry => entry.entryId === entryId
    );

    if (
      !song ||
      !setlist.sections.some(section => section.id === targetId)
    ) {
      return;
    }

    this.updateSetlist(setlistId, {
      sections: setlist.sections.map(section => ({
        ...section,
        songs: [
          ...section.songs.filter(
            entry => entry.entryId !== entryId
          ),
          ...(section.id === targetId ? [song] : [])
        ]
      }))
    });
  }

  // --------------------------------------------------
  // Current song and up next
  // --------------------------------------------------

  selectEntry(
    entryId: string,
    clearOverride = true
  ): void {
    const found = this.findEntry(
      this.broadcastSetlistSubject.value,
      entryId
    );

    if (!found) {
      return;
    }

    if (clearOverride) {
      this.nextOverride = null;
    }

    this.messageService.updateCurrentSong({
      song: found.song,
      currentKey: found.song.liveKey,
      currentSection: found.section.name,
      isPlaying: true
    });
  }

  setNext(entryId: string | null): void {
    this.nextOverride = entryId;

    this.broadcastSetlistSubject.next(
      this.broadcastSetlistSubject.value
    );

    this.liveLocal$.next();
  }

  getNextSong(): SetlistSong | null {
    const songs = this.broadcastSetlistSubject.value.songs;

    if (this.nextOverride) {
      return songs.find(
        song => song.entryId === this.nextOverride
      ) ?? null;
    }

    const currentId =
      (this.currentState().song as SetlistSong | null)?.entryId;

    const currentIndex = songs.findIndex(
      song => song.entryId === currentId
    );

    return songs[currentIndex + 1] ?? null;
  }

  nextEntry(): void {
    const next = this.getNextSong();

    if (next) {
      this.selectEntry(next.entryId);
    }
  }

  previousEntry(): void {
    const songs = this.broadcastSetlistSubject.value.songs;

    const currentId =
      (this.currentState().song as SetlistSong | null)?.entryId;

    const currentIndex = songs.findIndex(
      song => song.entryId === currentId
    );

    const previous = songs[currentIndex - 1];

    if (previous) {
      this.selectEntry(previous.entryId);
    }
  }

  // --------------------------------------------------
  // Persistent key changes
  // --------------------------------------------------

  setDirectKey(
    key: string,
    sender: RecipientRole = RecipientRole.SONG_LEADER
  ): void {
    this.ended$.next(false);

    const current = this.currentBroadcastEntry();

    if (current) {
      this.updateSong(
        this.broadcastSetlistIdSubject.value!,
        current.song.entryId,
        { liveKey: key }
      );

      this.patchLiveSong(current.song.entryId, key);
    }

    const updatedSong: SetlistSong | null = current
      ? {
        ...current.song,
        liveKey: key,
        keys: [key]
      }
      : null;

    this.messageService.updateCurrentSong(
      {
        currentKey: key,
        ...(updatedSong ? { song: updatedSong } : {})
      },
      sender
    );
  }

  transposeCurrent(step: -1 | 1): void {
    const current = this.currentBroadcastEntry();
    const oldKey = this.currentState().currentKey;
    const newKey = this.transpose(oldKey, step);

    // For example, "?" cannot be transposed.
    if (!newKey) {
      return;
    }

    if (current) {
      const setlistId = this.broadcastSetlistIdSubject.value!;
      const section = current.section;

      const start = section.songs.findIndex(
        song => song.entryId === current.song.entryId
      );

      const songs = [...section.songs];
      const changedKeys = new Map<string, string>();

      // Stop at the first different key.
      // This loop never leaves the current section.
      for (let index = start; index < songs.length; index++) {
        const song = songs[index];

        if (song.liveKey !== oldKey) {
          break;
        }

        songs[index] = {
          ...song,
          liveKey: newKey,
          keys: [newKey]
        };

        changedKeys.set(song.entryId, newKey);
      }

      // Merge only changed keys into the draft.
      // Pending title, notes, order and section edits are preserved.
      const draft = this.setlistsSubject.value[setlistId];

      if (draft) {
        this.updateSetlist(setlistId, {
          sections: draft.sections.map(draftSection => ({
            ...draftSection,
            songs: draftSection.songs.map(song => {
              const key = changedKeys.get(song.entryId);

              return key !== undefined
                ? {
                  ...song,
                  liveKey: key,
                  keys: [key]
                }
                : song;
            })
          }))
        });
      }

      const live = this.broadcastSetlistSubject.value;

      const sections = live.sections.map(liveSection =>
        liveSection.id === section.id
          ? { ...liveSection, songs }
          : liveSection
      );

      this.broadcastSetlistSubject.next(
        this.normalize({ ...live, sections })
      );
    }

    const updatedSong: SetlistSong | null = current
      ? {
        ...current.song,
        liveKey: newKey,
        keys: [newKey]
      }
      : null;

    this.messageService.updateCurrentSong({
      currentKey: newKey,
      ...(updatedSong ? { song: updatedSong } : {})
    });
  }

  // --------------------------------------------------
  // Ending a service
  // --------------------------------------------------

  startEnding(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds < 1) {
      return;
    }

    this.endingAt$.next(Date.now() + seconds * 1000);
    this.liveLocal$.next();
  }

  cancelEnding(): void {
    this.endingAt$.next(null);
    this.liveLocal$.next();
  }

  finishService(): void {
    // Saved setlists remain in setlistsSubject.
    this.setBroadcastSetlist(null);

    this.endingAt$.next(null);
    this.ended$.next(true);

    this.messageService.updateCurrentSong({
      song: null,
      currentKey: '?',
      currentSection: '',
      isPlaying: false
    });
  }

  // --------------------------------------------------
  // Internal helpers
  // --------------------------------------------------

  private currentState(): CurrentSongState {
    return this.messageService.getCurrentSongState();
  }

  private currentBroadcastEntry(): {
    section: SetlistSection;
    song: SetlistSong;
  } | null {
    const entryId =
      (this.currentState().song as SetlistSong | null)?.entryId;

    return entryId
      ? this.findEntry(
        this.broadcastSetlistSubject.value,
        entryId
      )
      : null;
  }

  private findEntry(
    setlist: Setlist,
    entryId: string
  ): {
    section: SetlistSection;
    song: SetlistSong;
  } | null {
    for (const section of setlist.sections) {
      const song = section.songs.find(
        entry => entry.entryId === entryId
      );

      if (song) {
        return { section, song };
      }
    }

    return null;
  }

  private transpose(
    key: string,
    step: number
  ): string | null {
    const index = MUSICAL_KEYS.indexOf(
      key as typeof MUSICAL_KEYS[number]
    );

    if (index < 0) {
      return null;
    }

    return MUSICAL_KEYS[
    (index + step + MUSICAL_KEYS.length) % MUSICAL_KEYS.length
      ];
  }

  private patchLiveSong(
    entryId: string,
    liveKey: string
  ): void {
    const live = this.broadcastSetlistSubject.value;

    const sections = live.sections.map(section => ({
      ...section,
      songs: section.songs.map(song =>
        song.entryId === entryId
          ? {
            ...song,
            liveKey,
            keys: [liveKey]
          }
          : song
      )
    }));

    this.broadcastSetlistSubject.next(
      this.normalize({ ...live, sections })
    );
  }

  private commit(map: Record<string, Setlist>): void {
    this.setlistsSubject.next(map);
    this.recomputeActiveSetlist();

    // Saving a draft does not replace the broadcast snapshot.
    this.setlistsLocalSubject.next(map);
  }

  private recomputeActiveSetlist(): void {
    const activeId = this.activeSetlistIdSubject.value;

    const active = activeId
      ? this.setlistsSubject.value[activeId]
      : null;

    this.activeSetlistSubject.next(
      active ?? this.emptySetlist()
    );
  }

  private normalize(raw: Setlist): Setlist {
    // Compatibility with older flat setlists.
    const sourceSections: SetlistSection[] =
      raw.sections ?? (
        raw.songs?.length
          ? [{
            id: `${raw.id}_section`,
            name: 'Setlist',
            songs: raw.songs
          }]
          : []
      );

    const sections = sourceSections.map(section => ({
      ...section,
      songs: (section.songs ?? []).map((song, index) => {
        const plannedKey =
          song.plannedKey ?? song.keys?.[0] ?? 'C';

        const liveKey =
          song.liveKey ?? song.keys?.[0] ?? plannedKey;

        return {
          ...song,
          entryId:
            song.entryId ??
            `${raw.id}_${section.id}_${song.id}_${index}`,
          plannedKey,
          liveKey,
          keys: [liveKey],
          structure: song.structure ?? []
        };
      })
    }));

    return {
      ...raw,
      date: new Date(raw.date),
      sections,
      songs: sections.flatMap(section => section.songs)
    };
  }

  private emptySetlist(): Setlist {
    return {
      id: '',
      name: '',
      date: new Date(),
      sections: [],
      songs: []
    };
  }

  private generateId(prefix: string): string {
    return (
      `${prefix}_${Date.now().toString(36)}_` +
      Math.random().toString(36).slice(2, 8)
    );
  }
}
