import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TimerSessionResponse {
  id: number;
  status: string;
  workedDuration: string;
  expectedFinishTime: string;
}

@Injectable({
  providedIn: 'root'
})
export class TimerSessionService {
  private http = inject(HttpClient);
  private apiUrl = 'https://break-timer-1.onrender.com/timer-session';

  startTimer(configId: number): Observable<TimerSessionResponse> {
    return this.http.post<TimerSessionResponse>(`${this.apiUrl}/${configId}/start`, {});
  }

  pauseTimer(sessionId: number): Observable<TimerSessionResponse> {
    return this.http.post<TimerSessionResponse>(`${this.apiUrl}/${sessionId}/pause`, {});
  }

  continueTimer(sessionId: number): Observable<TimerSessionResponse> {
    return this.http.post<TimerSessionResponse>(`${this.apiUrl}/${sessionId}/continue`, {});
  }

  finishTimer(sessionId: number): Observable<TimerSessionResponse> {
    return this.http.post<TimerSessionResponse>(`${this.apiUrl}/${sessionId}/finish`, {});
  }
}
