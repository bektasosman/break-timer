import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TimerSessionService, TimerSessionResponse } from '../../services/timer-session.service';
import { AuthService } from '../../services/auth.service';

export interface DayChartItem {
  dayLabel: string;
  dateLabel: string;
  seconds: number;
  formattedDuration: string;
  percentage: number;
  isToday: boolean;
}

export interface SessionHistoryItem {
  id: number;
  configName: string;
  dateStr: string;
  durationFormatted: string;
  seconds: number;
  status: string;
}

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './stats.html',
  styleUrl: './stats.css'
})
export class StatsComponent implements OnInit, OnDestroy {
  private sessionService = inject(TimerSessionService);
  public authService = inject(AuthService);
  private document = inject(DOCUMENT);

  protected totalWorkedSeconds = signal<number>(0);
  protected todayWorkedSeconds = signal<number>(0);
  protected weekWorkedSeconds = signal<number>(0);
  protected totalSessionsCount = signal<number>(0);

  protected chartData = signal<DayChartItem[]>([]);
  protected sessionHistory = signal<SessionHistoryItem[]>([]);
  protected isLoading = signal<boolean>(false);

  constructor() {
    effect(() => {
      const sessions = this.sessionService.sessions();
      this.processSessions(sessions || []);
    });
  }

  ngOnInit(): void {
    const body = this.document.body;
    body.classList.add('bg-stats');
    body.classList.remove('bg-work', 'bg-break', 'bg-config', 'bg-login', 'bg-register');

    if (this.sessionService.sessions().length === 0) {
      this.isLoading.set(true);
    }

    this.sessionService.loadAll().subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false)
    });
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('bg-stats');
  }

  private processSessions(sessions: TimerSessionResponse[]): void {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const dayOfWeek = (now.getDay() + 6) % 7;
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - dayOfWeek);

    let totalSeconds = 0;
    let todaySeconds = 0;
    let weekSeconds = 0;

    const historyItems: SessionHistoryItem[] = [];
    const last7DaysMap = new Map<string, number>();
    const dayList: { date: Date; key: string }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      const key = this.getDateKey(d);
      last7DaysMap.set(key, 0);
      dayList.push({ date: d, key });
    }

    sessions.forEach(s => {
      const workedSec = this.parseIsoToSeconds(s.workedDuration);
      totalSeconds += workedSec;

      const sessionDate = s.finishedAt ? new Date(s.finishedAt) : (s.currentStartTime ? new Date(s.currentStartTime) : null);

      if (sessionDate) {
        if (sessionDate >= todayStart) {
          todaySeconds += workedSec;
        }
        if (sessionDate >= weekStart) {
          weekSeconds += workedSec;
        }

        const key = this.getDateKey(sessionDate);
        if (last7DaysMap.has(key)) {
          last7DaysMap.set(key, (last7DaysMap.get(key) || 0) + workedSec);
        }

        historyItems.push({
          id: s.id,
          configName: s.timerConfig?.name || 'Pomodoro Session',
          dateStr: this.formatDateTime(sessionDate),
          durationFormatted: this.formatSeconds(workedSec),
          seconds: workedSec,
          status: s.status === 'FINISHED' ? 'Abgeschlossen' : (s.status === 'PAUSED_WORK' ? 'Pausiert' : 'Laufend')
        });
      }
    });

    historyItems.reverse();

    const maxSec = Math.max(...Array.from(last7DaysMap.values()), 1800);
    const chartItems: DayChartItem[] = dayList.map(item => {
      const sec = last7DaysMap.get(item.key) || 0;
      const isToday = item.key === this.getDateKey(now);
      const weekdayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
      return {
        dayLabel: weekdayNames[item.date.getDay()],
        dateLabel: `${this.padZero(item.date.getDate())}.${this.padZero(item.date.getMonth() + 1)}.`,
        seconds: sec,
        formattedDuration: this.formatSecondsCompact(sec),
        percentage: maxSec > 0 ? Math.min(100, Math.round((sec / maxSec) * 100)) : 0,
        isToday
      };
    });

    this.totalWorkedSeconds.set(totalSeconds);
    this.todayWorkedSeconds.set(todaySeconds);
    this.weekWorkedSeconds.set(weekSeconds);
    this.totalSessionsCount.set(sessions.length);
    this.chartData.set(chartItems);
    this.sessionHistory.set(historyItems);
  }

  protected clearStats(): void {
    if (confirm('Möchtest du die Historie und alle Statistiken wirklich zurücksetzen?')) {
      this.sessionService.clearAllSessions().subscribe({
        next: () => {
          this.processSessions([]);
        },
        error: (err) => {
          console.error('Fehler beim Löschen des Verlaufs:', err);
          const detailMsg = err?.status === 401
            ? 'Deine Sitzung ist abgelaufen. Bitte logge dich erneut ein.'
            : err?.error?.message || err?.message || 'Unbekannter Fehler';
          alert(`Verlauf konnte nicht gelöscht werden: ${detailMsg}`);
        }
      });
    }
  }

  protected formatSeconds(totalSeconds: number): string {
    if (!totalSeconds || totalSeconds <= 0) return '0 Min.';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours} Std. ${minutes}m${seconds > 0 ? ' ' + seconds + 's' : ''}`;
    }
    if (minutes > 0) {
      return `${minutes} Min.${seconds > 0 ? ' ' + seconds + 's' : ''}`;
    }
    return `${seconds} Sek.`;
  }

  protected formatSecondsCompact(totalSeconds: number): string {
    if (!totalSeconds || totalSeconds <= 0) return '0m';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    }
    return `${seconds}s`;
  }

  private parseIsoToSeconds(duration: any): number {
    if (!duration) return 0;
    if (typeof duration === 'number') return Math.round(duration);
    if (typeof duration === 'string') {
      if (!duration.startsWith('PT')) {
        const parsed = parseFloat(duration);
        return isNaN(parsed) ? 0 : Math.round(parsed);
      }
      const match = duration.match(/PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/i);
      if (!match) return 0;
      const hours = parseFloat(match[1] || '0');
      const minutes = parseFloat(match[2] || '0');
      const seconds = parseFloat(match[3] || '0');
      return Math.round(hours * 3600 + minutes * 60 + seconds);
    }
    return 0;
  }

  private getDateKey(d: Date): string {
    return `${d.getFullYear()}-${this.padZero(d.getMonth() + 1)}-${this.padZero(d.getDate())}`;
  }

  private formatDateTime(d: Date): string {
    const today = new Date();
    const isToday = this.getDateKey(d) === this.getDateKey(today);
    const timeStr = `${this.padZero(d.getHours())}:${this.padZero(d.getMinutes())}`;

    if (isToday) {
      return `Heute, ${timeStr}`;
    }
    return `${this.padZero(d.getDate())}.${this.padZero(d.getMonth() + 1)}., ${timeStr}`;
  }

  private padZero(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
  }
}
