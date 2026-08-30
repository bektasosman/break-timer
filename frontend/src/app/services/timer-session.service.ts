import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment'; // 👈 Environment importieren

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
  
  // 👈 Dynamische Basis-URL nutzen
  private apiUrl = `${environment.apiUrl}/session`;

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