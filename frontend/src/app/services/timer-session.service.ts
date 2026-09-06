import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment'; // 👈 Environment importieren
import { AuthService } from './auth.service';

export interface TimerSessionResponse {
  id: number;
  timerConfig: TimerConfigResponse;
  currentStartTime: string | null; // ISO-8601 Timestamp (z.B. "2026-09-05T12:00:00Z")
  workedDuration: string;          // ISO-8601 Duration (z.B. "PT10M15S")
  finishedAt: string | null;       // ISO-8601 Timestamp
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

  getSession(sessionId: number): Observable<TimerSessionResponse> {
    if (this.authService.isLoggedIn()) {
      return this.http.get<TimerSessionResponse>(`${this.apiUrl}/${sessionId}`);
    }

    const session = this.getGuestSessions().find(s => s.id === sessionId);
    return of(session!);
  }

  getAllSessions(): Observable<TimerSessionResponse[]> {
    if (this.authService.isLoggedIn()) {
      return this.http.get<TimerSessionResponse[]>(this.apiUrl);
    }

    return of(this.getGuestSessions());

  }

  startTimer(configId: number): Observable<TimerSessionResponse> {
    if (this.authService.isLoggedIn()) {
      return this.http.post<TimerSessionResponse>(`${this.apiUrl}/${configId}/start`, {});
    }

    // 1. Gast-Konfigurationen synchron aus dem LocalStorage holen
    const guestConfigs = this.getGuestConfigsFromStorage();
    const selectedConfig = guestConfigs.find(c => c.id === configId);

    // Fallback auf PT25M, falls die ID nicht gefunden wurde
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
    return of(newSession);
  }

  pauseTimer(sessionId: number): Observable<TimerSessionResponse> {
    if (this.authService.isLoggedIn()) {
      return this.http.post<TimerSessionResponse>(`${this.apiUrl}/${sessionId}/pause`, {});
    }

    const sessions = this.getGuestSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      const now = new Date();
      session.status = 'PAUSED_WORK';

      // Gearbeitete Zeit der aktuellen Phase aufsummieren
      this.addWorkedTime(session, now);
      this.saveGuestSessions(sessions);
      return of(session);
    }
    return of(session!);
  }

  continueTimer(sessionId: number): Observable<TimerSessionResponse> {
    if (this.authService.isLoggedIn()) {
      return this.http.post<TimerSessionResponse>(`${this.apiUrl}/${sessionId}/continue`, {});
    }

    const sessions = this.getGuestSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      const now = new Date();
      session.status = 'RUNNING_WORK';
      session.currentStartTime = now.toISOString();

      this.saveGuestSessions(sessions);
      return of(session);
    }
    return of(session!);
  }

  finishTimer(sessionId: number): Observable<TimerSessionResponse> {
    if (this.authService.isLoggedIn()) {
      return this.http.post<TimerSessionResponse>(`${this.apiUrl}/${sessionId}/finish`, {});
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
      return of(session);
    }
    return of(session!);
  }

  private addWorkedTime(session: TimerSessionResponse, now: Date): void {
    if (!session.currentStartTime) return;

    const start = new Date(session.currentStartTime);
    const elapsedSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
    const previousWorkedSeconds = this.parseIsoToSeconds(session.workedDuration);

    const totalWorkedSeconds = previousWorkedSeconds + elapsedSeconds;
    session.workedDuration = this.secondsToIso(totalWorkedSeconds);
  }

  private parseIsoToSeconds(isoDuration: string): number {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
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

  // Hilfsmethode zum synchronen Auslesen der Gast-Configs
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