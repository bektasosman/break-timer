import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment'; // 👈 1. Environment importieren

export interface TimerConfigResponse {
  id: number;
  name: string;
  workDuration: string;
  breakDuration: string;
  isDefault: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TimerConfigService {
  private http = inject(HttpClient);
  
  // 👈 2. Dynamische Basis-URL nutzen
  private apiUrl = `${environment.apiUrl}/config`; 

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