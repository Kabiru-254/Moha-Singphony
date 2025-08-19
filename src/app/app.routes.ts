import { Routes } from '@angular/router';
import {RoleSelectionComponent} from './pages/role-selection/role-selection.component';
import {SongleaderComponent} from './pages/songleader/songleader.component';
import {SonglistCreationComponent} from './pages/songlist-creation/songlist-creation.component';
import {MusiciansComponent} from './pages/musicians/musicians.component';
import {PianistComponent} from './pages/pianist/pianist.component';
import {SoundTeamComponent} from './pages/sound-team/sound-team.component';
import {DeaconXComponent} from './pages/deacon-x/deacon-x.component';

export const routes: Routes = [
  { path: '', redirectTo: 'role-selection', pathMatch: 'full' },
  { path: 'role-selection', component: RoleSelectionComponent },
  { path: 'song-leader', component: SongleaderComponent },
  { path: 'song-list-creation', component: SonglistCreationComponent },
  { path: 'musician', component: MusiciansComponent },
  { path: 'pianist', component: PianistComponent },
  { path: 'sound-team', component: SoundTeamComponent },
  { path: 'deacon', component: DeaconXComponent },
];
