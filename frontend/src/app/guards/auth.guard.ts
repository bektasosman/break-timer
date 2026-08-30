import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true; // Nutzer ist eingeloggt -> Seite darf geladen werden
  }

  // Nicht eingeloggt -> Umleitung auf die Login-Seite
  return router.createUrlTree(['/login']);
};