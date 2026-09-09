import { Component, OnInit, signal, inject, OnDestroy } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TimerSessionService } from '../../services/timer-session.service';
import { TimerConfigService, TimerConfigResponse } from '../../services/timer-config.service';
import { TimerStateService, SavedTimerState } from '../../services/timer-state.service';

@Component({
  selector: 'app-root-timer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './timer.html',
  styleUrl: './timer.css',
})
export class TimerComponent implements OnInit, OnDestroy {
  private sessionService = inject(TimerSessionService);
  private configService = inject(TimerConfigService);
  private timerStateService = inject(TimerStateService);
  private document = inject(DOCUMENT);

  protected activeTab = signal<'work' | 'break'>('work');
  protected status = signal<'RUNNING' | 'PAUSED' | 'IDLE'>('IDLE');
  protected displayTime = signal('25:00');

  protected currentSessionId: number | null = null;
  private activeConfigId: number | null = null;
  private countdownInterval: any = null;
  private remainingSeconds = 1500;

  private defaultConfig = signal<TimerConfigResponse | null>(null);

  ngOnInit(): void {
    const savedTab = (this.getItem('activeTimerTab') as 'work' | 'break') || 'work';
    this.activeTab.set(savedTab);
    this.updateTheme(savedTab);

    const savedState = this.timerStateService.getTimerState();

    if (savedState && (savedState.status === 'PAUSED' || savedState.remainingSeconds > 0)) {
      this.activeTab.set(savedState.activeTab);
      this.status.set(savedState.status);
      this.remainingSeconds = savedState.remainingSeconds;
      this.currentSessionId = savedState.currentSessionId;
      this.activeConfigId = savedState.activeConfigId;

      this.updateDisplay();
      this.updateTheme(savedState.activeTab);
    } else {
      const cachedWorkSec = this.getItem('cachedWorkSec');
      const cachedBreakSec = this.getItem('cachedBreakSec');

      if (savedTab === 'work' && cachedWorkSec) {
        this.remainingSeconds = parseInt(cachedWorkSec, 10);
      } else if (savedTab === 'break' && cachedBreakSec) {
        this.remainingSeconds = parseInt(cachedBreakSec, 10);
      } else {
        this.remainingSeconds = savedTab === 'work' ? 1500 : 300;
      }

      this.updateDisplay();
    }

    // Configs asynchron im Hintergrund abgleichen
    this.configService.getAll().subscribe({
      next: (configs: TimerConfigResponse[]) => {
        if (configs && configs.length > 0) {
          const savedIdStr = this.getItem('selectedConfigId');
          let targetConfig = configs[0];

          if (savedIdStr) {
            const savedId = parseInt(savedIdStr, 10);
            const found = configs.find(c => c.id === savedId);
            if (found) {
              targetConfig = found;
            } else {
              // Falls die zuvor ausgewählte Config gelöscht wurde:
              this.timerStateService.selectNewConfig(targetConfig);
            }
          }

          this.defaultConfig.set(targetConfig);
          this.activeConfigId = targetConfig.id;
          this.setItem('selectedConfigId', targetConfig.id.toString());

          if (this.status() === 'IDLE' && (!savedState || savedState.status === 'IDLE')) {
            const workSec = this.parseIsoDurationToSeconds(targetConfig.workDuration);
            const breakSec = this.parseIsoDurationToSeconds(targetConfig.breakDuration);

            this.setItem('cachedWorkSec', workSec.toString());
            this.setItem('cachedBreakSec', breakSec.toString());

            this.remainingSeconds = this.activeTab() === 'work' ? workSec : breakSec;
            this.updateDisplay();
          }
        }
      },
      error: (err) => console.error('Configs konnten nicht geladen werden:', err)
    });
  }

  ngOnDestroy(): void {
    this.stopLocalCountdown();

    if (this.status() === 'RUNNING') {
      this.status.set('PAUSED');
      if (this.currentSessionId) {
        const workedSec = this.getWorkedSeconds();
        this.sessionService.pauseTimer(this.currentSessionId, workedSec).subscribe();
      }
    }

    this.persistCurrentState();
  }

  private getWorkedSeconds(): number {
    const config = this.defaultConfig();
    const totalSec = config ? this.parseIsoDurationToSeconds(config.workDuration) : 1500;
    return Math.max(0, totalSec - this.remainingSeconds);
  }

  protected switchTab(tab: 'work' | 'break'): void {
    this.stopLocalCountdown();

    if (this.currentSessionId && this.activeTab() === 'work') {
      const workedSec = this.getWorkedSeconds();
      this.sessionService.cancelTimer(this.currentSessionId, workedSec).subscribe();
      this.currentSessionId = null;
    }

    this.status.set('IDLE');
    this.activeTab.set(tab);

    this.setItem('activeTimerTab', tab);
    this.updateTheme(tab);

    const cachedSec = tab === 'work' ? this.getItem('cachedWorkSec') : this.getItem('cachedBreakSec');

    if (cachedSec) {
      this.remainingSeconds = parseInt(cachedSec, 10);
    } else {
      const config = this.defaultConfig();
      if (config) {
        this.remainingSeconds = tab === 'work'
          ? this.parseIsoDurationToSeconds(config.workDuration)
          : this.parseIsoDurationToSeconds(config.breakDuration);
      } else {
        this.remainingSeconds = tab === 'work' ? 1500 : 300;
      }
    }

    this.updateDisplay();
    this.persistCurrentState();
  }

  protected toggleTimer(): void {
    if (this.status() === 'RUNNING') {
      this.stopLocalCountdown();
      this.status.set('PAUSED');
      if (this.currentSessionId) {
        const workedSec = this.getWorkedSeconds();
        this.sessionService.pauseTimer(this.currentSessionId, workedSec).subscribe();
      }
      this.persistCurrentState();
    } else {
      const previousStatus = this.status();
      this.startLocalCountdown();
      this.status.set('RUNNING');

      if (previousStatus === 'PAUSED' && this.currentSessionId) {
        this.sessionService.continueTimer(this.currentSessionId).subscribe();
      } else if (this.activeConfigId && this.activeTab() === 'work') {
        this.sessionService.startTimer(this.activeConfigId).subscribe({
          next: (res) => {
            this.currentSessionId = res.id;
            this.persistCurrentState();
          }
        });
      }
      this.persistCurrentState();
    }
  }

  protected skipSession(): void {
    this.stopLocalCountdown();

    if (this.currentSessionId && this.activeTab() === 'work') {
      const workedSec = this.getWorkedSeconds();
      this.sessionService.cancelTimer(this.currentSessionId, workedSec).subscribe();
      this.currentSessionId = null;
    }

    const nextTab = this.activeTab() === 'work' ? 'break' : 'work';
    this.switchTab(nextTab);
  }

  private onTimerFinished(): void {
    this.stopLocalCountdown();

    if (this.currentSessionId && this.activeTab() === 'work') {
      const config = this.defaultConfig();
      const totalSec = config ? this.parseIsoDurationToSeconds(config.workDuration) : 1500;
      this.sessionService.finishTimer(this.currentSessionId, totalSec).subscribe();
      this.currentSessionId = null;
    }

    const nextTab = this.activeTab() === 'work' ? 'break' : 'work';
    this.switchTab(nextTab);
  }

  private startLocalCountdown(): void {
    if (this.countdownInterval) return;
    this.countdownInterval = setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
        this.updateDisplay();
      } else {
        this.onTimerFinished();
      }
    }, 1000);
  }

  private stopLocalCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private updateDisplay(): void {
    const minutes = Math.floor(this.remainingSeconds / 60);
    const seconds = this.remainingSeconds % 60;

    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    const displaySeconds = seconds < 10 ? `0${seconds}` : seconds;

    this.displayTime.set(`${displayMinutes}:${displaySeconds}`);
  }

  private persistCurrentState(): void {
    const state: SavedTimerState = {
      status: this.status(),
      activeTab: this.activeTab(),
      remainingSeconds: this.remainingSeconds,
      currentSessionId: this.currentSessionId,
      activeConfigId: this.activeConfigId,
      displayTime: this.displayTime()
    };
    this.timerStateService.saveTimerState(state);
  }

  private parseIsoDurationToSeconds(durationStr: string): number {
    if (!durationStr) return 0;
    if (!durationStr.startsWith('PT')) return (parseInt(durationStr, 10) || 0) * 60;
    const matches = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!matches) return 0;
    return (parseInt(matches[1] || '0', 10) * 3600) +
      (parseInt(matches[2] || '0', 10) * 60) +
      parseInt(matches[3] || '0', 10);
  }

  private getItem(key: string): string | null {
    return this.isBrowser() ? localStorage.getItem(key) : null;
  }

  private setItem(key: string, value: string): void {
    if (this.isBrowser()) localStorage.setItem(key, value);
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  private updateTheme(tab: 'work' | 'break'): void {
    const body = this.document.body;
    if (tab === 'work') {
      body.classList.add('bg-work');
      body.classList.remove('bg-break');
    } else {
      body.classList.add('bg-break');
      body.classList.remove('bg-work');
    }
  }
}