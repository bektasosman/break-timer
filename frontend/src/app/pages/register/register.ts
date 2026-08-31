import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private document = inject(DOCUMENT);

  email = '';
  password = '';
  confirmPassword = '';

  ngOnInit(): void {
    const body = this.document.body;
    body.classList.remove('bg-config', 'bg-work', 'bg-break', 'bg-login');
    body.classList.add('bg-register');
  }


  onRegister(): void {
    if (this.password !== this.confirmPassword) {
      alert('Die Passwörter stimmen nicht überein!');
      return;
    }

    // 🟢 email wird jetzt mit an den AuthService übergeben:
    this.authService.register({
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => {
        alert('Konto erfolgreich erstellt!');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Registrierung Fehler:', err);
        alert('Registrierung fehlgeschlagen!');
      }
    });
  }
}