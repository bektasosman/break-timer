import { Injectable, inject, signal, effect } from '@angular/core';
import { TimerConfigResponse } from './timer-config.service';
import { TimerSessionService } from './timer-session.service';
import { AuthService } from './auth.service';

export interface SavedTimerState {
  status: 'RUNNING' | 'PAUSED' | 'IDLE';
  activeTab: 'work' | 'break';
  remainingSeconds: number;
  currentSessionId: number | null;
  activeConfigId: number | null;
  displayTime: string;
}

@Injectable({
  providedIn: 'root'
})
export class TimerStateService {
  private sessionService = inject(TimerSessionService);
  private authService = inject(AuthService);
  private STORAGE_KEY = 'break_timer_saved_state';

  public state = signal<SavedTimerState | null>(this.loadInitialState());

  constructor() {
    effect(() => {
      // Wenn sich der Anmeldestatus ändert (Login/Logout), Timer-Zustand zurücksetzen
      this.authService.isLoggedIn();
      this.clearTimerState();
    });
  }

  private loadInitialState(): SavedTimerState | null {
    if (!this.isBrowser()) return null;
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed: SavedTimerState = JSON.parse(raw);
      if (parsed.status === 'RUNNING') {
        parsed.status = 'PAUSED';
      }
      return parsed;
    } catch {
      return null;
    }
  }

  public saveTimerState(state: SavedTimerState): void {
    const adjustedState = {
      ...state,
      status: state.status === 'RUNNING' ? 'PAUSED' : state.status
    };
    this.state.set(adjustedState);
    if (this.isBrowser()) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(adjustedState));
    }
  }

  public getTimerState(): SavedTimerState | null {
    return this.state();
  }

  public clearTimerState(): void {
    this.state.set(null);
    if (this.isBrowser()) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  public selectNewConfig(config: TimerConfigResponse): void {
    const currentState = this.state();
    if (currentState?.currentSessionId && currentState.activeTab === 'work') {
      this.sessionService.finishTimer(currentState.currentSessionId).subscribe();
    }

    const workSec = this.parseIsoToSeconds(config.workDuration);
    const breakSec = this.parseIsoToSeconds(config.breakDuration);

    if (this.isBrowser()) {
      localStorage.setItem('selectedConfigId', config.id.toString());
      localStorage.setItem('cachedWorkSec', workSec.toString());
      localStorage.setItem('cachedBreakSec', breakSec.toString());
    }

    const minutes = Math.floor(workSec / 60);
    const seconds = workSec % 60;
    const displayTime = `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;

    const newState: SavedTimerState = {
      status: 'IDLE',
      activeTab: 'work',
      remainingSeconds: workSec,
      currentSessionId: null,
      activeConfigId: config.id,
      displayTime
    };

    this.saveTimerState(newState);
  }

  private parseIsoToSeconds(durationStr: string): number {
    if (!durationStr) return 0;
    if (!durationStr.startsWith('PT')) return (parseInt(durationStr, 10) || 0) * 60;
    const matches = durationStr.match(/PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/i);
    if (!matches) return 0;
    const hours = parseFloat(matches[1] || '0');
    const minutes = parseFloat(matches[2] || '0');
    const seconds = parseFloat(matches[3] || '0');
    return Math.round(hours * 3600 + minutes * 60 + seconds);
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }
}
