import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sound-team-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sound-team-header.component.html',
  styleUrl: './sound-team-header.component.css'
})
export class SoundTeamHeaderComponent {
  isDarkMode = input.required<boolean>();
  unreadCount = input<number>(0);

  toggleTheme = output<void>();
  openNotifications = output<void>();

  onToggleTheme(): void {
    this.toggleTheme.emit();
  }

  onOpenNotifications(): void {
    this.openNotifications.emit();
  }
}
