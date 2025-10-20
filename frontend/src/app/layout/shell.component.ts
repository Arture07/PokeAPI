import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../core/auth.service';
import { PokemonService } from '../core/pokemon.service';
import { MatBadgeModule } from '@angular/material/badge';
import { map, of } from 'rxjs';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, MatToolbarModule, MatButtonModule, MatBadgeModule],
  template: `
    <mat-toolbar color="primary">
      <span style="font-weight:600">Kogui PokeAPI</span>
      <span style="flex:1 1 auto"></span>
      <button mat-button routerLink="/pokemon">Pokémon</button>
  <button mat-button routerLink="/favoritos">Favoritos</button>
  <button mat-button routerLink="/conta">Conta</button>
      <button mat-button routerLink="/equipe" [matBadge]="teamCount | async" matBadgeColor="accent" matBadgeOverlap="false">Equipe</button>
      <button mat-button *ngIf="(isStaff$ | async)" routerLink="/admin/users">Admin</button>
      <span style="flex:0 0 16px"></span>
      <button mat-raised-button color="accent" (click)="logout()">Sair</button>
    </mat-toolbar>
    <router-outlet />
  `,
})
export class ShellComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  protected teamCount = inject(PokemonService).teamCount$;
  isStaff$ = this.auth.me().pipe(map(m => (this.auth.cachedMe = m, !!m.is_staff)), (source => source),);

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
