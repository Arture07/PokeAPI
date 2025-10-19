import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PokemonService, PokemonItem } from '../../core/pokemon.service';
import { AuthService } from '../../core/auth.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-pokemon-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatCardModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <!-- HERO -->
    <div style="background:#e65100;color:#fff;padding:32px 16px">
      <div style="max-width:1100px;margin:0 auto">
        <h1 style="margin:0 0 6px 0;display:flex;align-items:center;gap:8px">
          <mat-icon>catching_pokemon</mat-icon>
          Pokédex Digital
        </h1>
        <p style="margin:0;color:#fbe9e7">Explore o mundo dos Pokémon. Descubra informações detalhadas sobre cada criatura.</p>
      </div>
    </div>

    <!-- FILTERS + STATS -->
    <div style="background:#6a5acd;color:#fff;padding:12px 16px">
      <div style="max-width:1100px;margin:0 auto;display:flex;gap:24px;align-items:center;flex-wrap:wrap">
        <div><strong>{{ count >= 0 ? count : '—' }}</strong> Pokémon</div>
        <div><strong>18</strong> Tipos</div>
        <div><strong>9</strong> Gerações</div>
      </div>
    </div>

    <div style="max-width:1100px;margin:16px auto;padding:0 16px">
      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:12px">
        <mat-form-field appearance="outline">
          <mat-label>Nome</mat-label>
          <input matInput [(ngModel)]="name" (ngModelChange)="onFiltersChange()" placeholder="ex: char">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Geração</mat-label>
          <mat-select [(ngModel)]="generation" (selectionChange)="onFiltersChange()">
            <mat-option [value]="null">Todas</mat-option>
            <mat-option *ngFor="let g of generations" [value]="g">{{ g }}</mat-option>
          </mat-select>
        </mat-form-field>
        <button mat-stroked-button color="primary" (click)="reload()" [disabled]="loading">
          <mat-icon>refresh</mat-icon>
          {{ loading ? 'Carregando…' : 'Recarregar' }}
        </button>
        <span *ngIf="count >= 0 && !loading" style="color:#666">Total: {{ count }}</span>
      </div>

      <p *ngIf="error" style="color:#c00">{{ error }}</p>

      <!-- GRID CARDS -->
      <div *ngIf="items.length" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
        <mat-card *ngFor="let p of items">
          <mat-card-header>
            <div mat-card-avatar style="background:#eee;border-radius:50%;display:flex;align-items:center;justify-content:center">
              <span>#{{ p.codigo }}</span>
            </div>
            <mat-card-title>{{ p.nome }}</mat-card-title>
            <mat-card-subtitle>
              <mat-chip-set aria-label="Tipos">
                <mat-chip *ngFor="let t of p.tipos" [disableRipple]="true" [ngStyle]="{'background-color': typeColor(t), 'color':'#fff'}">{{ t }}</mat-chip>
              </mat-chip-set>
            </mat-card-subtitle>
          </mat-card-header>
          <img *ngIf="p.imagemUrl" [src]="p.imagemUrl" alt="{{p.nome}}" style="width:100%;height:160px;object-fit:contain;background:linear-gradient(180deg,#f5f5f5,#fff)">
          <mat-card-actions align="end" *ngIf="loggedIn">
            <button mat-button color="primary" (click)="toggleFavorite(p)" [disabled]="busy.has(p.codigo)">
              <mat-icon>{{ favorites.has(p.codigo) ? 'favorite' : 'favorite_border' }}</mat-icon>
              {{ favorites.has(p.codigo) ? 'Desfavoritar' : 'Favoritar' }}
            </button>
            <button mat-raised-button color="accent" (click)="toggleTeam(p)" [disabled]="busy.has(p.codigo)">
              <mat-icon>group_add</mat-icon>
              {{ team.has(p.codigo) ? 'Remover' : 'Adicionar' }}
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <div style="display:flex;justify-content:center;margin:16px 0" *ngIf="loading">
        <mat-progress-spinner diameter="36" mode="indeterminate"></mat-progress-spinner>
      </div>

      <div *ngIf="!loading && count === 0" style="text-align:center;color:#666;margin:16px 0">
        Nenhum Pokémon encontrado.
      </div>

      <div *ngIf="!loading && error" style="text-align:center;margin:16px 0">
        <p style="color:#c00">{{ error }}</p>
        <button mat-stroked-button color="primary" (click)="reload()">Tentar novamente</button>
      </div>

      <div *ngIf="!loading && items.length < count" style="margin-top:12px;text-align:center">
        <button mat-stroked-button (click)="loadMore()">Carregar mais</button>
      </div>
    </div>
  `
})
export class PokemonListComponent implements OnInit {
  private api = inject(PokemonService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
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

  // Mapa de cores por tipo (aproximado)
  private typeColors: Record<string, string> = {
    normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030', grass: '#78C850', ice: '#98D8D8',
    fighting: '#C03028', poison: '#A040A0', ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
    rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848', steel: '#B8B8D0', fairy: '#EE99AC'
  };
  typeColor(t: string) { return this.typeColors[(t || '').toLowerCase()] || '#9e9e9e'; }

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
        this.api.updateTeamCount(this.team.size);
      },
      error: () => {}
    });
  }

  reload() {
    this.offset = 0;
    this.items = [];
    this.count = -1;
    this.updateQueryParams();
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
        // Para exibir chips de tipos quando a listagem não traz, busque detalhes leves
        this.items
          .filter(x => !x.tipos || x.tipos.length === 0)
          .slice(-this.pageSize) // apenas da página atual
          .forEach((it) => {
            this.api.get(it.codigo).subscribe({
              next: (det) => {
                it.tipos = det?.tipos || [];
                it.imagemUrl = it.imagemUrl || det?.imagemUrl;
              },
              error: () => {}
            });
          });
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
    this.updateQueryParams();
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
        this.api.updateTeamCount(this.team.size);
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
    this.applyQueryParams();
  }

  private applyQueryParams() {
    const qp = this.route.snapshot.queryParamMap;
    const q = qp.get('q') || '';
    const g = qp.get('g');
    const o = qp.get('o');
    this.name = q;
    this.generation = g != null ? (g === 'null' ? null : Number(g)) : null;
    this.offset = o != null ? Number(o) : 0;
    this.load();
  }

  private updateQueryParams() {
    const params: any = {
      q: this.name || null,
      g: this.generation ?? null,
      o: this.offset || null,
    };
    this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
