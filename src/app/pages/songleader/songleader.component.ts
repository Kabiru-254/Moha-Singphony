import { Component } from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-songleader',
  imports: [
    FormsModule, CommonModule,
  ],
  templateUrl: './songleader.component.html',
  standalone: true,
  styleUrl: './songleader.component.css'
})
export class SongleaderComponent {
  songs: { id: number; name: string }[] = [
    { id: 1, name: 'Amazing Grace' },
    { id: 2, name: 'How Great Thou Art' },
  ];
  currentKey: string = 'C';
  quickCommands: string[] = ['Break it down', 'Keys only', 'No drums', 'Build up'];
  availableTargets: string[] = ['Musicians', 'Sound Team', 'Deacon X'];
  selectedTargets: string[] = [];
  theme: string = 'light';

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', this.theme === 'dark');
  }

  navigateToSongManagement() {
    // Navigate to song management page
    console.log('Navigating to song management page...');
  }

  selectSong(song: { id: number; name: string }) {
    console.log(`Selected song: ${song.name}`);
  }

  transposeKey(step: number) {
    const keys = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
    const currentIndex = keys.indexOf(this.currentKey);
    const newIndex = (currentIndex + step + keys.length) % keys.length;
    this.currentKey = keys[newIndex];
    console.log(`Current Key: ${this.currentKey}`);
  }

  adjustTempo(step: number) {
    console.log(`Adjusting tempo by ${step}`);
    // Show flying button effect (animation handled in CSS)
  }

  sendCommand(command: string) {
    console.log(`Sent command: ${command}`);
  }

}
