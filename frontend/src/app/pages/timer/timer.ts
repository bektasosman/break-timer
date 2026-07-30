import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TimerSessionService, TimerSessionResponse } from '../../services/timer-session.service';
import { TimerConfigResponse, TimerConfigService } from '../../services/timer-config.service';

@Component({
  selector: 'app-root-timer',
  imports: [RouterLink],
  templateUrl: './timer.html',
  styleUrl: './timer.css',
})
export class TimerComponent implements OnInit {
  private sessionService = inject(TimerSessionService);
  private configService = inject(TimerConfigService);

  // Status hält jetzt exakt die Strings aus Ihrem Java-Enum
  protected status = signal<'RUNNING_WORK' | 'PAUSED_WORK' | 'RUNNING_BREAK' | 'PAUSED_BREAK' | 'FINISHED'>('PAUSED_WORK');
  protected displayTime = signal('00:00');

  private currentSessionId: number | null = null;
  private activeConfigId: number | null = null;

  private countdownInterval: any = null;
  private remainingSeconds = 0;
  private defaultConfig = signal<TimerConfigResponse | null>(null);


  ngOnInit(): void {
    this.configService.getAll().subscribe({
      next: (configs) => {
        if (configs && configs.length > 0) {
          this.defaultConfig.set(configs[0]);
          const config = this.defaultConfig();
          if (config) {
            this.activeConfigId = config.id;
            this.remainingSeconds = this.parseIsoDurationToSeconds(config.workDuration);
            this.updateDisplay();
          }
        }
      },
      error: (err) => console.error('Fehler beim Laden der Konfigurationen:', err)
    });
  }

  protected startTimer(): void {
    // FALL 1: Timer war in der Fokuszeit pausiert -> Einfach fortsetzen
    if (this.status() === 'PAUSED_WORK' && this.currentSessionId) {
      this.startLocalCountdown();
      this.status.set('RUNNING_WORK');

      this.sessionService.continueTimer(this.currentSessionId).subscribe({
        next: (session) => this.status.set(session.status as any)
      });
    }
    // FALL 2: Die Pause wurde vorbereitet und soll JETZT starten
    else if (this.status() === 'PAUSED_BREAK') {
      this.startLocalCountdown();
      this.status.set('RUNNING_BREAK'); // Pause läuft jetzt im UI!

      // Optional: Hier könnten Sie einen Endpunkt im Backend triggern, 
      // falls Sie auch die Pause als eigene Session tracken wollen.
    }
    // FALL 3: Komplett neuer Start der Fokuszeit (aus IDLE oder nach beendeter Pause)
    else if (this.activeConfigId) {
      const config = this.defaultConfig();
      if (config)
        this.remainingSeconds = this.parseIsoDurationToSeconds(config.workDuration);
      this.updateDisplay();

      this.startLocalCountdown();
      this.status.set('RUNNING_WORK');

      this.sessionService.startTimer(this.activeConfigId).subscribe({
        next: (session: TimerSessionResponse) => {
          this.currentSessionId = session.id;
        }
      });
    }
  }


  protected stopTimer(): void {
    if (!this.currentSessionId) return;
    this.stopLocalCountdown();
    this.sessionService.pauseTimer(this.currentSessionId).subscribe({
      next: (session: TimerSessionResponse) => {
        this.status.set(session.status as any); // Setzt den Status auf PAUSED_WORK
      },
      error: (err) => console.error('Fehler beim Pausieren:', err)
    });
  }

  protected finishTimer(): void {
    if (!this.currentSessionId) return;

    // 1. Lokalen Countdown sofort stoppen
    this.stopLocalCountdown();

    const config = this.defaultConfig();

    // 2. Kamen wir aus der Arbeitszeit (WORK)?
    if (this.status() === 'RUNNING_WORK' || this.status() === 'PAUSED_WORK') {
      // Wir wechseln in den Zustand "PAUSE_BEREIT" (Wir nutzen dafür ein neues Label im Signal)
      this.status.set('PAUSED_BREAK'); // Pausen-Modus ist vorbereitet, läuft aber noch nicht

      // Pausenzeit laden (z.B. 5 Min), aber NICHT startLocalCountdown() aufrufen!
      if (config)
        this.remainingSeconds = this.parseIsoDurationToSeconds(config.breakDuration);
      this.updateDisplay();
    } else {
      // Wenn wir schon in der Pause waren und Finish drücken -> Komplett zurück auf Anfang (Arbeit)
      this.status.set('PAUSED_WORK');
      if (config)
        this.remainingSeconds = this.parseIsoDurationToSeconds(config.workDuration);
      this.updateDisplay();
    }

    // 3. Backend im Hintergrund informieren
    this.sessionService.finishTimer(this.currentSessionId).subscribe({
      next: (session: TimerSessionResponse) => {
        console.log('Arbeits-Session erfolgreich beendet.');
      }
    });
  }

  // --- COUNTDOWN LOGIK ---
  private startLocalCountdown(): void {
    if (this.countdownInterval) return;

    this.countdownInterval = setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
        this.updateDisplay();
      } else {
        this.stopLocalCountdown();
        // Hier könnte man automatisch die Pausen-Config laden, 
        // da das Backend über den Scheduler die Session beendet/ändert.
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
    this.displayTime.set(
      `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
    );
  }

  private parseIsoDurationToSeconds(durationStr: string): number {
    if (!durationStr) return 0;
    if (!durationStr.startsWith('PT')) return parseInt(durationStr, 10) || 0;
    const matches = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!matches) return 0;
    return (parseInt(matches[1] || '0', 10) * 3600) +
      (parseInt(matches[2] || '0', 10) * 60) +
      parseInt(matches[3] || '0', 10);
  }
}
