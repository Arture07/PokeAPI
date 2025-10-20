import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { map, of, catchError } from 'rxjs';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const cached = auth.cachedMe;
  if (cached && cached.is_staff) return true;
  return auth.me().pipe(
    map(me => {
      auth.cachedMe = me;
      return me.is_staff ? true : (router.parseUrl('/pokemon') as UrlTree);
    }),
    catchError(() => of(router.parseUrl('/pokemon') as UrlTree))
  );
};
