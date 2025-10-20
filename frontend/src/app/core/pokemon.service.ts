import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';

export interface PokemonItem {
  codigo: number;
  nome: string;
  tipos: string[];
  imagemUrl?: string;
  stats?: {
    hp: number;
    attack: number;
    defense: number;
    spAttack?: number;
    spDefense?: number;
    speed?: number;
    total?: number;
  };
}

export interface Paginated<T> {
  count: number;
  results: T[];
}

@Injectable({ providedIn: 'root' })
export class PokemonService {
  private http = inject(HttpClient);
  // Contador reativo da equipe para mostrar no topo
  private teamCountSubject = new BehaviorSubject<number>(0);
  teamCount$ = this.teamCountSubject.asObservable();
  updateTeamCount(count: number) {
    this.teamCountSubject.next(Math.max(0, Math.min(6, count)));
  }

  list(params: { generation?: number; name?: string; limit?: number; offset?: number } = {}) {
    let p = new HttpParams();
    if (params.generation != null) p = p.set('generation', params.generation);
    if (params.name) p = p.set('name', params.name);
    if (params.limit != null) p = p.set('limit', params.limit);
    if (params.offset != null) p = p.set('offset', params.offset);
    return this.http.get<Paginated<PokemonItem>>(`${environment.apiBaseUrl}/pokemon/`, { params: p });
  }

  // Detalhe de um pokémon (para obter tipos e garantir imagem)
  get(codigo: number) {
    return this.http.get<PokemonItem>(`${environment.apiBaseUrl}/pokemon/${codigo}/`);
  }

  // Fallback: busca direto na PokéAPI pública para obter stats caso backend não traga
  getFromPokeApiRaw(codigo: number) {
    return this.http.get<any>(`https://pokeapi.co/api/v2/pokemon/${codigo}`);
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
