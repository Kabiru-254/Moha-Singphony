import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-role-selection',
  imports: [CommonModule],
  templateUrl: './role-selection.component.html',
  standalone: true,
  styleUrl: './role-selection.component.css'
})
export class RoleSelectionComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {}

  isDarkMode = document.documentElement.classList.contains('dark');

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }

  roles = [
    {
      name: 'Song Leader',
      icon: 'assets/mic.svg',
      route: '/song-leader',
      animation: 'assets/animations/singer.svg',
      description: 'Controls song flow, changes key, and sends real-time cues.',
      devices: 'Phone / Tablet',
      canSendTo: 'Musicians, Sound Team',
      canReceiveFrom: 'Sound Team'
    },
    {
      name: 'Sound Team',
      icon: 'assets/mixer.svg',
      route: '/sound-team',
      animation: 'assets/animations/mixer.svg',
      description: 'Quick command replies and custom messages to specific roles.',
      devices: 'Phone / Tablet',
      canSendTo: 'Song Leader, Musicians',
      canReceiveFrom: 'Song Leader'
    },
    {
      name: 'Musicians',
      icon: 'assets/keys.svg',
      route: '/musician',
      animation: 'assets/animations/pianist.svg',
      description: 'Passive display of current song, key, and structure.',
      devices: 'Large Display (TV/Stage Monitor)',
      canSendTo: 'None',
      canReceiveFrom: 'Song Leader, Sound Team'
    }
  ];

  selectRole(role: any) {
    console.log(`${role.name} selected`);
    this.router.navigate([role.route]);
  }

  getRoleByName(name: string) {
    return this.roles.find(role => role.name === name);
  }
}
