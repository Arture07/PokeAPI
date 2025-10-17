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
}
