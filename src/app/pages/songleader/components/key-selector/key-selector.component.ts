import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-key-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './key-selector.component.html',
  styleUrl: './key-selector.component.css'
})
export class KeySelectorComponent {
  keys = input<string[]>(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
  selectedKey = input<string>('C');
  compact = input<boolean>(false);
  selectKey = output<string>();

  onSelect(key: string): void {
    this.selectKey.emit(key);
  }
}
