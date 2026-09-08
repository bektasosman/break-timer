import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DOCUMENT } from '@angular/common';
import { TimerConfigService, TimerConfigResponse } from '../../services/timer-config.service';
import { TimerStateService } from '../../services/timer-state.service';
import { TimerSessionService } from '../../services/timer-session.service';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './config.html',
  styleUrl: './config.css'
})
export class ConfigComponent implements OnInit, OnDestroy {
  private configService = inject(TimerConfigService);
  private timerStateService = inject(TimerStateService);
  private sessionService = inject(TimerSessionService);
  private router = inject(Router);
  private document = inject(DOCUMENT);

  protected allConfigs = this.configService.configs;
  protected configModel = { name: '', workMinutes: 25, breakMinutes: 5 };

  ngOnInit(): void {
    const body = this.document.body;
    body.classList.add('bg-config');
    body.classList.remove('bg-login', 'bg-work', 'bg-break', 'bg-register', 'bg-stats');

    this.configService.loadAll().subscribe();
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('bg-config');
  }

  protected saveConfig(): void {
    if (!this.configModel.name.trim() || this.configModel.workMinutes <= 0 || this.configModel.breakMinutes <= 0) {
      alert('Bitte füllen Sie alle Felder korrekt aus.');
      return;
    }

    const dtoListe = {
      name: this.configModel.name,
      workDuration: `PT${this.configModel.workMinutes}M`,
      breakDuration: `PT${this.configModel.breakMinutes}M`
    };

    this.configService.create(dtoListe).subscribe({
      next: (savedConfig) => {
        this.configModel.name = '';
        this.configModel.workMinutes = 25;
        this.configModel.breakMinutes = 5;

        // Falls noch keine aktive Config ausgewählt war, die neue direkt aktivieren
        const savedIdStr = localStorage.getItem('selectedConfigId');
        if (!savedIdStr) {
          this.timerStateService.selectNewConfig(savedConfig);
        }
      },
      error: (err) => {
        console.error('Fehler beim Speichern:', err);
        alert('Speichern fehlgeschlagen.');
      }
    });
  }

  protected isConfigActive(id: number): boolean {
    const savedIdStr = localStorage.getItem('selectedConfigId');
    if (savedIdStr) {
      return parseInt(savedIdStr, 10) === id;
    }
    const configs = this.allConfigs();
    return configs.length > 0 && configs[0].id === id;
  }

  protected deleteConfig(id: number, event: Event): void {
    event.stopPropagation();

    const wasActive = this.isConfigActive(id);
    const currentState = this.timerStateService.getTimerState();

    if (wasActive && currentState?.currentSessionId) {
      this.sessionService.cancelTimer(currentState.currentSessionId).subscribe();
    }

    this.configService.delete(id).subscribe({
      next: () => {
        const remaining = this.allConfigs().filter(c => c.id !== id);
        if (wasActive) {
          if (remaining.length > 0) {
            this.timerStateService.selectNewConfig(remaining[0]);
          } else {
            localStorage.removeItem('selectedConfigId');
            localStorage.removeItem('cachedWorkSec');
            localStorage.removeItem('cachedBreakSec');
            this.timerStateService.clearTimerState();
          }
        }
      },
      error: (err) => alert('Löschen fehlgeschlagen.')
    });
  }

  protected selectConfig(config: TimerConfigResponse): void {
    this.timerStateService.selectNewConfig(config);
    this.router.navigate(['/timer']);
  }

  protected formatDuration(durationStr: string): string {
    if (!durationStr) return '0 Min';
    if (!durationStr.startsWith('PT')) return `${durationStr} Min`;

    const matches = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!matches) return durationStr;

    const hours = parseInt(matches[1] || '0', 10);
    const minutes = parseInt(matches[2] || '0', 10);
    const seconds = parseInt(matches[3] || '0', 10);

    const totalMinutes = (hours * 60) + minutes + (seconds > 0 ? 1 : 0);
    return `${totalMinutes} Min`;
  }
}