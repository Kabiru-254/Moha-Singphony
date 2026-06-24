import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-app-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-bar.component.html',
  styleUrl: './app-bar.component.css'
})
export class AppBarComponent {
  isDarkMode = input<boolean>(false);
  isLive = true;
  unreadCount = 2;
  toggleTheme = output<void>();
  openNotifications = output<void>();

  onToggleTheme(): void {
    this.toggleTheme.emit();
  }

  onOpenNotifications(): void {
    this.openNotifications.emit();
  }
}
