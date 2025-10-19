import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface PokemonItem {
  codigo: number;
  nome: string;
  tipos: string[];
  imagemUrl?: string;
}

export interface Paginated<T> {
  count: number;
  results: T[];
}

@Injectable({ providedIn: 'root' })
export class PokemonService {
  private http = inject(HttpClient);

  list(params: { generation?: number; name?: string; limit?: number; offset?: number } = {}) {
    let p = new HttpParams();
    if (params.generation != null) p = p.set('generation', params.generation);
    if (params.name) p = p.set('name', params.name);
    if (params.limit != null) p = p.set('limit', params.limit);
    if (params.offset != null) p = p.set('offset', params.offset);
    return this.http.get<Paginated<PokemonItem>>(`${environment.apiBaseUrl}/pokemon/`, { params: p });
  }

  // Favoritos
  getFavorites() {
    return this.http.get<Paginated<PokemonItem>>(`${environment.apiBaseUrl}/pokemon/favorites/`);
  }
  addFavorite(codigo: number) {
    return this.http.post(`${environment.apiBaseUrl}/pokemon/favorites/`, { codigo });
  }
  removeFavorite(codigo: number) {
    return this.http.delete(`${environment.apiBaseUrl}/pokemon/favorites/${codigo}/`);
  }

  // Equipe
  getTeam() {
    return this.http.get<Paginated<PokemonItem>>(`${environment.apiBaseUrl}/pokemon/team/`);
  }
  addToTeam(codigo: number) {
    return this.http.post(`${environment.apiBaseUrl}/pokemon/team/`, { codigo });
  }
  removeFromTeam(codigo: number) {
    return this.http.delete(`${environment.apiBaseUrl}/pokemon/team/${codigo}/`);
  }
}
