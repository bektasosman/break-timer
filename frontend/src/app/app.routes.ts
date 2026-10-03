import { Routes } from '@angular/router';
import { TimerComponent } from './pages/timer/timer';
import { ConfigComponent } from './pages/config/config';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { StatsComponent } from './pages/stats/stats';
import { CommunityComponent } from './pages/community/community';

export const routes: Routes = [
  { path: '', redirectTo: 'timer', pathMatch: 'full' },
  { path: 'timer', component: TimerComponent },
  { path: 'config', component: ConfigComponent },
  { path: 'stats', component: StatsComponent },
  { path: 'community', component: CommunityComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: '**', redirectTo: 'timer' }
];