import { Component } from '@angular/core';

import {
  MessageType,
  RecipientRole
} from '../../services/message.service';

import {
  TeamConsoleComponent,
  TeamCue
} from '../../shared/team-console/team-console.component';

@Component({
  selector: 'app-pianist',
  standalone: true,
  imports: [TeamConsoleComponent],
  template: `
    <app-team-console
      title="Pianist"
      subtitle="Follow the service, confirm the key and stay connected with the team."
      icon="piano"
      [role]="role"
      [canSetKey]="true"
      [cues]="cues"
    ></app-team-console>
  `
})
export class PianistComponent {
  readonly role = RecipientRole.PIANIST;

  readonly cues: TeamCue[] = [
    {
      label: "Can't hear myself",
      group: 'To sound team',
      type: MessageType.SOUND_REQUEST,
      recipients: [RecipientRole.SOUND_TEAM]
    },
    {
      label: "Can't hear song leader",
      group: 'To sound team',
      type: MessageType.SOUND_REQUEST,
      recipients: [RecipientRole.SOUND_TEAM]
    },
    {
      label: "Can't hear vocals",
      group: 'To sound team',
      type: MessageType.SOUND_REQUEST,
      recipients: [RecipientRole.SOUND_TEAM]
    },
    {
      label: 'More keys in monitor',
      group: 'To sound team',
      type: MessageType.SOUND_REQUEST,
      recipients: [RecipientRole.SOUND_TEAM]
    },
    {
      label: 'Less keys in monitor',
      group: 'To sound team',
      type: MessageType.SOUND_REQUEST,
      recipients: [RecipientRole.SOUND_TEAM]
    },
    {
      label: 'Keys signal problem',
      group: 'To sound team',
      type: MessageType.SOUND_REQUEST,
      recipients: [RecipientRole.SOUND_TEAM]
    },
    {
      label: 'OK now',
      group: 'To sound team',
      type: MessageType.SOUND_REQUEST,
      recipients: [RecipientRole.SOUND_TEAM]
    },
    {
      label: 'Ready',
      group: 'To song leader',
      type: MessageType.GENERAL_COMMUNICATION,
      recipients: [RecipientRole.SONG_LEADER]
    },
    {
      label: 'Please confirm next song',
      group: 'To song leader',
      type: MessageType.GENERAL_COMMUNICATION,
      recipients: [RecipientRole.SONG_LEADER]
    },
    {
      label: 'Need a moment',
      group: 'To song leader',
      type: MessageType.GENERAL_COMMUNICATION,
      recipients: [RecipientRole.SONG_LEADER]
    }
  ];
}
