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
      // Reagiere auf Login/Logout Statuswechsel & lade Configs sofort vor
      this.authService.isLoggedIn(); 
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
    if (this.configsSignal().length > 0) {
      return of(this.configsSignal());
    }
    return this.loadAll();
  }

  getOne(id: number): Observable<TimerConfigResponse> {
    const cached = this.configsSignal().find(c => c.id === id);
    if (cached) {
      return of(cached);
    }
    return this.http.get<TimerConfigResponse>(`${this.apiUrl}/${id}`);
  }

  create(config: CreateTimerConfigRequest): Observable<TimerConfigResponse> {
    if (this.authService.isLoggedIn()) {
      return this.http.post<TimerConfigResponse>(this.apiUrl, config).pipe(
        tap(() => this.loadAll().subscribe())
      );
    }
    const currentConfigs = this.getGuestConfigs();
    const newConfig: TimerConfigResponse = {
      id: Date.now(),
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
    return this.http.put<TimerConfigResponse>(`${this.apiUrl}/${id}`, config).pipe(
      tap(() => this.loadAll().subscribe())
    );
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

  resetState(): void {
    this.loadAll().subscribe();
  }

  private getGuestConfigs(): TimerConfigResponse[] {
    if (!this.isBrowser()) return [];
    const data = localStorage.getItem(this.GUEST_CONFIGS_KEY);
    if (!data) {
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
