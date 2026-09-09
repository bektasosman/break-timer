import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private document = inject(DOCUMENT);

  email = '';
  password = '';
  confirmPassword = '';

  errorMessage = signal<string | null>(null);
  isLoading = signal<boolean>(false);

  ngOnInit(): void {
    const body = this.document.body;
    body.classList.remove('bg-config', 'bg-work', 'bg-break', 'bg-login', 'bg-stats');
    body.classList.add('bg-register');
  }

  onRegister(): void {
    if (this.isLoading()) return;

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Die Passwörter stimmen nicht überein!');
      return;
    }

    this.errorMessage.set(null);
    this.isLoading.set(true);

    this.authService.register({
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Registrierung Fehler:', err);
        this.errorMessage.set('Registrierung fehlgeschlagen! Bitte überprüfe deine Angaben.');
      }
    });
  }
}