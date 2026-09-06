import { Injectable, inject, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface TimerConfigResponse {
  id: number;
  name: string;
  workDuration: string;
  breakDuration: string;
}

export interface CreateTimerConfigRequest {
  name: string;
  workDuration: string;
  breakDuration: string;
}

@Injectable({
  providedIn: 'root'
})
export class TimerConfigService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/config`;
  private GUEST_CONFIGS_KEY = 'guest_timer_configs';

  private configsSignal = signal<TimerConfigResponse[]>([]);
  public configs = this.configsSignal.asReadonly();

  constructor() {
    effect(() => {
    // Ruft das Signal ab -> Angular registriert die Abhängigkeit
    this.authService.isLoggedIn(); 
    
    // Lädt die Configs neu (Backend für eingeloggt, LocalStorage für Gast)
    this.loadAll().subscribe();
  });
  }

  loadAll(): Observable<TimerConfigResponse[]> {
    const request$ = this.authService.isLoggedIn()
      ? this.http.get<TimerConfigResponse[]>(this.apiUrl)
      : of(this.getGuestConfigs());

    return request$.pipe(
      tap(data => this.configsSignal.set(data || []))
    );
  }

  getAll(): Observable<TimerConfigResponse[]> {
    if (this.authService.isLoggedIn()) {
      return this.http.get<TimerConfigResponse[]>(this.apiUrl);
    }
    return of(this.getGuestConfigs());
  }


  getOne(id: number): Observable<TimerConfigResponse> {
    return this.http.get<TimerConfigResponse>(`${this.apiUrl}/${id}`);
  }

  create(config: CreateTimerConfigRequest): Observable<TimerConfigResponse> {
    if (this.authService.isLoggedIn()) {
      return this.http.post<TimerConfigResponse>(this.apiUrl, config).pipe(
        tap(() => this.loadAll().subscribe())
      )
    }
    const currentConfigs = this.getGuestConfigs();
    const newConfig: TimerConfigResponse = {
      id: Date.now(), // Eindeutige temporäre ID für den Gast
      name: config.name,
      workDuration: config.workDuration,
      breakDuration: config.breakDuration
    };

    currentConfigs.push(newConfig);
    this.saveGuestConfigs(currentConfigs);
    this.configsSignal.set(currentConfigs);
    return of(newConfig);
  }

  update(id: number, config: CreateTimerConfigRequest): Observable<TimerConfigResponse> {
    return this.http.put<TimerConfigResponse>(`${this.apiUrl}/${id}`, config);
  }

  delete(id: number): Observable<void> {
    if (this.authService.isLoggedIn()) {
      return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
        tap(() => this.loadAll().subscribe())
      );
    }

    let currentConfigs = this.getGuestConfigs();
    currentConfigs = currentConfigs.filter(c => c.id !== id);
    this.saveGuestConfigs(currentConfigs);
    this.configsSignal.set(currentConfigs);
    return of(void 0);
  }

  // Wird beim Logout aufgerufen, um Datenlecks zu verhindern
  resetState(): void {
    this.loadAll().subscribe();
  }

  private getGuestConfigs(): TimerConfigResponse[] {
    if (!this.isBrowser()) return [];
    const data = localStorage.getItem(this.GUEST_CONFIGS_KEY);
    if (!data) {
      // Standard-Profil anlegen, falls der Gast die Seite zum ersten Mal besucht
      const defaultConfig: TimerConfigResponse[] = [
        { id: 1, name: 'Standard Pomodoro', workDuration: 'PT25M', breakDuration: 'PT5M' }
      ];
      this.saveGuestConfigs(defaultConfig);
      return defaultConfig;
    }
    return JSON.parse(data);
  }

  private saveGuestConfigs(configs: TimerConfigResponse[]): void {
    if (this.isBrowser()) {
      localStorage.setItem(this.GUEST_CONFIGS_KEY, JSON.stringify(configs));
    }
  }
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }
}