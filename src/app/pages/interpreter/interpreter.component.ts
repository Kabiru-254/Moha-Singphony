import { Component } from '@angular/core';

import {
  MessageType,
  RecipientRole,
} from '../../services/message.service';

import {
  TeamConsoleComponent,
  TeamCue,
} from '../../shared/team-console/team-console.component';

@Component({
  selector: 'app-interpreter',
  standalone: true,
  imports: [TeamConsoleComponent],
  template: `
    <app-team-console
      title="Interpreter"
      subtitle="Follow the service and stay connected with the team."
      icon="translate"
      [role]="role"
      [showServiceContext]="false"
      [copySongLeader]="false"
      [cues]="cues"
      [replyOptions]="replyOptions"
    ></app-team-console>
  `,
})
export class InterpreterComponent {
  readonly role = RecipientRole.INTERPRETER;

  readonly cues: TeamCue[] = [
    {
      label: "Can't hear myself",
      group: 'To sound team',
      type: MessageType.SOUND_REQUEST,
      recipients: [RecipientRole.SOUND_TEAM],
    },
    {
      label: "Can't hear pastor",
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
  ];

  readonly replyOptions = [
    'Received',
    'On my way',
    'Done',
  ];
}
