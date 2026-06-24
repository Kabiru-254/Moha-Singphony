import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface QuickResponse {
  id: string;
  title: string;
  description: string;
  icon: string;
  group: 'communication' | 'volume' | 'troubleshooting';
  message: string;
}

@Component({
  selector: 'app-quick-response-center',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quick-response-center.component.html',
  styleUrl: './quick-response-center.component.css'
})
export class QuickResponseCenterComponent {
  responses = input<QuickResponse[]>([]);
  sendResponse = output<QuickResponse>();

  groupLabels: Record<string, { label: string; icon: string }> = {
    communication: { label: 'Communication', icon: 'chat' },
    volume: { label: 'Volume Adjustments', icon: 'volume_up' },
    troubleshooting: { label: 'Troubleshooting', icon: 'build' }
  };

  groupedResponses() {
    const groups: Record<string, QuickResponse[]> = { communication: [], volume: [], troubleshooting: [] };
    for (const response of this.responses()) {
      groups[response.group] = groups[response.group] || [];
      groups[response.group].push(response);
    }
    return groups;
  }
}
