import {Component, OnInit} from '@angular/core';
import {RouterLink} from '@angular/router';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-role-selection',
  imports: [
    RouterLink, CommonModule,
  ],
  templateUrl: './role-selection.component.html',
  standalone: true,
  styleUrl: './role-selection.component.css'
})
export class RoleSelectionComponent implements OnInit {
  ngOnInit(): void {
      throw new Error('Method not implemented.');
  }

  isDarkMode = false;

  roles = [
    { name: 'Song Leader', icon: 'assets/mic.jpg' },
    { name: 'Musician', icon: 'assets/keys.jpg' },
    { name: 'Sound Team', icon: 'assets/sound.jpg' },
    { name: 'Deacon X', icon: 'assets/office.jpg' },
  ];


  selectRole(role: any) {
    console.log(`${role.name} selected`);

  }

}
