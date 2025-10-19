import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, MatToolbarModule, MatButtonModule],
  template: `
    <mat-toolbar color="primary">
      <span style="font-weight:600">Kogui PokeAPI</span>
      <span style="flex:1 1 auto"></span>
      <button mat-button routerLink="/pokemon">Pokémon</button>
      <button mat-button routerLink="/favoritos">Favoritos</button>
      <button mat-button routerLink="/equipe">Equipe</button>
      <span style="flex:0 0 16px"></span>
      <button mat-raised-button color="accent" (click)="logout()">Sair</button>
    </mat-toolbar>
    <router-outlet />
  `,
})
export class ShellComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
