import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DOCUMENT } from '@angular/common';
import { TimerConfigService, TimerConfigResponse } from '../../services/timer-config.service';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './config.html',
  styleUrl: './config.css'
})
export class ConfigComponent implements OnInit, OnDestroy {
  private configService = inject(TimerConfigService);
  private router = inject(Router);
  private document = inject(DOCUMENT);

  protected allConfigs = signal<TimerConfigResponse[]>([]);
  protected configModel = { name: '', workMinutes: 25, breakMinutes: 5 };

  ngOnInit(): void {
    const body = this.document.body;
    body.classList.add('bg-config');
    body.classList.remove('bg-work', 'bg-break');

    // 🟢 1. SOFORT die alte Liste aus dem Cache anzeigen (0 ms Wartezeit)
    const cachedList = localStorage.getItem('cachedConfigs');
    if (cachedList) {
      try {
        this.allConfigs.set(JSON.parse(cachedList));
      } catch (e) {
        console.error('Fehler beim Lesen des Caches:', e);
      }
    }

    // 🟢 2. Im Hintergrund frische Daten vom Backend laden
    this.loadAllConfigs();
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('bg-config');
  }

  private loadAllConfigs(): void {
    this.configService.getAll().subscribe({
      next: (data) => {
        //  Liste aktualisieren & für das nächste Mal im Cache ablegen
        this.allConfigs.set(data);
        localStorage.setItem('cachedConfigs', JSON.stringify(data));

        if (data && data.length > 0) {
          const savedIdStr = localStorage.getItem('selectedConfigId');
          let activeConfig = data[0];

          if (savedIdStr) {
            const found = data.find(c => c.id === parseInt(savedIdStr, 10));
            if (found) activeConfig = found;
          }

          this.updateCache(activeConfig);
        }
        else{
          // 🟢 Wenn die Liste leer ist, den aktiven Timer-Cache löschen:
        localStorage.removeItem('selectedConfigId');
        localStorage.removeItem('cachedWorkSec');
        localStorage.removeItem('cachedBreakSec');
        localStorage.removeItem('cachedConfigs');
        }
      },
      error: (err) => console.error('Fehler beim Laden der Listen:', err)
    });
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

        this.updateCache(savedConfig);
        this.loadAllConfigs();
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
    
    this.configService.delete(id).subscribe({
      next: () => {
        const savedIdStr = localStorage.getItem('selectedConfigId');
        if (savedIdStr && parseInt(savedIdStr, 10) === id) {
          localStorage.removeItem('selectedConfigId');
          localStorage.removeItem('cachedWorkSec');
          localStorage.removeItem('cachedBreakSec');
        }
        
        this.loadAllConfigs();
      },
      error: (err) => alert('Löschen fehlgeschlagen.')
    });
  }

  protected selectConfig(config: TimerConfigResponse): void {
    this.updateCache(config);
    console.log(`Profil "${config.name}" wurde als aktiv gesetzt.`);
    this.router.navigate(['/']);
  }

  private updateCache(config: TimerConfigResponse): void {
    const workSec = this.parseIsoToSeconds(config.workDuration);
    const breakSec = this.parseIsoToSeconds(config.breakDuration);

    localStorage.setItem('selectedConfigId', config.id.toString());
    localStorage.setItem('cachedWorkSec', workSec.toString());
    localStorage.setItem('cachedBreakSec', breakSec.toString());
  }

  private parseIsoToSeconds(durationStr: string): number {
    if (!durationStr) return 0;
    if (!durationStr.startsWith('PT')) return (parseInt(durationStr, 10) || 0) * 60;
    const matches = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!matches) return 0;
    const hours = parseInt(matches[1] || '0', 10);
    const minutes = parseInt(matches[2] || '0', 10);
    const seconds = parseInt(matches[3] || '0', 10);
    return (hours * 3600) + (minutes * 60) + seconds;
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