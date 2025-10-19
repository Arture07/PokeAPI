import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PokemonService, PokemonItem } from '../../core/pokemon.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-pokemon-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="padding:16px">
      <h1>Pokémon</h1>
      <div style="margin:12px 0; display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
        <label>
          Nome:
          <input type="text" [(ngModel)]="name" (ngModelChange)="onFiltersChange()" placeholder="ex: char" />
        </label>
        <label>
          Geração:
          <select [(ngModel)]="generation" (change)="onFiltersChange()">
            <option [ngValue]="null">Todas</option>
            <option *ngFor="let g of generations" [ngValue]="g">{{ g }}</option>
          </select>
        </label>
        <button (click)="reload()" [disabled]="loading">{{ loading ? 'Carregando…' : 'Recarregar' }}</button>
        <span *ngIf="count >= 0 && !loading" style="color:#666">Total: {{ count }}</span>
      </div>

      <p *ngIf="error" style="color:#c00">{{ error }}</p>

      <div *ngIf="items.length">
        <div *ngFor="let p of items" style="display:flex; align-items:center; gap:8px; margin:8px 0;">
          <img *ngIf="p.imagemUrl" [src]="p.imagemUrl" alt="{{p.nome}}" width="56" height="56" style="vertical-align:middle;margin-right:8px"/>
          <div style="flex:1">#{{p.codigo}} - {{p.nome}} ({{p.tipos?.join(', ')}})</div>
          <ng-container *ngIf="loggedIn">
            <button (click)="toggleFavorite(p)" [disabled]="busy.has(p.codigo)">
              {{ favorites.has(p.codigo) ? 'Desfavoritar' : 'Favoritar' }}
            </button>
            <button (click)="toggleTeam(p)" [disabled]="busy.has(p.codigo)">
              {{ team.has(p.codigo) ? 'Remover da equipe' : 'Adicionar à equipe' }}
            </button>
          </ng-container>
        </div>
      </div>

      <div *ngIf="!loading && items.length < count" style="margin-top:12px;">
        <button (click)="loadMore()">Carregar mais</button>
      </div>
    </div>
  `
})
export class PokemonListComponent implements OnInit {
  private api = inject(PokemonService);
  private auth = inject(AuthService);
  items: PokemonItem[] = [];
  loading = false;
  error = '';
  // filtros e paginação
  name = '';
  generation: number | null = null;
  generations = [1,2,3,4,5,6,7,8,9];
  pageSize = 12;
  offset = 0;
  count = -1;
  private debounceHandle: any;

  // estado autenticado e toggles
  get loggedIn() { return !!this.auth.accessToken; }
  favorites = new Set<number>();
  team = new Set<number>();
  busy = new Set<number>();

  private fetchFavoritesAndTeam() {
    if (!this.loggedIn) return;
    this.api.getFavorites().subscribe({
      next: (res) => {
        this.favorites = new Set((res?.results || []).map(x => x.codigo));
      },
      error: () => {}
    });
    this.api.getTeam().subscribe({
      next: (res) => {
        this.team = new Set((res?.results || []).map(x => x.codigo));
      },
      error: () => {}
    });
  }

  reload() {
    this.offset = 0;
    this.items = [];
    this.count = -1;
    this.load();
  }

  onFiltersChange() {
    clearTimeout(this.debounceHandle);
    this.debounceHandle = setTimeout(() => this.reload(), 300);
  }

  load() {
    this.loading = true;
    this.error = '';
    this.api.list({
      name: this.name?.trim() || undefined,
      generation: this.generation ?? undefined,
      limit: this.pageSize,
      offset: this.offset,
    }).subscribe({
      next: (res) => {
        this.count = res?.count ?? 0;
        const results = res?.results || [];
        if (this.offset === 0) this.items = results; else this.items = [...this.items, ...results];
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Falha ao carregar Pokémon';
        this.loading = false;
      }
    });
  }

  loadMore() {
    if (this.loading) return;
    this.offset += this.pageSize;
    this.load();
  }

  toggleFavorite(p: PokemonItem) {
    if (!this.loggedIn) return;
    this.busy.add(p.codigo);
    const inFav = this.favorites.has(p.codigo);
    const obs = inFav ? this.api.removeFavorite(p.codigo) : this.api.addFavorite(p.codigo);
    obs.subscribe({
      next: () => {
        if (inFav) this.favorites.delete(p.codigo); else this.favorites.add(p.codigo);
        this.busy.delete(p.codigo);
      },
      error: () => { this.busy.delete(p.codigo); }
    });
  }

  toggleTeam(p: PokemonItem) {
    if (!this.loggedIn) return;
    this.busy.add(p.codigo);
    const inTeam = this.team.has(p.codigo);
    const obs = inTeam ? this.api.removeFromTeam(p.codigo) : this.api.addToTeam(p.codigo);
    obs.subscribe({
      next: () => {
        if (inTeam) this.team.delete(p.codigo); else this.team.add(p.codigo);
        this.busy.delete(p.codigo);
      },
      error: (err) => {
        // Mostra erro amigável (ex: equipe cheia)
        this.error = err?.error?.detail || 'Falha ao atualizar equipe';
        this.busy.delete(p.codigo);
      }
    });
  }

  ngOnInit(): void {
    this.fetchFavoritesAndTeam();
    this.load();
  }
}
