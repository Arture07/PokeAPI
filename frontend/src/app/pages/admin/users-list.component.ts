import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { AdminService, AdminUserItem } from '../../core/admin.service';

@Component({
  selector: 'app-admin-users-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTableModule, MatButtonModule],
  template: `
    <div style="max-width:1100px;margin:16px auto;padding:0 16px">
      <h1>Usuários</h1>
      <table mat-table [dataSource]="rows" class="mat-elevation-z1" *ngIf="rows.length">
        <ng-container matColumnDef="id"><th mat-header-cell *matHeaderCellDef>ID</th><td mat-cell *matCellDef="let r">{{r.id}}</td></ng-container>
        <ng-container matColumnDef="login"><th mat-header-cell *matHeaderCellDef>Login</th><td mat-cell *matCellDef="let r">{{r.login}}</td></ng-container>
        <ng-container matColumnDef="email"><th mat-header-cell *matHeaderCellDef>Email</th><td mat-cell *matCellDef="let r">{{r.email}}</td></ng-container>
        <ng-container matColumnDef="nome"><th mat-header-cell *matHeaderCellDef>Nome</th><td mat-cell *matCellDef="let r">{{r.nome}}</td></ng-container>
        <ng-container matColumnDef="active"><th mat-header-cell *matHeaderCellDef>Ativo</th><td mat-cell *matCellDef="let r">{{r.is_active ? 'Sim' : 'Não'}}</td></ng-container>
        <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Ações</th><td mat-cell *matCellDef="let r"><button mat-button color="primary" (click)="open(r)">Abrir</button></td></ng-container>
        <tr mat-header-row *matHeaderRowDef="displayed"></tr>
        <tr mat-row *matRowDef="let row; columns: displayed;"></tr>
      </table>
      <p *ngIf="!rows.length">Sem usuários listados.</p>
    </div>
  `
})
export class AdminUsersListComponent {
  private api = inject(AdminService);
  private router = inject(Router);
  rows: AdminUserItem[] = [];
  displayed = ['id','login','email','nome','active','actions'];

  ngOnInit() { this.api.listUsers().subscribe({ next: r => this.rows = r || [], error: () => this.rows = [] }); }
  open(r: AdminUserItem) { this.router.navigate(['/admin','users', r.id]); }
}
