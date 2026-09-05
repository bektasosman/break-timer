import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router'; // 👈 WICHTIG: Router-Import hinzugefügt
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment'; 

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmationPassword: string;
}

export interface AuthResponse {
  token: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router); // 👈 Router für die Weiterleitung nach dem Logout
  private apiUrl = `${environment.apiUrl}/auth`;

  private TOKEN_KEY = 'auth_token';
  private USER_KEY = 'auth_user';

  // Signals für reaktiven Status in allen Komponenten
  currentUser = signal<string | null>(this.getStoredUser());
  isLoggedIn = signal<boolean>(!!this.getToken());

  register(data: RegisterRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/register`, data, { responseType: 'text' });
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, data).pipe(
      tap(response => {
        localStorage.setItem(this.TOKEN_KEY, response.token);
        localStorage.setItem(this.USER_KEY, response.email);

        this.currentUser.set(response.email);
        this.isLoggedIn.set(true);
      })
    );
  }

  changePassword(data: ChangePasswordRequest): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/change-password`, data);
  }

  logout(): void {
    // 1. Daten aus dem Speicher löschen
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);

    // 2. Signals zurücksetzen (UI aktualisiert sich automatisch)
    this.currentUser.set(null);
    this.isLoggedIn.set(false);

    // 3. User automatisch zur Login-Seite weiterleiten
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private getStoredUser(): string | null {
    return localStorage.getItem(this.USER_KEY);
  }
}