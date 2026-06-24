import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CommandVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'ghost';

@Component({
  selector: 'app-command-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './command-card.component.html',
  styleUrl: './command-card.component.css'
})
export class CommandCardComponent {
  label = input.required<string>();
  icon = input.required<string>();
  variant = input<CommandVariant>('primary');
  active = input<boolean>(false);
  broadcasting = input<boolean>(false);
  disabled = input<boolean>(false);
  size = input<'sm' | 'md' | 'lg'>('md');
  command = output<void>();

  onClick(): void {
    if (!this.disabled()) {
      this.command.emit();
    }
  }
}
