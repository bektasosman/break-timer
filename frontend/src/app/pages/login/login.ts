import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private document = inject(DOCUMENT);

  ngOnInit(): void {
     const body = this.document.body;
    body.classList.remove('bg-config', 'bg-work', 'bg-break', 'bg-register');
    body.classList.add('bg-login');
  }

  email = '';
  password = '';

  errorMessage = signal<string | null>(null);

  onLogin(): void {
    this.errorMessage.set(null);

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.router.navigate(['/timer']);
      },
      error: (err) => {
        console.error('Login Fehler:', err);
        // 🟢 Das Signal wird bei falschem Passwort gesetzt:
        this.errorMessage.set('Email oder Passwort ist falsch.');
      }
    });
  }
}