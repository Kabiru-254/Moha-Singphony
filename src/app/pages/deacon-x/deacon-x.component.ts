import {TeamConsoleComponent, TeamCue} from '../../shared/team-console/team-console.component';
import {Component} from '@angular/core';
import {MessageType, RecipientRole} from '../../services/message.service';


@Component({
  selector: 'app-deacon-x',
  standalone: true,
  imports: [TeamConsoleComponent],
  templateUrl: './deacon-x.component.html',
  styleUrl: './deacon-x.component.css',
})
export class DeaconXComponent {
  readonly role = RecipientRole.DEACON;

  readonly cues: TeamCue[] = [
    {
      label: 'Please sing one more song',
      group: 'To song leader',
      type: MessageType.SERVICE_COORDINATION,
      recipients: [RecipientRole.SONG_LEADER],
    },
    {
      label: 'Please buy more time',
      group: 'To song leader',
      type: MessageType.SERVICE_COORDINATION,
      recipients: [RecipientRole.SONG_LEADER],
    },
    {
      label: 'Call the pastor as soon as possible',
      group: 'To song leader',
      type: MessageType.SERVICE_COORDINATION,
      recipients: [RecipientRole.SONG_LEADER],
    },
    {
      label: 'The minister is ready',
      group: 'To song leader',
      type: MessageType.SERVICE_COORDINATION,
      recipients: [RecipientRole.SONG_LEADER],
    },
    {
      label: 'Please hold before inviting the minister',
      group: 'To song leader',
      type: MessageType.SERVICE_COORDINATION,
      recipients: [RecipientRole.SONG_LEADER],
    },
    {
      label: 'Prepare the pastor’s microphone',
      group: 'To sound team',
      type: MessageType.SOUND_REQUEST,
      recipients: [RecipientRole.SOUND_TEAM],
    },
    {
      label: 'Check the pastor’s microphone',
      group: 'To sound team',
      type: MessageType.SOUND_REQUEST,
      recipients: [RecipientRole.SOUND_TEAM],
    },
    {
      label: 'The pastor’s microphone has a problem',
      group: 'To sound team',
      type: MessageType.SOUND_REQUEST,
      recipients: [RecipientRole.SOUND_TEAM],
    },
    {
      label: 'Backup microphone needed',
      group: 'To sound team',
      type: MessageType.SOUND_REQUEST,
      recipients: [RecipientRole.SOUND_TEAM],
    },
    {
      label: 'Pastor’s microphone up please',
      group: 'To sound team',
      type: MessageType.SOUND_REQUEST,
      recipients: [RecipientRole.SOUND_TEAM],
    },
    {
      label: 'Pastor’s microphone down please',
      group: 'To sound team',
      type: MessageType.SOUND_REQUEST,
      recipients: [RecipientRole.SOUND_TEAM],
    },
    {
      label: 'Sound is OK now',
      group: 'To sound team',
      type: MessageType.SOUND_REQUEST,
      recipients: [RecipientRole.SOUND_TEAM],
    },
    {
      label: 'Please put water for the minister',
      group: 'To interpreter',
      type: MessageType.SERVICE_COORDINATION,
      recipients: [RecipientRole.INTERPRETER],
    },
  ];

  readonly replyOptions = [
    'Received',
    'On my way',
    'Ready',
    'Please wait',
    'Done',
  ];
}
