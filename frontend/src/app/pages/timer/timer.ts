import { Component, OnInit, signal, inject, Inject } from '@angular/core'; // inject & Inject importieren
import { DOCUMENT } from '@angular/common'; // DOCUMENT importieren
import { RouterLink } from '@angular/router';
import { TimerSessionService } from '../../services/timer-session.service';
import { TimerConfigService , TimerConfigResponse} from '../../services/timer-config.service';

@Component({
  selector: 'app-root-timer',
  imports: [RouterLink],
  templateUrl: './timer.html',
  styleUrl: './timer.css',
})
export class TimerComponent implements OnInit {
  private sessionService = inject(TimerSessionService);
  private configService = inject(TimerConfigService);

  // Zugriff auf das globale Dokument des Browsers erhalten
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
  this.configService.getAll().subscribe({
    next: (configs: TimerConfigResponse[]) => { // Hier kommt das Array an!
      if (configs && configs.length > 0) {
        // Greife auf das erste Element des Arrays zu [0]
        const firstConfig = configs[0];

        this.defaultConfig.set(firstConfig);
        this.activeConfigId = firstConfig.id;
        this.switchTab('work');
      } else {
        // Fallback, falls die Datenbank komplett leer ist
        this.switchTab('work');
      }
    }
  });
}

  protected switchTab(tab: 'work' | 'break'): void {
    this.stopLocalCountdown();
    this.status.set('IDLE');
    this.activeTab.set(tab);

    // Hintergrundfarbe anpassen
    const body = this.document.body;
    if (tab === 'work') {
      body.classList.add('bg-work');
      body.classList.remove('bg-break');
    } else {
      body.classList.add('bg-break');
      body.classList.remove('bg-work');
    }

    // Daten aus dem Signal holen
    const config = this.defaultConfig();
    if (config) {
      // Dynamisch die geladenen Zeiten aus Ihrem Backend parsen!
      if (tab === 'work') {
        this.remainingSeconds = this.parseIsoDurationToSeconds(config.workDuration);
      } else {
        this.remainingSeconds = this.parseIsoDurationToSeconds(config.breakDuration);
      }
    } else {
      // Fallback falls die DB leer ist
      this.remainingSeconds = tab === 'work' ? 1500 : 300;
    }

    this.updateDisplay();
  }

  // Der kombinierte Start/Pause Button
  protected toggleTimer(): void {
    if (this.status() === 'RUNNING') {
      // PAUSIEREN
      this.stopLocalCountdown();
      this.status.set('PAUSED');
      if (this.currentSessionId) {
        this.sessionService.pauseTimer(this.currentSessionId).subscribe();
      }
    } else {
      // STARTEN / FORTSETZEN
      this.startLocalCountdown();
      this.status.set('RUNNING');

      if (this.status() === 'PAUSED' && this.currentSessionId) {
        this.sessionService.continueTimer(this.currentSessionId).subscribe();
      } else if (this.activeConfigId && this.activeTab() === 'work') {
        // Nur bei 'work' eine echte DB-Session starten
        this.sessionService.startTimer(this.activeConfigId).subscribe({
          next: (res) => this.currentSessionId = res.id
        });
      }
    }
  }

  // Skip-Button finisht die aktuelle Session und wechselt den Tab
  protected skipSession(): void {
    if (this.currentSessionId && this.activeTab() === 'work') {
      this.sessionService.finishTimer(this.currentSessionId).subscribe();
    }

    // Automatisch zum anderen Modus wechseln
    if (this.activeTab() === 'work') {
      this.switchTab('break');
    } else {
      this.switchTab('work');
    }
  }

  // --- COUNTDOWN LOGIK ---
  private startLocalCountdown(): void {
    if (this.countdownInterval) return;
    this.countdownInterval = setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
        this.updateDisplay();
      } else {
        this.skipSession(); // Wenn Zeit abgelaufen ist, automatisch skippen
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
    // 1. Berechnen, wie viele Minuten und Sekunden übrig sind
    const minutes = Math.floor(this.remainingSeconds / 60);
    const seconds = this.remainingSeconds % 60;

    // 2. Führende Null hinzufügen (aus 5 wird "05")
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    const displaySeconds = seconds < 10 ? `0${seconds}` : seconds;

    // 3. Das Signal mit dem neuen String füttern
    this.displayTime.set(`${displayMinutes}:${displaySeconds}`);
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
