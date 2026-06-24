import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ActiveIssue {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  resolved: boolean;
}

@Component({
  selector: 'app-issue-tracker-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './issue-tracker-widget.component.html',
  styleUrl: './issue-tracker-widget.component.css'
})
export class IssueTrackerWidgetComponent {
  issues = input<ActiveIssue[]>([]);
  resolveIssue = output<string>();

  activeIssues = computed(() => this.issues().filter(i => !i.resolved));
  activeCount = computed(() => this.activeIssues().length);

  severityColor(severity: ActiveIssue['severity']): string {
    switch (severity) {
      case 'low': return '#f59e0b';
      case 'medium': return '#f97316';
      case 'high': return '#ef4444';
      default: return '#94a3b8';
    }
  }
}
