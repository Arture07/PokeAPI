import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.accessToken;

  // Skip attaching Authorization for public endpoints to avoid 401 with stale/invalid tokens
  const url = req.url;
  const base = environment.apiBaseUrl;
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
  return next(req);
};
