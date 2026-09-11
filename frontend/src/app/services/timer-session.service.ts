import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TimerSessionResponse {
  id: number;
  timerConfig: TimerConfigResponse | null;
  configName?: string | null;
  startedAt?: string | null;
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
        this.mergeIncomingSessions(data || []);
      })
    );
  }

  private mergeIncomingSessions(incoming: TimerSessionResponse[]): void {
    const current = this.sessionsSignal();
    const currentMap = new Map<number, TimerSessionResponse>();
    current.forEach(s => currentMap.set(s.id, s));

    const merged: TimerSessionResponse[] = incoming.map(inc => {
      const existing = currentMap.get(inc.id);
      if (!existing) {
        return inc;
      }
      currentMap.delete(inc.id);

      let status = inc.status;
      let finishedAt = inc.finishedAt;
      if (existing.status === 'CANCELLED' || existing.status === 'FINISHED') {
        if (inc.status === 'RUNNING_WORK' || inc.status === 'PAUSED_WORK') {
          status = existing.status;
          finishedAt = existing.finishedAt || inc.finishedAt || new Date().toISOString();
        }
      }

      const incSec = this.parseIsoToSeconds(inc.workedDuration);
      const existSec = this.parseIsoToSeconds(existing.workedDuration);
      const bestSec = Math.max(incSec, existSec);

      return {
        ...inc,
        configName: inc.configName || existing.configName,
        startedAt: inc.startedAt || existing.startedAt || inc.currentStartTime || existing.currentStartTime,
        status,
        finishedAt,
        workedDuration: this.secondsToIso(bestSec)
      };
    });

    currentMap.forEach(unsyncedLocal => {
      merged.push(unsyncedLocal);
    });

    this.sessionsSignal.set(merged);
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

    const now = new Date();

    const newSession: TimerSessionResponse = {
      id: Date.now(),
      timerConfig: selectedConfig,
      configName: selectedConfig ? selectedConfig.name : 'Standard Pomodoro',
      startedAt: now.toISOString(),
      currentStartTime: now.toISOString(),
      status: 'RUNNING_WORK',
      workedDuration: 'PT0S',
      finishedAt: null
    };

    const sessions = this.getGuestSessions();
    sessions.push(newSession);
    this.saveGuestSessions(sessions);
    this.sessionsSignal.set(sessions);
    return newSession;
  }

  pauseTimer(sessionId: number, workedSeconds?: number): Observable<TimerSessionResponse> {
    this.optimisticUpdate(sessionId, 'PAUSED_WORK', workedSeconds);

    if (this.isLoggedIn()) {
      const url = workedSeconds !== undefined 
        ? `${this.apiUrl}/${sessionId}/pause?workedSeconds=${workedSeconds}`
        : `${this.apiUrl}/${sessionId}/pause`;
      return this.http.post<TimerSessionResponse>(url, {}).pipe(
        tap(updated => this.updateSessionInSignal(updated)),
        catchError(() => of(this.pauseGuestTimer(sessionId, workedSeconds)))
      );
    }

    return of(this.pauseGuestTimer(sessionId, workedSeconds));
  }

  private pauseGuestTimer(sessionId: number, workedSeconds?: number): TimerSessionResponse {
    const sessions = this.getGuestSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      if (workedSeconds !== undefined) {
        session.workedDuration = this.secondsToIso(Math.max(0, workedSeconds));
      } else {
        this.addWorkedTime(session, new Date());
      }
      session.status = 'PAUSED_WORK';
      this.saveGuestSessions(sessions);
      this.sessionsSignal.set(sessions);
      return session;
    }
    return session!;
  }

  continueTimer(sessionId: number): Observable<TimerSessionResponse> {
    this.optimisticUpdate(sessionId, 'RUNNING_WORK');

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

  finishTimer(sessionId: number, workedSeconds?: number): Observable<TimerSessionResponse> {
    this.optimisticUpdate(sessionId, 'FINISHED', workedSeconds);

    if (this.isLoggedIn()) {
      const url = workedSeconds !== undefined 
        ? `${this.apiUrl}/${sessionId}/finish?workedSeconds=${workedSeconds}`
        : `${this.apiUrl}/${sessionId}/finish`;
      return this.http.post<TimerSessionResponse>(url, {}).pipe(
        tap(updated => this.updateSessionInSignal(updated)),
        catchError(() => of(this.finishGuestTimer(sessionId, workedSeconds)))
      );
    }

    return of(this.finishGuestTimer(sessionId, workedSeconds));
  }

  private finishGuestTimer(sessionId: number, workedSeconds?: number): TimerSessionResponse {
    const sessions = this.getGuestSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      const now = new Date();
      if (workedSeconds !== undefined) {
        session.workedDuration = this.secondsToIso(Math.max(0, workedSeconds));
      } else if (session.status === 'RUNNING_WORK') {
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

  cancelTimer(sessionId: number, workedSeconds?: number): Observable<TimerSessionResponse> {
    this.optimisticUpdate(sessionId, 'CANCELLED', workedSeconds);

    if (this.isLoggedIn()) {
      const url = workedSeconds !== undefined 
        ? `${this.apiUrl}/${sessionId}/cancel?workedSeconds=${workedSeconds}`
        : `${this.apiUrl}/${sessionId}/cancel`;
      return this.http.post<TimerSessionResponse>(url, {}).pipe(
        tap(updated => this.updateSessionInSignal(updated)),
        catchError(() => of(this.cancelGuestTimer(sessionId, workedSeconds)))
      );
    }

    return of(this.cancelGuestTimer(sessionId, workedSeconds));
  }

  private cancelGuestTimer(sessionId: number, workedSeconds?: number): TimerSessionResponse {
    const sessions = this.getGuestSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      const now = new Date();
      if (workedSeconds !== undefined) {
        session.workedDuration = this.secondsToIso(Math.max(0, workedSeconds));
      } else if (session.status === 'RUNNING_WORK') {
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

  private optimisticUpdate(
    sessionId: number, 
    status: 'RUNNING_WORK' | 'PAUSED_WORK' | 'RUNNING_BREAK' | 'FINISHED' | 'CANCELLED',
    workedSeconds?: number
  ): void {
    const list = this.sessionsSignal().map(s => {
      if (s.id === sessionId) {
        const bestWorked = workedSeconds !== undefined 
          ? this.secondsToIso(Math.max(this.parseIsoToSeconds(s.workedDuration), workedSeconds))
          : s.workedDuration;
        return {
          ...s,
          status,
          workedDuration: bestWorked,
          finishedAt: (status === 'FINISHED' || status === 'CANCELLED') ? (s.finishedAt || new Date().toISOString()) : s.finishedAt
        };
      }
      return s;
    });
    this.sessionsSignal.set(list);
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
    const list = this.sessionsSignal().map(s => {
      if (s.id === updated.id) {
        const secLocal = this.parseIsoToSeconds(s.workedDuration);
        const secUp = this.parseIsoToSeconds(updated.workedDuration);
        const maxSec = Math.max(secLocal, secUp);
        return {
          ...updated,
          configName: updated.configName || s.configName,
          startedAt: updated.startedAt || s.startedAt || updated.currentStartTime || s.currentStartTime,
          status: (s.status === 'CANCELLED' || s.status === 'FINISHED') ? s.status : updated.status,
          workedDuration: this.secondsToIso(maxSec)
        };
      }
      return s;
    });
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