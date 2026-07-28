import { Routes } from '@angular/router';
import { TimerComponent } from './pages/timer/timer';
import { ConfigComponent } from './pages/config/config';


export const routes: Routes = [
  { path: '', component: TimerComponent },
  { path: 'config', component: ConfigComponent }
];
