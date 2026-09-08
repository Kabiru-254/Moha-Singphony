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
  selector: 'app-sound-team',
  standalone: true,
  imports: [TeamConsoleComponent],
  template: `
    <app-team-console
      title="Sound team"
      subtitle="Keep the team heard, respond to requests and signal when everything is ready."
      icon="tune"
      [role]="role"
      [cues]="cues"
      [replyOptions]="replyOptions"
    ></app-team-console>
  `
})
export class SoundTeamComponent {
  readonly role = RecipientRole.SOUND_TEAM;

  readonly cues: TeamCue[] = [
    {
      label: 'All ready',
      group: 'Team readiness',
      type: MessageType.GENERAL_COMMUNICATION,
      recipients: [RecipientRole.ALL]
    },
    {
      label: 'Sound check in progress',
      group: 'Team readiness',
      type: MessageType.GENERAL_COMMUNICATION,
      recipients: [
        RecipientRole.SONG_LEADER,
        RecipientRole.PIANIST
      ]
    },
    {
      label: 'Microphone check please',
      group: 'Sound checks',
      type: MessageType.GENERAL_COMMUNICATION,
      recipients: [RecipientRole.SONG_LEADER]
    },
    {
      label: 'Keys check please',
      group: 'Sound checks',
      type: MessageType.GENERAL_COMMUNICATION,
      recipients: [RecipientRole.PIANIST]
    },
    {
      label: 'Backup microphone ready',
      group: 'Sound checks',
      type: MessageType.GENERAL_COMMUNICATION,
      recipients: [RecipientRole.SONG_LEADER]
    },
    {
      label: 'Please hold — technical issue',
      group: 'Sound checks',
      type: MessageType.GENERAL_COMMUNICATION,
      recipients: [
        RecipientRole.SONG_LEADER,
        RecipientRole.PIANIST
      ]
    }
  ];

  readonly replyOptions = [
    'Checking',
    'Adjusting now',
    'Please check now',
    'Is that better?',
    'Issue resolved',
    'Need a moment'
  ];
}
