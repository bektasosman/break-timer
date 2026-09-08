import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { TimerStateService } from './timer-state.service';
import { TimerConfigService } from './timer-config.service';
import { TimerSessionService } from './timer-session.service';

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
  private router = inject(Router);
  private timerStateService = inject(TimerStateService);
  private timerConfigService = inject(TimerConfigService);
  private timerSessionService = inject(TimerSessionService);

  private apiUrl = `${environment.apiUrl}/auth`;
  private TOKEN_KEY = 'auth_token';
  private USER_KEY = 'auth_user';

  currentUser = signal<string | null>(this.getStoredUser());
  isLoggedIn = signal<boolean>(!!this.getToken());

  register(data: RegisterRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/register`, data, { responseType: 'text' });
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, data).pipe(
      tap(response => {
        this.clearAllAppData();

        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem(this.USER_KEY, response.email);
        }

        this.currentUser.set(response.email);
        this.isLoggedIn.set(true);
      })
    );
  }

  changePassword(data: ChangePasswordRequest): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/change-password`, data);
  }

  logout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    this.clearAllAppData();

    this.currentUser.set(null);
    this.isLoggedIn.set(false);

    this.router.navigate(['/login']);
  }

  public clearAllAppData(): void {
    this.timerStateService.clearTimerState();
    this.timerConfigService.resetState();
    this.timerSessionService.resetState();

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('guest_timer_sessions');
      localStorage.removeItem('guest_timer_configs');
    }
  }

  getToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private getStoredUser(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.USER_KEY);
  }
}