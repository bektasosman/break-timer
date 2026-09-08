import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  public authService = inject(AuthService);
  private router = inject(Router);
  private document = inject(DOCUMENT);

  isMobileMenuOpen = signal<boolean>(false);

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  onLogout(): void {
    this.authService.logout();
    this.closeMobileMenu();
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
