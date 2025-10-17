import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.accessToken;
  if (token) return true;
  // Em SSR, retorne UrlTree em vez de navegar imperativamente
  return router.parseUrl('/login') as UrlTree;
};
