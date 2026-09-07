import { Injectable, inject, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface TimerSessionResponse {
  id: number;
  timerConfig: TimerConfigResponse;
  currentStartTime: string | null;
  workedDuration: string;
  finishedAt: string | null;
  status: 'RUNNING_WORK' | 'PAUSED_WORK' | 'FINISHED';
}

export interface TimerConfigResponse {
  id: number;
  name: string;
  workDuration: string;
  breakDuration: string;
}

@Injectable({
  providedIn: 'root'
})
export class TimerSessionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/session`;
  private authService = inject(AuthService);  
  private GUEST_SESSIONS_KEY = 'guest_timer_sessions';

  private sessionsSignal = signal<TimerSessionResponse[]>([]);
  public sessions = this.sessionsSignal.asReadonly();

  constructor() {
    effect(() => {
      this.authService.isLoggedIn();
      this.sessionsSignal.set([]); // Vorherige Sessions leeren
      this.loadAll().subscribe();
    });
  }

  loadAll(): Observable<TimerSessionResponse[]> {
    const request$ = this.authService.isLoggedIn()
      ? this.http.get<TimerSessionResponse[]>(this.apiUrl)
      : of(this.getGuestSessions());

    return request$.pipe(
      tap(data => this.sessionsSignal.set(data || []))
    );
  }

  getSession(sessionId: number): Observable<TimerSessionResponse> {
    const cached = this.sessionsSignal().find(s => s.id === sessionId);
    if (cached) {
      return of(cached);
    }

    if (this.authService.isLoggedIn()) {
      return this.http.get<TimerSessionResponse>(`${this.apiUrl}/${sessionId}`);
    }

    const session = this.getGuestSessions().find(s => s.id === sessionId);
    return of(session!);
  }

  getAllSessions(): Observable<TimerSessionResponse[]> {
    if (this.sessionsSignal().length > 0) {
      return of(this.sessionsSignal());
    }
    return this.loadAll();
  }

  startTimer(configId: number): Observable<TimerSessionResponse> {
    if (this.authService.isLoggedIn()) {
      return this.http.post<TimerSessionResponse>(`${this.apiUrl}/${configId}/start`, {}).pipe(
        tap(newSession => {
          this.sessionsSignal.set([...this.sessionsSignal(), newSession]);
        })
      );
    }

    const guestConfigs = this.getGuestConfigsFromStorage();
    const selectedConfig = guestConfigs.find(c => c.id === configId);

    const workDurationStr = selectedConfig ? selectedConfig.workDuration : 'PT25M';
    const workSeconds = this.parseIsoToSeconds(workDurationStr);

    const now = new Date();
    const expectedFinish = new Date(now.getTime() + workSeconds * 1000);

    const newSession: TimerSessionResponse = {
      id: Date.now(),
      timerConfig: selectedConfig,
      status: 'RUNNING_WORK',
      workedDuration: 'PT0S',
      currentStartTime: now.toISOString(),
      finishedAt: expectedFinish.toISOString()
    };

    const sessions = this.getGuestSessions();
    sessions.push(newSession);
    this.saveGuestSessions(sessions);
    this.sessionsSignal.set(sessions);
    return of(newSession);
  }

  pauseTimer(sessionId: number): Observable<TimerSessionResponse> {
    if (this.authService.isLoggedIn()) {
      return this.http.post<TimerSessionResponse>(`${this.apiUrl}/${sessionId}/pause`, {}).pipe(
        tap(updated => this.updateSessionInSignal(updated))
      );
    }

    const sessions = this.getGuestSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      const now = new Date();
      session.status = 'PAUSED_WORK';

      this.addWorkedTime(session, now);
      this.saveGuestSessions(sessions);
      this.sessionsSignal.set(sessions);
      return of(session);
    }
    return of(session!);
  }

  continueTimer(sessionId: number): Observable<TimerSessionResponse> {
    if (this.authService.isLoggedIn()) {
      return this.http.post<TimerSessionResponse>(`${this.apiUrl}/${sessionId}/continue`, {}).pipe(
        tap(updated => this.updateSessionInSignal(updated))
      );
    }

    const sessions = this.getGuestSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      const now = new Date();
      session.status = 'RUNNING_WORK';
      session.currentStartTime = now.toISOString();

      this.saveGuestSessions(sessions);
      this.sessionsSignal.set(sessions);
      return of(session);
    }
    return of(session!);
  }

  finishTimer(sessionId: number): Observable<TimerSessionResponse> {
    if (this.authService.isLoggedIn()) {
      return this.http.post<TimerSessionResponse>(`${this.apiUrl}/${sessionId}/finish`, {}).pipe(
        tap(updated => this.updateSessionInSignal(updated))
      );
    }

    const sessions = this.getGuestSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      const now = new Date();
      if (session.status === 'RUNNING_WORK') {
        this.addWorkedTime(session, now);
      }
      session.status = 'FINISHED';
      this.saveGuestSessions(sessions);
      this.sessionsSignal.set(sessions);
      return of(session);
    }
    return of(session!);
  }

  clearGuestSessions(): void {
    if (this.isBrowser()) {
      localStorage.removeItem(this.GUEST_SESSIONS_KEY);
      this.sessionsSignal.set([]);
    }
  }

  private updateSessionInSignal(updated: TimerSessionResponse): void {
    const list = this.sessionsSignal().map(s => s.id === updated.id ? updated : s);
    this.sessionsSignal.set(list);
  }

  private addWorkedTime(session: TimerSessionResponse, now: Date): void {
    if (!session.currentStartTime) return;

    const start = new Date(session.currentStartTime);
    const elapsedSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
    const previousWorkedSeconds = this.parseIsoToSeconds(session.workedDuration);

    const totalWorkedSeconds = previousWorkedSeconds + elapsedSeconds;
    session.workedDuration = this.secondsToIso(totalWorkedSeconds);
  }

  private parseIsoToSeconds(isoDuration: any): number {
    if (!isoDuration) return 0;
    if (typeof isoDuration === 'number') return Math.round(isoDuration);
    if (typeof isoDuration === 'string') {
      if (!isoDuration.startsWith('PT')) {
        const parsed = parseFloat(isoDuration);
        return isNaN(parsed) ? 0 : Math.round(parsed);
      }
      const match = isoDuration.match(/PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/i);
      if (!match) return 0;
      const hours = parseFloat(match[1] || '0');
      const minutes = parseFloat(match[2] || '0');
      const seconds = parseFloat(match[3] || '0');
      return Math.round(hours * 3600 + minutes * 60 + seconds);
    }
    return 0;
  }

  private secondsToIso(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    let res = 'PT';
    if (hours > 0) res += `${hours}H`;
    if (minutes > 0) res += `${minutes}M`;
    if (seconds > 0 || res === 'PT') res += `${seconds}S`;
    return res;
  }

  private getGuestConfigsFromStorage(): any[] {
    if (!this.isBrowser()) return [];
    const data = localStorage.getItem('guest_timer_configs');
    return data ? JSON.parse(data) : [];
  }

  private getGuestSessions(): TimerSessionResponse[] {
    if (!this.isBrowser()) return [];
    const data = localStorage.getItem(this.GUEST_SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveGuestSessions(sessions: TimerSessionResponse[]): void {
    if (this.isBrowser()) {
      localStorage.setItem(this.GUEST_SESSIONS_KEY, JSON.stringify(sessions));
    }
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }
}
