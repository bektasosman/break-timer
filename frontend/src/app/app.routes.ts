import { Routes } from '@angular/router';
import { TimerComponent } from './pages/timer/timer';
import { ConfigComponent } from './pages/config/config';
import { StatsComponent } from './pages/stats/stats';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';

export const routes: Routes = [
  // Öffentliche Routen
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // Timer, Config & Statistik
  { path: 'timer', component: TimerComponent },
  { path: 'config', component: ConfigComponent },
  { path: 'stats', component: StatsComponent },

  // Standard-Umleitungen
  { path: '', redirectTo: 'timer', pathMatch: 'full' },
  { path: '**', redirectTo: 'timer' }
];
