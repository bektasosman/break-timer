import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core'; // OnDestroy hinzufügen
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DOCUMENT } from '@angular/common'; // DOCUMENT importieren
import { TimerConfigService, TimerConfigResponse } from '../../services/timer-config.service';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './config.html',
  styleUrl: './config.css'
})
export class ConfigComponent implements OnInit, OnDestroy { // OnDestroy implementieren
  private configService = inject(TimerConfigService);
  private router = inject(Router);
  private document = inject(DOCUMENT); // Document injecten

  protected allConfigs = signal<TimerConfigResponse[]>([]);
  protected configModel = { name: '', workMinutes: 25, breakMinutes: 5 };

  ngOnInit(): void {
    // 1. Bildschirm sofort beim Laden hellblau färben
    const body = this.document.body;
    body.classList.add('bg-config');
    body.classList.remove('bg-work', 'bg-break');

    this.loadAllConfigs();
  }

  ngOnDestroy(): void {
    // 2. Beim Verlassen der Seite die blaue Klasse entfernen
    this.document.body.classList.remove('bg-config');
  }

  // Lädt die Liste frisch aus dem Backend
  private loadAllConfigs(): void {
    this.configService.getAll().subscribe({
      next: (data) => this.allConfigs.set(data),
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

    // Ab ans Spring Boot Backend!
    this.configService.create(dtoListe).subscribe({
      next: (savedConfig) => {
        console.log('Konfiguration erfolgreich gespeichert:', savedConfig);

        // 1. Formular zurücksetzen (damit man sofort das nächste eintippen kann)
        this.configModel.name = '';
        this.configModel.workMinutes = 25;
        this.configModel.breakMinutes = 5;

        // 2. Die Liste unten neu laden, damit das neue Profil sofort erscheint
        this.loadAllConfigs();
      },
      error: (err) => {
        console.error('Fehler beim Speichern:', err);
        alert('Speichern fehlgeschlagen.');
      }
    });
  }

  // Diese Hilfsfunktion nutzen wir gleich im HTML, um das aktive Profil hervorzuheben
  protected isConfigActive(id: number): boolean {
    const savedIdStr = localStorage.getItem('selectedConfigId');
    if (savedIdStr) {
      return parseInt(savedIdStr, 10) === id;
    }
    // Falls noch gar nichts im Speicher liegt, ist standardmäßig das erste Profil aktiv
    const configs = this.allConfigs();
    return configs.length > 0 && configs[0].id === id;
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

  // Neue Funktion zum Aktivieren eines Profils
  protected selectConfig(config: TimerConfigResponse): void {
    // Wir merken uns die ID im Browser-Speicher
    localStorage.setItem('selectedConfigId', config.id.toString());

    console.log(`Profil "${config.name}" wurde als aktiv gesetzt.`);
    // Sofort zurück zum Timer springen
    this.router.navigate(['/']);
  }

  // Hilfsfunktion: Wandelt "PT25M" im Template lesbar in "25 Min" um
  protected formatDuration(durationStr: string): string {
    if (!durationStr) return '0 Min';

    // Falls es kein ISO-String ist, geben wir es einfach aus
    if (!durationStr.startsWith('PT')) return `${durationStr} Min`;

    // Filtert Stunden (H), Minuten (M) und Sekunden (S) heraus
    const matches = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!matches) return durationStr;

    const hours = parseInt(matches[1] || '0', 10);
    const minutes = parseInt(matches[2] || '0', 10);
    const seconds = parseInt(matches[3] || '0', 10);

    // Wir rechnen alles in reine Minuten um, damit es übersichtlich bleibt
    const totalMinutes = (hours * 60) + minutes + (seconds > 0 ? 1 : 0);

    return `${totalMinutes} Min`;
  }

}
