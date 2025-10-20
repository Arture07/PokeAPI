import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { getApiBaseUrl } from './api.config';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.accessToken;

  // Skip attaching Authorization for public endpoints to avoid 401 with stale/invalid tokens
  const url = req.url;
  // Use the same resolver used by the services so comparisons actually match
  const base = getApiBaseUrl();
  const isHealth = url.startsWith(`${base}/health/`);
  const isAuthPublic = url.startsWith(`${base}/auth/login/`) || url.startsWith(`${base}/auth/register/`);
  const isPokemon = url.startsWith(`${base}/pokemon/`);
  const isFavorites = url.startsWith(`${base}/pokemon/favorites`);
  const isTeam = url.startsWith(`${base}/pokemon/team`);
  // Public only for list/detail; favorites/team require auth
  const isPublicPokemon = isPokemon && !isFavorites && !isTeam;
  const isPublic = isHealth || isAuthPublic || isPublicPokemon;

  if (token && !isPublic) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  return next(req).pipe(
    catchError((err) => {
      // Se 401 em rota protegida: limpar sessão e redirecionar ao login com aviso
      if (err?.status === 401 && !isPublic) {
        auth.logout();
        try { router.navigate(['/login'], { queryParams: { expired: '1' } }); } catch {}
      }
      return throwError(() => err);
    })
  );
};
