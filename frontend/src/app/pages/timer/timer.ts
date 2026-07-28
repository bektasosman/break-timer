import { Component, signal, effect } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-timer',
  imports: [RouterLink],
  templateUrl: './timer.html',
  styleUrl: './timer.css',
})
export class TimerComponent {
  // Startzeit in Sekunden (z.B. 20 Minuten = 1200 Sekunden)
  private totalSeconds = signal(1200); 
  
  // Status: WORK oder PAUSE
  protected status = signal('WORK');
  
  // ID des laufenden JavaScript-Intervalls
  private timerId: any = null;

  // Diese "computed" Eigenschaft rechnet die Sekunden live in MM:SS um
  protected get displayTime(): string {
    const minutes = Math.floor(this.totalSeconds() / 60);
    const seconds = this.totalSeconds() % 60;
    
    // Führende Null hinzufügen, falls Zahl < 10
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    const displaySeconds = seconds < 10 ? `0${seconds}` : seconds;
    
    return `${displayMinutes}:${displaySeconds}`;
  }

  // Start-Funktion
  protected startTimer(): void {
    if (this.timerId) return; // Verhindert doppeltes Klicken

    this.timerId = setInterval(() => {
      if (this.totalSeconds() > 0) {
        // Signal-Wert um 1 verringern
        this.totalSeconds.update(value => value - 1);
      } else {
        this.stopTimer();
        alert('Zeit abgelaufen!');
      }
    }, 1000); // Läuft exakt alle 1000ms (1 Sekunde)
  }

  // Stopp-Funktion
  protected stopTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  // Finish-Funktion (Setzt den Timer manuell zurück)
  protected finishTimer(): void {
    this.stopTimer();
    this.totalSeconds.set(0);
  }
}
