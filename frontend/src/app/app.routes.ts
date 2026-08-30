import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

import { TimerComponent } from './pages/timer/timer';
import { ConfigComponent } from './pages/config/config';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register'; // 🟢 1. RegisterComponent importieren

export const routes: Routes = [
  // Öffentliche Routen
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent }, // 🟢 2. Route hinzufügen

  // Geschützte Routen
  { 
    path: 'timer', 
    component: TimerComponent, 
  },
  { 
    path: 'config', 
    component: ConfigComponent, 
  },

  // Standard-Umleitungen
  { path: '', redirectTo: 'timer', pathMatch: 'full' },
  { path: '**', redirectTo: 'timer' }
];