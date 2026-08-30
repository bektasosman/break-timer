import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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

  email = ''; 
  password = '';
  confirmPassword = '';

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