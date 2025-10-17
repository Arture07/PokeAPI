import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-pokemon-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding:16px">
      <h1>Pokémon</h1>
      <button (click)="load()" [disabled]="loading">{{ loading ? 'Carregando…' : 'Recarregar' }}</button>
      <p *ngIf="error" style="color:#c00">{{ error }}</p>
      <div *ngIf="items.length && !loading">
        <div *ngFor="let p of items">
          #{{p.codigo}} - {{p.nome}} ({{p.tipos?.join(', ')}})
        </div>
      </div>
    </div>
  `
})
export class PokemonListComponent implements OnInit {
  private http = inject(HttpClient);
  items: any[] = [];
  loading = false;
  error = '';

  load() {
    this.loading = true;
    this.error = '';
    this.http.get<any>(`${environment.apiBaseUrl}/pokemon/?limit=12&offset=0`).subscribe({
      next: (res) => {
        this.items = res?.results || [];
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Falha ao carregar Pokémon';
        this.loading = false;
      }
    });
  }

  ngOnInit(): void {
    this.load();
  }
}
