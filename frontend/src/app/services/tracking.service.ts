import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TrackingStatsResponse {
  totalEventsCount: number;
  totalWorkedSecondsAllUsers: number;
  totalFinishedTimers: number;
  totalCancelledTimers: number;
  overallCancellationRate: number;
  peakStartHourFormatted: string;
  mostCancelledConfig: string;
  popularConfigs: { [key: string]: number };
  configCancellationRates: { [key: string]: number };
  hourlyStartDistribution: { [key: string]: number };
  hourlyCancellationRates: { [key: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class TrackingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tracking`;

  // Globaler In-Memory Cache für sofortigen Sync zwischen Stats & Community
  public cachedStats = signal<TrackingStatsResponse | null>(null);

  /**
   * Lädt weltweite aggregierte Tracking-Statistiken.
   * @param forceRefresh Falls false und Daten im Cache liegen, sofort aus Cache liefern
   */
  loadStats(forceRefresh: boolean = false): Observable<TrackingStatsResponse> {
    const current = this.cachedStats();
    if (!forceRefresh && current) {
      return of(current);
    }

    return this.http.get<TrackingStatsResponse>(`${this.apiUrl}/stats`).pipe(
      tap(data => {
        if (data) {
          this.cachedStats.set(data);
        }
      })
    );
  }

  /**
   * Generiert Beispieldaten (Entwickler-/Demo-Endpunkt)
   */
  seedSampleStats(): Observable<TrackingStatsResponse> {
    return this.http.post<TrackingStatsResponse>(`${this.apiUrl}/seed`, {}).pipe(
      tap(data => {
        if (data) {
          this.cachedStats.set(data);
        }
      })
    );
  }

  /**
   * Setzt Statistiken zurück
   */
  resetStats(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reset`, {}).pipe(
      tap(() => {
        this.cachedStats.set(null);
      })
    );
  }
}
