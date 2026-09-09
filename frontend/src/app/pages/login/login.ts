import { Component, inject, signal, OnInit } from '@angular/core';
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
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private document = inject(DOCUMENT);

  email = '';
  password = '';

  errorMessage = signal<string | null>(null);
  isLoading = signal<boolean>(false);

  ngOnInit(): void {
    const body = this.document.body;
    body.classList.remove('bg-config', 'bg-work', 'bg-break', 'bg-register', 'bg-stats');
    body.classList.add('bg-login');
  }

  onLogin(): void {
    if (this.isLoading()) return;

    this.errorMessage.set(null);
    this.isLoading.set(true);

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/timer']);
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Login Fehler:', err);
        this.errorMessage.set('Email oder Passwort ist falsch.');
      }
    });
  }
}