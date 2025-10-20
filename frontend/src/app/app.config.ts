import { ApplicationConfig, APP_INITIALIZER, inject } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { HttpClient, provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { authInterceptor } from './core/auth.interceptor';
import { provideAnimations } from '@angular/platform-browser/animations';
import { getApiBaseUrl } from './core/api.config';
import { firstValueFrom } from 'rxjs';

function appHealthCheck() {
  const http = inject(HttpClient);
  return () => firstValueFrom(
    http.get(`${getApiBaseUrl()}/health/`, { responseType: 'text' })
  ).catch(() => void 0);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
  provideHttpClient(withInterceptors([authInterceptor]), withFetch()),
    provideAnimations(),
    { provide: APP_INITIALIZER, multi: true, useFactory: appHealthCheck }
  ]
};
