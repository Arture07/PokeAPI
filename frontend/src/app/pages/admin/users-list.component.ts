import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminService, AdminUserItem } from '../../core/admin.service';

@Component({
  selector: 'app-admin-users-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    ReactiveFormsModule,
  ],
  template: `
    <div style="max-width:1100px;margin:16px auto;padding:0 16px">
      <h1>Usuários</h1>
      <form
        [formGroup]="form"
        (ngSubmit)="create()"
        style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin:12px 0"
      >
        <input placeholder="Login" formControlName="login" />
        <input placeholder="Nome" formControlName="nome" />
        <input placeholder="Email" type="email" formControlName="email" />
        <input placeholder="Senha" type="password" formControlName="password" />
        <label
          ><input type="checkbox" formControlName="is_staff" /> Staff</label
        >
        <label
          ><input type="checkbox" formControlName="is_superuser" />
          Superuser</label
        >
        <button
          mat-raised-button
          color="primary"
          type="submit"
          [disabled]="form.invalid || busy"
        >
          Criar
        </button>
      </form>
      <p *ngIf="msg" style="color:#2e7d32">{{ msg }}</p>
      <p *ngIf="err" style="color:#c62828">{{ err }}</p>
      <table
        mat-table
        [dataSource]="rows"
        class="mat-elevation-z1"
        *ngIf="rows.length"
      >
        <ng-container matColumnDef="id"
          ><th mat-header-cell *matHeaderCellDef>ID</th>
          <td mat-cell *matCellDef="let r">{{ r.id }}</td></ng-container
        >
        <ng-container matColumnDef="login"
          ><th mat-header-cell *matHeaderCellDef>Login</th>
          <td mat-cell *matCellDef="let r">{{ r.login }}</td></ng-container
        >
        <ng-container matColumnDef="email"
          ><th mat-header-cell *matHeaderCellDef>Email</th>
          <td mat-cell *matCellDef="let r">{{ r.email }}</td></ng-container
        >
        <ng-container matColumnDef="nome"
          ><th mat-header-cell *matHeaderCellDef>Nome</th>
          <td mat-cell *matCellDef="let r">{{ r.nome }}</td></ng-container
        >
        <ng-container matColumnDef="active"
          ><th mat-header-cell *matHeaderCellDef>Ativo</th>
          <td mat-cell *matCellDef="let r">
            {{ r.is_active ? 'Sim' : 'Não' }}
          </td></ng-container
        >
        <ng-container matColumnDef="staff"
          ><th mat-header-cell *matHeaderCellDef>Staff</th>
          <td mat-cell *matCellDef="let r">
            {{ r.is_staff ? 'Sim' : 'Não' }}
          </td></ng-container
        >
        <ng-container matColumnDef="super"
          ><th mat-header-cell *matHeaderCellDef>Superuser</th>
          <td mat-cell *matCellDef="let r">
            {{ r.is_superuser ? 'Sim' : 'Não' }}
          </td></ng-container
        >
        <ng-container matColumnDef="actions"
          ><th mat-header-cell *matHeaderCellDef>Ações</th>
          <td mat-cell *matCellDef="let r">
            <button mat-button color="primary" (click)="open(r)">Abrir</button>
          </td></ng-container
        >
        <tr mat-header-row *matHeaderRowDef="displayed"></tr>
        <tr mat-row *matRowDef="let row; columns: displayed"></tr>
      </table>
      <p *ngIf="!rows.length">Sem usuários listados.</p>
    </div>
  `,
})
export class AdminUsersListComponent {
  private api = inject(AdminService);
  private router = inject(Router);
  rows: AdminUserItem[] = [];
  displayed = [
    'id',
    'login',
    'email',
    'nome',
    'active',
    'staff',
    'super',
    'actions',
  ];
  fb = inject(FormBuilder);
  form = this.fb.group({
    login: ['', Validators.required],
    nome: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    is_staff: [false],
    is_superuser: [false],
  });
  busy = false;
  msg = '';
  err = '';

  ngOnInit() {
    this.api
      .listUsers()
      .subscribe({
        next: (r) => (this.rows = r || []),
        error: () => (this.rows = []),
      });
  }
  open(r: AdminUserItem) {
    this.router.navigate(['/admin', 'users', r.id]);
  }
  create() {
    if (this.form.invalid) return;
    this.busy = true;
    this.msg = '';
    this.err = '';
    const payload = this.form.getRawValue();
    this.api.createUser(payload as any).subscribe({
      next: (u) => {
        this.msg = 'Usuário criado';
        this.busy = false;
        this.form.reset({ is_staff: false, is_superuser: false });
        this.rows = [...this.rows, u as any];
      },
      error: (e) => {
        this.err = e?.error?.detail || 'Falha ao criar';
        this.busy = false;
      },
    });
  }
}
