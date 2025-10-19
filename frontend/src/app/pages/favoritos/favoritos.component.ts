import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PokemonService, PokemonItem } from '../../core/pokemon.service';

@Component({
  selector: 'app-favoritos',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding:16px">
      <h1>Favoritos</h1>
      <p *ngIf="error" style="color:#c00">{{ error }}</p>
      <div *ngIf="items.length">
        <div *ngFor="let p of items">
          <img *ngIf="p.imagemUrl" [src]="p.imagemUrl" width="56" height="56" style="vertical-align:middle;margin-right:8px"/>
          #{{p.codigo}} - {{p.nome}} ({{p.tipos?.join(', ')}})
        </div>
      </div>
      <p *ngIf="!items.length && !error">Nenhum favorito.</p>
    </div>
  `,
})
export class FavoritosComponent implements OnInit {
  private api = inject(PokemonService);
  items: PokemonItem[] = [];
  error = '';

  ngOnInit(): void {
    this.api.getFavorites().subscribe({
      next: (res) => (this.items = res.results || []),
      error: (err) => (this.error = err?.error?.detail || 'Falha ao carregar favoritos')
    });
  }
}
