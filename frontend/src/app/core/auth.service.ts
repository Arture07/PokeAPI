import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface MeResponse {
  id: number;
  login: string;
  email: string;
  nome: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private storageKeyAccess = 'auth.access';
  private storageKeyRefresh = 'auth.refresh';
  private isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

  get accessToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.storageKeyAccess);
  }

  setTokens(access: string, refresh: string) {
    if (!this.isBrowser) return;
    localStorage.setItem(this.storageKeyAccess, access);
    localStorage.setItem(this.storageKeyRefresh, refresh);
  }

  clearTokens() {
    if (!this.isBrowser) return;
    localStorage.removeItem(this.storageKeyAccess);
    localStorage.removeItem(this.storageKeyRefresh);
  }

  login(login: string, password: string) {
    return this.http.post<LoginResponse>(`${environment.apiBaseUrl}/auth/login/`, { login, password });
  }

  me() {
    return this.http.get<MeResponse>(`${environment.apiBaseUrl}/auth/me/`);
  }

  logout() {
    this.clearTokens();
  }

  register(payload: { login: string; email: string; password: string; nome?: string }) {
    return this.http.post(`${environment.apiBaseUrl}/auth/register/`, payload);
  }

  requestPasswordReset(login: string) {
    return this.http.post<{ login: string; token?: string; detail?: string }>(
      `${environment.apiBaseUrl}/auth/reset-password/`,
      { login }
    );
  }

  confirmPasswordReset(login: string, token: string, new_password: string) {
    return this.http.post<{ detail: string }>(
      `${environment.apiBaseUrl}/auth/reset-password/confirm/`,
      { login, token, new_password }
    );
  }
}
