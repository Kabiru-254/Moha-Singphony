import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrentSongState } from '../../../../services/message.service';

@Component({
  selector: 'app-live-control-center',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './live-control-center.component.html',
  styleUrl: './live-control-center.component.css'
})
export class LiveControlCenterComponent {
  state = input.required<CurrentSongState | null>();
  broadcastingCommand = input<string | null>(null);

  transposeDown = output<void>();
  transposeUp = output<void>();
  tempoDown = output<void>();
  tempoUp = output<void>();
  tempoSet = output<number>();
  instruction = output<string>();

  key = computed(() => this.state()?.currentKey || 'C');
  tempo = computed(() => this.state()?.tempo || 100);

  activeInstruction = signal<string | null>(null);
  private tapTimes = signal<number[]>([]);
  private readonly maxTapHistory = 4;
  private readonly minBpm = 40;
  private readonly maxBpm = 240;

  bandInstructions = [
    { label: 'Break It Down', category: 'structure' as const },
    { label: 'Build Up', category: 'structure' as const },
    { label: 'No Drums', category: 'mute' as const },
    { label: 'Keys Only', category: 'mute' as const },
    { label: 'Strings Only', category: 'mute' as const },
    { label: 'Nice Playing', category: 'positive' as const },
  ];

  onTapTempo(): void {
    const now = performance.now();
    const currentTaps = this.tapTimes();
    const recentTaps = currentTaps.length === 0 || now - currentTaps[currentTaps.length - 1] > 2000
      ? [now]
      : [...currentTaps, now].slice(-this.maxTapHistory);

    this.tapTimes.set(recentTaps);

    if (recentTaps.length < 2) return;

    let totalInterval = 0;
    for (let i = 1; i < recentTaps.length; i++) {
      totalInterval += recentTaps[i] - recentTaps[i - 1];
    }
    const averageInterval = totalInterval / (recentTaps.length - 1);
    if (averageInterval <= 0) return;

    const bpm = Math.round(60000 / averageInterval);
    const clampedBpm = Math.max(this.minBpm, Math.min(this.maxBpm, bpm));
    this.tempoSet.emit(clampedBpm);
  }

  onToggleInstruction(label: string): void {
    const current = this.activeInstruction();
    if (current === label) {
      this.activeInstruction.set(null);
    } else {
      this.activeInstruction.set(label);
      this.instruction.emit(label);
    }
  }

  onTempoDown(): void {
    this.tempoDown.emit();
  }

  onTempoUp(): void {
    this.tempoUp.emit();
  }

  onTransposeDown(): void {
    this.transposeDown.emit();
  }

  onTransposeUp(): void {
    this.transposeUp.emit();
  }
}
