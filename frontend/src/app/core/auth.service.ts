import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { getApiBaseUrl } from './api.config';

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
  private apiBase = getApiBaseUrl();

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
    return this.http.post<LoginResponse>(`${this.apiBase}/auth/login/`, { login, password });
  }

  me() {
    return this.http.get<MeResponse>(`${this.apiBase}/auth/me/`);
  }

  logout() {
    this.clearTokens();
  }

  register(payload: { login: string; email: string; password: string; nome?: string }) {
    return this.http.post(`${this.apiBase}/auth/register/`, payload);
  }

  requestPasswordReset(login: string) {
    return this.http.post<{ login: string; token?: string; detail?: string }>(
      `${this.apiBase}/auth/reset-password/`,
      { login }
    );
  }

  confirmPasswordReset(login: string, token: string, new_password: string) {
    return this.http.post<{ detail: string }>(
      `${this.apiBase}/auth/reset-password/confirm/`,
      { login, token, new_password }
    );
  }
}
