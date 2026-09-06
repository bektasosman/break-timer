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

  protected allConfigs = this.configService.configs;
  protected configModel = { name: '', workMinutes: 25, breakMinutes: 5 };

  ngOnInit(): void {
    const body = this.document.body;
    body.classList.add('bg-config');
    body.classList.remove('bg-login', 'bg-work', 'bg-break', 'bg-register');

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
        this.updateActiveConfigCache(savedConfig);
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
        const savedIdStr = this.getItem('selectedConfigId');
        if (savedIdStr && parseInt(savedIdStr, 10) === id) {
          this.clearActiveConfigCache();
        }
      },
      error: (err) => alert('Löschen fehlgeschlagen.')
    });
  }

  protected selectConfig(config: TimerConfigResponse): void {
    this.updateActiveConfigCache(config);
    this.router.navigate(['/']);
  }

  // --- HILFSMETHODEN FÜR DAS AKTIVE PROFIL ---

  private updateActiveConfigCache(config: TimerConfigResponse): void {
    const workSec = this.parseIsoToSeconds(config.workDuration);
    const breakSec = this.parseIsoToSeconds(config.breakDuration);

    this.setItem('selectedConfigId', config.id.toString());
    this.setItem('cachedWorkSec', workSec.toString());
    this.setItem('cachedBreakSec', breakSec.toString());
  }

  private clearActiveConfigCache(): void {
    this.removeItem('selectedConfigId');
    this.removeItem('cachedWorkSec');
    this.removeItem('cachedBreakSec');
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

  // Safewrapper für SSR-Sicherheit
  private getItem(key: string): string | null {
    return this.isBrowser() ? localStorage.getItem(key) : null;
  }

  private setItem(key: string, value: string): void {
    if (this.isBrowser()) localStorage.setItem(key, value);
  }

  private removeItem(key: string): void {
    if (this.isBrowser()) localStorage.removeItem(key);
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }
}