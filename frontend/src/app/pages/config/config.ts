import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TimerConfigService, TimerConfigResponse } from '../../services/timer-config.service';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './config.html',
  styleUrl: './config.css'
})
export class ConfigComponent implements OnInit {
  private configService = inject(TimerConfigService);
  private router = inject(Router);

  // Signal für die Liste aller Konfigurationen aus der DB
  protected allConfigs = signal<TimerConfigResponse[]>([]);

  // Formular-Datenmodell
  protected configModel = {
    name: '',
    workMinutes: 25,
    breakMinutes: 5
  };

  ngOnInit(): void {
    this.loadAllConfigs();
  }

  // Lädt die Liste frisch aus dem Backend
  private loadAllConfigs(): void {
    this.configService.getAll().subscribe({
      next: (data) => this.allConfigs.set(data),
      error: (err) => console.error('Fehler beim Laden der Listen:', err)
    });
  }

  // Speichert eine neue Konfiguration
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
      next: () => {
        this.configModel.name = ''; // Formular zurücksetzen
        this.loadAllConfigs(); // Liste neu laden, damit das Neue auftaucht
      },
      error: (err) => alert('Speichern fehlgeschlagen.')
    });
  }

  // Löscht eine Konfiguration über die Tonne
  protected deleteConfig(id: number, event: Event): void {
    event.stopPropagation(); // Verhindert, dass der Eintrag gleichzeitig aktiviert wird
    if (confirm('Möchten Sie diese Konfiguration wirklich löschen?')) {
      this.configService.delete(id).subscribe({
        next: () => this.loadAllConfigs(), // Liste nach dem Löschen aktualisieren
        error: (err) => alert('Löschen fehlgeschlagen.')
      });
    }
  }

  // Hilfsfunktion: Wandelt "PT25M" im Template lesbar in "25 Min" um
  protected formatDuration(durationStr: string): string {
    if (!durationStr) return '0';
    const match = durationStr.match(/PT(\d+)M/);
    return match ? `${match[1]} Min` : durationStr;
  }
}
