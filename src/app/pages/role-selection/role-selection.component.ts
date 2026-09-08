import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  RealtimeSyncService
} from '../../services/realtime-sync.service';

interface RoleOption {
  id: string;
  name: string;
  icon: string;
  route: string;
  description: string;
  device: string;
  primary: boolean;
}

@Component({
  selector: 'app-role-selection',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './role-selection.component.html',
  styleUrl: './role-selection.component.css'
})
export class RoleSelectionComponent implements OnInit {
  roomCode = '';
  error = '';
  copyMessage = '';
  openingRole: string | null = null;

  readonly roles: RoleOption[] = [
    {
      id: 'leader',
      name: 'Song leader',
      icon: 'mic',
      route: '/song-leader',
      description:
        'Prepare the service, guide the songs and communicate with the team.',
      device: 'Phone or tablet',
      primary: true
    },
    {
      id: 'musicians',
      name: 'Musicians display',
      icon: 'piano',
      route: '/musician',
      description:
        'Follow the current key, song and live instructions together.',
      device: 'Shared stage screen',
      primary: true
    },
    {
      id: 'sound',
      name: 'Sound team',
      icon: 'tune',
      route: '/sound-team',
      description:
        'Receive sound requests and communicate with the service team.',
      device: 'Phone or tablet',
      primary: false
    },
    {
      id: 'pianist',
      name: 'Pianist',
      icon: 'music_note',
      route: '/pianist',
      description:
        'Open your individual musician controls and communication screen.',
      device: 'Phone or tablet',
      primary: false
    },
    {
      id: 'deacon',
      name: 'Deacon',
      icon: 'groups',
      route: '/deacon',
      description:
        'Stay connected with the team and help coordinate the service.',
      device: 'Phone or tablet',
      primary: false
    }
  ];

  constructor(public realtime: RealtimeSyncService) {}

  ngOnInit(): void {
    const params = new URLSearchParams(location.search);
    const roomFromLink = params.get('room');

    if (roomFromLink) {
      // Preserve an existing room exactly; Firebase paths are case-sensitive.
      this.roomCode = roomFromLink;
      return;
    }

    try {
      this.roomCode =
        localStorage.getItem('musify:last-room') || '';
    } catch {
      this.roomCode = '';
    }
  }

  get selectedRoom(): string {
    return this.roomCode.trim();
  }

  get validRoom(): boolean {
    return /^[a-zA-Z0-9_-]{1,80}$/.test(this.selectedRoom);
  }

  get invitationLink(): string {
    return this.validRoom
      ? this.buildUrl('/role-selection')
      : '';
  }

  onRoomChanged(): void {
    this.error = '';
    this.copyMessage = '';
  }

  async join(role: RoleOption): Promise<void> {
    if (this.openingRole) {
      return;
    }

    if (!this.validRoom) {
      this.error = this.selectedRoom
        ? 'Use letters, numbers, hyphens or underscores only.'
        : 'Enter your church room code first.';
      return;
    }

    this.error = '';
    this.openingRole = role.id;

    try {
      // Avoid abandoning unconfirmed changes from the current room.
      if (
        this.realtime.pending() > 0 ||
        this.realtime.failed()
      ) {
        await this.realtime.flush();
      }

      try {
        localStorage.setItem(
          'musify:last-room',
          this.selectedRoom
        );
      } catch {
        // Remembering the room is optional.
      }

      // A reload ensures Firebase reconnects to the selected room.
      location.assign(this.buildUrl(role.route));
    } catch {
      this.error =
        'Some changes have not been saved. Resolve the save error before switching rooms.';
      this.openingRole = null;
    }
  }

  async copyInvitation(): Promise<void> {
    if (!this.validRoom) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.invitationLink);
      this.copyMessage = 'Join link copied.';
    } catch {
      this.copyMessage =
        'Select and copy the link shown below.';
    }
  }

  private buildUrl(path: string): string {
    const url = new URL(path, location.origin);
    const currentParams = new URLSearchParams(location.search);

    url.searchParams.set('room', this.selectedRoom);

    // Keep local testing on the emulator when opening another screen.
    if (currentParams.get('backend') === 'emulator') {
      url.searchParams.set('backend', 'emulator');
    }

    return url.toString();
  }
}
