import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TimerSessionResponse {
  id: number;
  timerConfig: TimerConfigResponse | null;
  currentStartTime: string | null;
  workedDuration: string;
  finishedAt: string | null;
  status: 'RUNNING_WORK' | 'PAUSED_WORK' | 'RUNNING_BREAK' | 'FINISHED' | 'CANCELLED';
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
  private GUEST_SESSIONS_KEY = 'guest_timer_sessions';

  private sessionsSignal = signal<TimerSessionResponse[]>([]);
  public sessions = this.sessionsSignal.asReadonly();

  resetState(): void {
    this.sessionsSignal.set([]);
  }

  private isLoggedIn(): boolean {
    return this.isBrowser() && !!localStorage.getItem('auth_token');
  }

  loadAll(): Observable<TimerSessionResponse[]> {
    const request$ = this.isLoggedIn()
      ? this.http.get<TimerSessionResponse[]>(this.apiUrl).pipe(
          catchError((err) => {
            console.error('Fehler beim Laden der Sessions:', err);
            return of([]);
          })
        )
      : of(this.getGuestSessions());

    return request$.pipe(
      tap(data => {
        this.sessionsSignal.set(data || []);
      })
    );
  }

  getSession(sessionId: number): Observable<TimerSessionResponse | null> {
    const cached = this.sessionsSignal().find(s => s.id === sessionId);
    if (cached) {
      return of(cached);
    }

    if (this.isLoggedIn()) {
      return this.http.get<TimerSessionResponse>(`${this.apiUrl}/${sessionId}`).pipe(
        catchError(() => of(null))
      );
    }

    const session = this.getGuestSessions().find(s => s.id === sessionId);
    return of(session || null);
  }

  getAllSessions(): Observable<TimerSessionResponse[]> {
    if (this.sessionsSignal().length > 0) {
      return of(this.sessionsSignal());
    }
    return this.loadAll();
  }

  startTimer(configId: number): Observable<TimerSessionResponse> {
    if (this.isLoggedIn()) {
      return this.http.post<TimerSessionResponse>(`${this.apiUrl}/${configId}/start`, {}).pipe(
        tap(newSession => {
          this.sessionsSignal.set([...this.sessionsSignal(), newSession]);
        })
      );
    }

    return of(this.startGuestTimer(configId));
  }

  private startGuestTimer(configId: number): TimerSessionResponse {
    const guestConfigs = this.getGuestConfigsFromStorage();
    const selectedConfig = guestConfigs.find(c => c.id === configId) || (guestConfigs.length > 0 ? guestConfigs[0] : null);

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
    return newSession;
  }

  pauseTimer(sessionId: number): Observable<TimerSessionResponse> {
    if (this.isLoggedIn()) {
      return this.http.post<TimerSessionResponse>(`${this.apiUrl}/${sessionId}/pause`, {}).pipe(
        tap(updated => this.updateSessionInSignal(updated))
      );
    }

    return of(this.pauseGuestTimer(sessionId));
  }

  private pauseGuestTimer(sessionId: number): TimerSessionResponse {
    const sessions = this.getGuestSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      const now = new Date();
      session.status = 'PAUSED_WORK';

      this.addWorkedTime(session, now);
      this.saveGuestSessions(sessions);
      this.sessionsSignal.set(sessions);
      return session;
    }
    return session!;
  }

  continueTimer(sessionId: number): Observable<TimerSessionResponse> {
    if (this.isLoggedIn()) {
      return this.http.post<TimerSessionResponse>(`${this.apiUrl}/${sessionId}/continue`, {}).pipe(
        tap(updated => this.updateSessionInSignal(updated))
      );
    }

    return of(this.continueGuestTimer(sessionId));
  }

  private continueGuestTimer(sessionId: number): TimerSessionResponse {
    const sessions = this.getGuestSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      const now = new Date();
      session.status = 'RUNNING_WORK';
      session.currentStartTime = now.toISOString();

      this.saveGuestSessions(sessions);
      this.sessionsSignal.set(sessions);
      return session;
    }
    return session!;
  }

  finishTimer(sessionId: number): Observable<TimerSessionResponse> {
    if (this.isLoggedIn()) {
      return this.http.post<TimerSessionResponse>(`${this.apiUrl}/${sessionId}/finish`, {}).pipe(
        tap(updated => this.updateSessionInSignal(updated))
      );
    }

    return of(this.finishGuestTimer(sessionId));
  }

  private finishGuestTimer(sessionId: number): TimerSessionResponse {
    const sessions = this.getGuestSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      const now = new Date();
      if (session.status === 'RUNNING_WORK') {
        this.addWorkedTime(session, now);
      }
      session.status = 'FINISHED';
      session.finishedAt = now.toISOString();
      this.saveGuestSessions(sessions);
      this.sessionsSignal.set(sessions);
      return session;
    }
    return session!;
  }

  cancelTimer(sessionId: number): Observable<TimerSessionResponse> {
    if (this.isLoggedIn()) {
      return this.http.post<TimerSessionResponse>(`${this.apiUrl}/${sessionId}/cancel`, {}).pipe(
        tap(updated => this.updateSessionInSignal(updated)),
        catchError(() => of(this.cancelGuestTimer(sessionId)))
      );
    }

    return of(this.cancelGuestTimer(sessionId));
  }

  private cancelGuestTimer(sessionId: number): TimerSessionResponse {
    const sessions = this.getGuestSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      const now = new Date();
      if (session.status === 'RUNNING_WORK') {
        this.addWorkedTime(session, now);
      }
      session.status = 'CANCELLED';
      session.finishedAt = now.toISOString();
      this.saveGuestSessions(sessions);
      this.sessionsSignal.set(sessions);
      return session;
    }
    return session!;
  }

  clearAllSessions(): Observable<void> {
    if (this.isLoggedIn()) {
      return this.http.delete<void>(this.apiUrl).pipe(
        tap(() => this.sessionsSignal.set([]))
      );
    }

    this.clearGuestSessions();
    return of(void 0);
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

    const start = new Date(session.currentStartTime).getTime();
    const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - start) / 1000));
    const previousWorkedSeconds = this.parseIsoToSeconds(session.workedDuration);

    const totalWorkedSeconds = previousWorkedSeconds + elapsedSeconds;
    session.workedDuration = this.secondsToIso(totalWorkedSeconds);
  }

  public parseIsoToSeconds(isoDuration: any): number {
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

  public secondsToIso(totalSeconds: number): string {
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
    const sessions: TimerSessionResponse[] = data ? JSON.parse(data) : [];
    return sessions;
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