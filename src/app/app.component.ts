import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RealtimeSyncService } from './services/realtime-sync.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'MOHA-Singphony';

  constructor(private realtime: RealtimeSyncService) {}

  async ngOnInit() {
    // Initialize theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' ||
        (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Initialize optional realtime sync from config.json
    await this.realtime.initFromConfig();
  }
}
