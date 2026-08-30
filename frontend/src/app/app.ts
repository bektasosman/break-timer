import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { AuthService } from './services/auth.service'; // Pfad prüfen

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  public authService = inject(AuthService); // 👈 Macht AuthService im HTML nutzbar
  private router = inject(Router);
  private document = inject(DOCUMENT);

onLogout(): void {
    this.authService.logout(); // Löscht das Token / hebt die Session auf
    this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    const savedTab = localStorage.getItem('activeTimerTab') || 'work';
    const body = this.document.body;

    if (savedTab === 'break') {
      body.classList.add('bg-break');
      body.classList.remove('bg-work');
    } else {
      body.classList.add('bg-work');
      body.classList.remove('bg-break');
    }
  }
}