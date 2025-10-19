import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { PokemonService, PokemonItem } from '../../core/pokemon.service';

@Component({
  selector: 'app-equipe',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatChipsModule],
  template: `
    <div style="max-width:1100px;margin:16px auto;padding:0 16px">
      <h1>Equipe</h1>
      <p *ngIf="error" style="color:#c00">{{ error }}</p>
      <div *ngIf="items.length" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
        <mat-card *ngFor="let p of items">
          <mat-card-header>
            <div mat-card-avatar style="background:#eee;border-radius:50%;display:flex;align-items:center;justify-content:center">
              <span>#{{ p.codigo }}</span>
            </div>
            <mat-card-title>{{ p.nome }}</mat-card-title>
            <mat-card-subtitle>
              <mat-chip-set aria-label="Tipos">
                <mat-chip *ngFor="let t of p.tipos" color="primary" selected>{{ t }}</mat-chip>
              </mat-chip-set>
            </mat-card-subtitle>
          </mat-card-header>
          <img *ngIf="p.imagemUrl" [src]="p.imagemUrl" alt="{{p.nome}}" style="width:100%;height:160px;object-fit:contain;background:linear-gradient(180deg,#f5f5f5,#fff)">
        </mat-card>
      </div>
      <p *ngIf="!items.length && !error" style="color:#666">Sua equipe está vazia.</p>
    </div>
  `,
})
export class EquipeComponent implements OnInit {
  private api = inject(PokemonService);
  items: PokemonItem[] = [];
  error = '';

  ngOnInit(): void {
    this.api.getTeam().subscribe({
      next: (res) => {
        this.items = res.results || [];
        this.api.updateTeamCount(this.items.length);
      },
      error: (err) => (this.error = err?.error?.detail || 'Falha ao carregar a equipe')
    });
  }
}
