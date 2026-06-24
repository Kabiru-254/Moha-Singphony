import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-quick-notes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quick-notes.component.html',
  styleUrl: './quick-notes.component.css'
})
export class QuickNotesComponent {
  notes = input<string>('');
  notesChange = output<string>();

  localNotes = signal('');

  onInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.localNotes.set(value);
    this.notesChange.emit(value);
  }
}
