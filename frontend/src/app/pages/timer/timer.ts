import { Component, OnInit, signal, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TimerSessionService } from '../../services/timer-session.service';
import { TimerConfigService, TimerConfigResponse } from '../../services/timer-config.service';

@Component({
  selector: 'app-root-timer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './timer.html',
  styleUrl: './timer.css',
})
export class TimerComponent implements OnInit {
  private sessionService = inject(TimerSessionService);
  private configService = inject(TimerConfigService);
  private document = inject(DOCUMENT);

  protected activeTab = signal<'work' | 'break'>('work');
  protected status = signal<'RUNNING' | 'PAUSED' | 'IDLE'>('IDLE');
  protected displayTime = signal('25:00');

  protected currentSessionId: number | null = null;
  private activeConfigId: number | null = null;
  private countdownInterval: any = null;
  private remainingSeconds = 0;

  private defaultConfig = signal<TimerConfigResponse | null>(null);

  ngOnInit(): void {
    // 1. Welcher Tab war zuletzt aktiv? (Work oder Break)
    const savedTab = (localStorage.getItem('activeTimerTab') as 'work' | 'break') || 'work';
    this.activeTab.set(savedTab);

    // 2. Hintergrundfarbe SOFORT anpassen
    const body = this.document.body;
    if (savedTab === 'work') {
      body.classList.add('bg-work');
      body.classList.remove('bg-break');
    } else {
      body.classList.add('bg-break');
      body.classList.remove('bg-work');
    }

    // 3. SOFORT Sekunden aus dem Cache (aus config.ts) lesen
    const cachedWorkSec = localStorage.getItem('cachedWorkSec');
    const cachedBreakSec = localStorage.getItem('cachedBreakSec');

    if (savedTab === 'work' && cachedWorkSec) {
      this.remainingSeconds = parseInt(cachedWorkSec, 10);
    } else if (savedTab === 'break' && cachedBreakSec) {
      this.remainingSeconds = parseInt(cachedBreakSec, 10);
    } else {
      // Fallback nur falls der Speicher komplett leer ist
      this.remainingSeconds = savedTab === 'work' ? 1500 : 300;
    }

    // Sofort die exakte Zeit zeichnen
    this.updateDisplay();

    // 4. Im Hintergrund die aktuellsten Daten vom Backend abfragen
    this.configService.getAll().subscribe({
      next: (configs: TimerConfigResponse[]) => {
        if (configs && configs.length > 0) {
          const savedIdStr = localStorage.getItem('selectedConfigId');
          let targetConfig = configs[0];

          if (savedIdStr) {
            const savedId = parseInt(savedIdStr, 10);
            const found = configs.find(c => c.id === savedId);
            if (found) targetConfig = found;
          }

          this.defaultConfig.set(targetConfig);
          this.activeConfigId = targetConfig.id;

          // Falls der Timer IDLE ist, Cache und Sekunden mit den Daten vom Backend abgleichen
          if (this.status() === 'IDLE') {
            const workSec = this.parseIsoDurationToSeconds(targetConfig.workDuration);
            const breakSec = this.parseIsoDurationToSeconds(targetConfig.breakDuration);

            localStorage.setItem('cachedWorkSec', workSec.toString());
            localStorage.setItem('cachedBreakSec', breakSec.toString());

            this.remainingSeconds = savedTab === 'work' ? workSec : breakSec;
            this.updateDisplay();
          }
        }
      },
      error: (err) => console.error('Backend nicht erreichbar:', err)
    });
  }

  protected switchTab(tab: 'work' | 'break'): void {
    this.stopLocalCountdown();
    this.status.set('IDLE');
    this.activeTab.set(tab);

    localStorage.setItem('activeTimerTab', tab);

    const body = this.document.body;
    if (tab === 'work') {
      body.classList.add('bg-work');
      body.classList.remove('bg-break');
    } else {
      body.classList.add('bg-break');
      body.classList.remove('bg-work');
    }

    // Beim Tab-Wechsel bevorzugt aus dem Cache lesen
    const cachedSec = tab === 'work' ? localStorage.getItem('cachedWorkSec') : localStorage.getItem('cachedBreakSec');
    
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
  }

  protected toggleTimer(): void {
    if (this.status() === 'RUNNING') {
      this.stopLocalCountdown();
      this.status.set('PAUSED');
      if (this.currentSessionId) {
        this.sessionService.pauseTimer(this.currentSessionId).subscribe();
      }
    } else {
      this.startLocalCountdown();
      this.status.set('RUNNING');

      if (this.status() === 'PAUSED' && this.currentSessionId) {
        this.sessionService.continueTimer(this.currentSessionId).subscribe();
      } else if (this.activeConfigId && this.activeTab() === 'work') {
        this.sessionService.startTimer(this.activeConfigId).subscribe({
          next: (res) => this.currentSessionId = res.id
        });
      }
    }
  }

  protected skipSession(): void {
    if (this.currentSessionId && this.activeTab() === 'work') {
      this.sessionService.finishTimer(this.currentSessionId).subscribe();
    }

    if (this.activeTab() === 'work') {
      this.switchTab('break');
    } else {
      this.switchTab('work');
    }
  }

  private startLocalCountdown(): void {
    if (this.countdownInterval) return;
    this.countdownInterval = setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
        this.updateDisplay();
      } else {
        this.skipSession();
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

  private parseIsoDurationToSeconds(durationStr: string): number {
    if (!durationStr) return 0;
    if (!durationStr.startsWith('PT')) return (parseInt(durationStr, 10) || 0) * 60;
    const matches = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!matches) return 0;
    return (parseInt(matches[1] || '0', 10) * 3600) +
      (parseInt(matches[2] || '0', 10) * 60) +
      parseInt(matches[3] || '0', 10);
  }
}