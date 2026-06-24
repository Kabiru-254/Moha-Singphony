import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface RecentAction {
  id: string;
  icon: string;
  label: string;
  timestamp: Date;
  color?: string;
}

@Component({
  selector: 'app-recent-actions-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-actions-widget.component.html',
  styleUrl: './recent-actions-widget.component.css'
})
export class RecentActionsWidgetComponent {
  actions = input<RecentAction[]>([]);
}
