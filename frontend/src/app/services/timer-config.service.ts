import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Passend zu Ihrem TimerConfigResponse DTO im Backend
export interface TimerConfigResponse {
  id: number;
  name: string;
  workDuration: string;  // Kommt als ISO-8601 Duration String vom Backend (z.B. "PT20M")
  breakDuration: string;
  isDefault: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TimerConfigService {
  private http = inject(HttpClient);
  private apiUrl = 'https://break-timer.onrender.com/config';

  getAll(): Observable<TimerConfigResponse[]> {
    return this.http.get<TimerConfigResponse[]>(this.apiUrl);
  }

  create(config: any): Observable<TimerConfigResponse> {
    return this.http.post<TimerConfigResponse>(this.apiUrl, config);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
