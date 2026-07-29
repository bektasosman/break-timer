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
  protected status = signal<'RUNNING_WORK' | 'PAUSED_WORK' | 'RUNNING_BREAK' | 'FINISHED' | 'IDLE'>('IDLE');
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
  if (this.status() === 'PAUSED_WORK' && this.currentSessionId) {
    // Fortsetzen: Sofort weiterlaufen lassen
    this.startLocalCountdown();
    this.status.set('RUNNING_WORK');

    this.sessionService.continueTimer(this.currentSessionId).subscribe({
      next: (session) => this.status.set(session.status as any),
      error: (err) => this.rollbackStart('PAUSED_WORK')
    });
  } else if (this.activeConfigId) {
    // Komplett NEUER Start:
    // 1. UI sofort auf 25 Minuten zurücksetzen (falls vorher gefinisht wurde)
    const config = this.defaultConfig();
    if(config)
    this.remainingSeconds = this.parseIsoDurationToSeconds(config.workDuration);
    this.updateDisplay();

    // 2. Countdown sofort visuell starten!
    this.startLocalCountdown();
    this.status.set('RUNNING_WORK');

    // 3. Im Hintergrund die Session in Spring Boot erstellen
    this.sessionService.startTimer(this.activeConfigId).subscribe({
      next: (session: TimerSessionResponse) => {
        // Die echte Session ID vom Server im Nachhinein einspeichern
        this.currentSessionId = session.id;
      },
      error: (err) => {
        console.error('Fehler beim Backend-Start:', err);
        // Bei einem Fehler rollen wir die UI wieder zurück
        this.rollbackStart('IDLE');
      }
    });
  }
}

// Kleine Hilfsfunktion für den Fehlerfall
private rollbackStart(fallbackStatus: any): void {
  this.stopLocalCountdown();
  this.status.set(fallbackStatus);
  alert('Verbindung zum Server fehlgeschlagen.');
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

    this.sessionService.finishTimer(this.currentSessionId).subscribe({
      next: (session: TimerSessionResponse) => {
        this.status.set(session.status as any); // Setzt den Status auf FINISHED
        this.stopLocalCountdown();
        this.remainingSeconds = 0;
        this.updateDisplay();
      },
      error: (err) => console.error('Fehler beim Beenden:', err)
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
