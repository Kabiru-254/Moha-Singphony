import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricCardComponent } from '../metric-card/metric-card.component';

@Component({
  selector: 'app-analytics-widget',
  standalone: true,
  imports: [CommonModule, MetricCardComponent],
  templateUrl: './analytics-widget.component.html',
  styleUrl: './analytics-widget.component.css'
})
export class AnalyticsWidgetComponent {
  songsPlayed = input<number>(0);
  averageTempo = input<number>(100);
  responseTimeMs = input<number>(0);
  activeMusicians = input<number>(0);
  messagesSent = input<number>(0);
  songsRemaining = input<number>(0);
}
