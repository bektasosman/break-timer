import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TimerSessionService, TimerSessionResponse } from '../../services/timer-session.service';
import { AuthService } from '../../services/auth.service';
import { TimerStateService } from '../../services/timer-state.service';
import { TrackingService, TrackingStatsResponse } from '../../services/tracking.service';

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
  timestamp: number;
  durationFormatted: string;
  seconds: number;
  status: string;
  statusClass: 'finished' | 'cancelled' | 'paused' | 'running';
}

export interface UserModeStats {
  name: string;
  totalCount: number;
  finishedCount: number;
  cancelledCount: number;
  successRate: number;
  percentage: number;
}

export interface CommunityComparison {
  userCancelRate: number;
  communityCancelRate: number;
  diffCancelRate: number; // negative is better (fewer cancels)
  isBetterCancel: boolean;
  communityTotalFinished: number;
  userTotalFinished: number;
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
  private trackingService = inject(TrackingService);
  public authService = inject(AuthService);
  private timerStateService = inject(TimerStateService);
  private document = inject(DOCUMENT);

  // Core KPIs
  protected totalWorkedSeconds = signal<number>(0);
  protected todayWorkedSeconds = signal<number>(0);
  protected weekWorkedSeconds = signal<number>(0);
  protected totalSessionsCount = signal<number>(0);

  // Feature 1: Streak Counter
  protected currentStreakDays = signal<number>(0);

  // Feature 2: Peak-Hour
  protected peakHourLabel = signal<string>('-');

  // Feature 3: Mode Stats
  protected userModeStats = signal<UserModeStats[]>([]);

  // Feature 4: Du vs. Community
  protected communityComparison = signal<CommunityComparison | null>(null);
  protected communityStats = signal<TrackingStatsResponse | null>(null);

  protected chartData = signal<DayChartItem[]>([]);
  protected sessionHistory = signal<SessionHistoryItem[]>([]);
  protected isLoading = signal<boolean>(false);

  constructor() {
    effect(() => {
      const sessions = this.sessionService.sessions();
      const cachedCommunity = this.trackingService.cachedStats();
      if (cachedCommunity) {
        this.communityStats.set(cachedCommunity);
      }
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

    // Load community stats for live benchmark comparison
    this.trackingService.loadStats().subscribe({
      next: (comm) => {
        this.communityStats.set(comm);
        this.updateCommunityComparison();
      },
      error: () => {}
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

    // Distinct dates set for streak calculation
    const activeDatesSet = new Set<string>();

    // Start-hour distribution for peak-hour
    const hourCounts: { [hour: number]: number } = {};

    // Mode counters
    const modeCounts: { [name: string]: { total: number; finished: number; cancelled: number } } = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      const key = this.getDateKey(d);
      last7DaysMap.set(key, 0);
      dayList.push({ date: d, key });
    }

    sessions.forEach(s => {
      const workedSec = this.sessionService.parseIsoToSeconds(s.workedDuration);
      totalSeconds += workedSec;

      const dateRaw = s.startedAt || s.currentStartTime || s.finishedAt || (typeof s.id === 'number' && s.id > 1000000000000 ? s.id : null);
      const sessionDate = dateRaw ? new Date(dateRaw) : new Date();
      const sessionTimestamp = sessionDate.getTime();

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

      if (workedSec > 0 || s.status === 'FINISHED') {
        activeDatesSet.add(key);
      }

      // Track hour
      const hour = sessionDate.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;

      // Track mode
      const modeName = s.configName || s.timerConfig?.name || 'Standard Pomodoro';
      if (!modeCounts[modeName]) {
        modeCounts[modeName] = { total: 0, finished: 0, cancelled: 0 };
      }
      modeCounts[modeName].total++;
      if (s.status === 'FINISHED') {
        modeCounts[modeName].finished++;
      } else if (s.status === 'CANCELLED') {
        modeCounts[modeName].cancelled++;
      }

      let statusLabel = 'Pausiert';
      let statusClass: 'finished' | 'cancelled' | 'paused' | 'running' = 'paused';

      if (s.status === 'FINISHED') {
        statusLabel = 'Abgeschlossen';
        statusClass = 'finished';
      } else if (s.status === 'CANCELLED') {
        statusLabel = 'Abgebrochen';
        statusClass = 'cancelled';
      } else {
        statusLabel = 'Pausiert';
        statusClass = 'paused';
      }

      historyItems.push({
        id: s.id,
        configName: modeName,
        dateStr: this.formatDateTime(sessionDate),
        timestamp: sessionTimestamp,
        durationFormatted: this.formatSeconds(workedSec),
        seconds: workedSec,
        status: statusLabel,
        statusClass
      });
    });

    historyItems.sort((a, b) => b.timestamp - a.timestamp);

    // 1. Calculate Streak
    this.currentStreakDays.set(this.calculateStreak(activeDatesSet));

    // 2. Calculate Peak Hour
    let bestHour = -1;
    let maxHourCount = 0;
    for (let h = 0; h < 24; h++) {
      if ((hourCounts[h] || 0) > maxHourCount) {
        maxHourCount = hourCounts[h];
        bestHour = h;
      }
    }
    if (bestHour >= 0 && maxHourCount > 0) {
      const hStr = bestHour < 10 ? '0' + bestHour : '' + bestHour;
      const nextH = (bestHour + 1) < 10 ? '0' + (bestHour + 1) : '' + (bestHour + 1);
      this.peakHourLabel.set(hStr + ':00 - ' + nextH + ':00');
    } else {
      this.peakHourLabel.set('-');
    }

    // 3. Calculate Mode Stats
    const maxModeCount = Math.max(...Object.values(modeCounts).map(m => m.total), 1);
    const modeList: UserModeStats[] = Object.keys(modeCounts).map(name => {
      const m = modeCounts[name];
      const finished = m.finished;
      const successRate = m.total > 0 ? Math.round((finished / m.total) * 100) : 0;
      return {
        name,
        totalCount: m.total,
        finishedCount: finished,
        cancelledCount: m.cancelled,
        successRate,
        percentage: Math.round((m.total / maxModeCount) * 100)
      };
    });
    modeList.sort((a, b) => b.totalCount - a.totalCount);
    this.userModeStats.set(modeList);

    const maxSec = Math.max(...Array.from(last7DaysMap.values()), 1800);
    const chartItems: DayChartItem[] = dayList.map(item => {
      const sec = last7DaysMap.get(item.key) || 0;
      const isToday = item.key === this.getDateKey(now);
      const weekdayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
      return {
        dayLabel: weekdayNames[item.date.getDay()],
        dateLabel: (item.date.getDate() < 10 ? '0' + item.date.getDate() : '' + item.date.getDate()) + '.' + ((item.date.getMonth() + 1) < 10 ? '0' + (item.date.getMonth() + 1) : '' + (item.date.getMonth() + 1)) + '.',
        seconds: sec,
        formattedDuration: this.formatSecondsCompact(sec),
        percentage: (maxSec > 0 && sec > 0) ? Math.max(5, Math.min(100, Math.round((sec / maxSec) * 100))) : 0,
        isToday
      };
    });

    this.totalWorkedSeconds.set(totalSeconds);
    this.todayWorkedSeconds.set(todaySeconds);
    this.weekWorkedSeconds.set(weekSeconds);
    this.totalSessionsCount.set(sessions.length);
    this.chartData.set(chartItems);
    this.sessionHistory.set(historyItems);

    this.updateCommunityComparison();
  }

  private calculateStreak(activeDates: Set<string>): number {
    if (activeDates.size === 0) return 0;

    const today = new Date();
    const todayKey = this.getDateKey(today);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = this.getDateKey(yesterday);

    let streak = 0;
    let checkDate = new Date(today);

    // If active today, start checking from today. If not yet today, start checking from yesterday.
    if (activeDates.has(todayKey)) {
      checkDate = new Date(today);
    } else if (activeDates.has(yesterdayKey)) {
      checkDate = new Date(yesterday);
    } else {
      return 0;
    }

    while (activeDates.has(this.getDateKey(checkDate))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  }

  private updateCommunityComparison(): void {
    const comm = this.communityStats();
    const history = this.sessionHistory();
    if (!comm || history.length === 0) {
      this.communityComparison.set(null);
      return;
    }

    const totalSessions = history.length;
    const cancelledSessions = history.filter(s => s.statusClass === 'cancelled').length;
    const finishedSessions = history.filter(s => s.statusClass === 'finished').length;
    const userCancelRate = totalSessions > 0 ? Math.round((cancelledSessions / totalSessions) * 100) : 0;
    const communityCancelRate = comm.overallCancellationRate || 0;
    const diff = userCancelRate - communityCancelRate;

    this.communityComparison.set({
      userCancelRate,
      communityCancelRate,
      diffCancelRate: Math.abs(diff),
      isBetterCancel: diff <= 0,
      communityTotalFinished: comm.totalFinishedTimers || 0,
      userTotalFinished: finishedSessions
    });
  }

  protected clearStats(): void {
    this.sessionService.clearAllSessions().subscribe({
      next: () => {
        this.processSessions([]);
      },
      error: (err) => {
        console.error('Fehler beim Löschen des Verlaufs:', err);
      }
    });
    this.timerStateService.clearTimerState();
  }

  protected formatSeconds(totalSeconds: number): string {
    if (!totalSeconds || totalSeconds <= 0) return '0 Min.';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return hours + ' Std. ' + minutes + 'm' + (seconds > 0 ? ' ' + seconds + 's' : '');
    }
    if (minutes > 0) {
      return minutes + ' Min.' + (seconds > 0 ? ' ' + seconds + 's' : '');
    }
    return seconds + ' Sek.';
  }

  protected formatSecondsCompact(totalSeconds: number): string {
    if (!totalSeconds || totalSeconds <= 0) return '0m';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return hours + 'h ' + minutes + 'm';
    }
    if (minutes > 0) {
      return seconds > 0 ? (minutes + 'm ' + seconds + 's') : (minutes + 'm');
    }
    return seconds + 's';
  }

  private getDateKey(d: Date): string {
    return d.getFullYear() + '-' + (d.getMonth() + 1 < 10 ? '0' + (d.getMonth() + 1) : '' + (d.getMonth() + 1)) + '-' + (d.getDate() < 10 ? '0' + d.getDate() : '' + d.getDate());
  }

  private formatDateTime(d: Date): string {
    const today = new Date();
    const isToday = this.getDateKey(d) === this.getDateKey(today);
    const hoursStr = d.getHours() < 10 ? '0' + d.getHours() : '' + d.getHours();
    const minStr = d.getMinutes() < 10 ? '0' + d.getMinutes() : '' + d.getMinutes();
    const timeStr = hoursStr + ':' + minStr;

    if (isToday) {
      return 'Heute, ' + timeStr;
    }
    const dayStr = d.getDate() < 10 ? '0' + d.getDate() : '' + d.getDate();
    const monthStr = (d.getMonth() + 1) < 10 ? '0' + (d.getMonth() + 1) : '' + (d.getMonth() + 1);
    return dayStr + '.' + monthStr + '., ' + timeStr;
  }
}
