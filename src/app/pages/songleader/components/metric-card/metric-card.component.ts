import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type MetricTrend = 'up' | 'down' | 'neutral';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './metric-card.component.html',
  styleUrl: './metric-card.component.css'
})
export class MetricCardComponent {
  label = input.required<string>();
  value = input.required<string | number>();
  icon = input.required<string>();
  trend = input<MetricTrend>('neutral');
  trendValue = input<string>('');
  accent = input<'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'>('primary');
  clickable = input<boolean>(false);
  clicked = output<void>();

  onClick(): void {
    if (this.clickable()) {
      this.clicked.emit();
    }
  }
}
