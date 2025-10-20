import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { getApiBaseUrl } from './api.config';

export interface AdminUserItem {
  id: number;
  login: string;
  email: string;
  nome: string;
  is_active: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private base = getApiBaseUrl();

  listUsers() {
    return this.http.get<AdminUserItem[]>(`${this.base}/admin/users/`);
  }

  getUser(id: number) {
    return this.http.get<AdminUserItem>(`${this.base}/admin/users/${id}/`);
  }

  patchUser(id: number, payload: Partial<Pick<AdminUserItem, 'nome'|'email'|'is_active'>>) {
    return this.http.patch(`${this.base}/admin/users/${id}/`, payload);
  }

  resetPassword(id: number, new_password: string) {
    return this.http.post(`${this.base}/admin/users/${id}/reset-password/`, { new_password });
  }
}
