import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { AdminService } from '../../core/admin.service';

@Component({
  selector: 'app-admin-user-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatButtonModule,
  ],
  template: `
    <div style="max-width:800px;margin:16px auto;padding:0 16px">
      <mat-card>
        <h1>Usuário #{{ id }}</h1>
        <form
          [formGroup]="form"
          (ngSubmit)="save()"
          style="display:grid;gap:12px"
        >
          <mat-form-field appearance="outline"
            ><mat-label>Login</mat-label
            ><input matInput formControlName="login" [disabled]="true"
          /></mat-form-field>
          <mat-form-field appearance="outline"
            ><mat-label>Nome</mat-label><input matInput formControlName="nome"
          /></mat-form-field>
          <mat-form-field appearance="outline"
            ><mat-label>Email</mat-label
            ><input matInput type="email" formControlName="email"
          /></mat-form-field>
          <mat-slide-toggle formControlName="is_active">Ativo</mat-slide-toggle>
          <mat-slide-toggle formControlName="is_staff">Staff</mat-slide-toggle>
          <mat-slide-toggle formControlName="is_superuser"
            >Superuser</mat-slide-toggle
          >
          <div>
            <button
              mat-raised-button
              color="primary"
              type="submit"
              [disabled]="form.invalid || busy"
            >
              Salvar
            </button>
          </div>
        </form>
      </mat-card>
      <mat-card style="margin-top:16px">
        <h2>Reset de senha</h2>
        <form
          [formGroup]="formPwd"
          (ngSubmit)="resetPwd()"
          style="display:grid;gap:12px"
        >
          <mat-form-field appearance="outline"
            ><mat-label>Nova senha</mat-label
            ><input matInput type="password" formControlName="new_password"
          /></mat-form-field>
          <button
            mat-raised-button
            color="warn"
            type="submit"
            [disabled]="formPwd.invalid || busy"
          >
            Redefinir senha
          </button>
        </form>
        <p *ngIf="msg" style="color:#2e7d32">{{ msg }}</p>
        <p *ngIf="err" style="color:#c62828">{{ err }}</p>
      </mat-card>
    </div>
  `,
})
export class AdminUserDetailComponent {
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private api = inject(AdminService);
  id = 0;
  busy = false;
  msg = '';
  err = '';

  form = this.fb.group({
    login: this.fb.control<string>({ value: '', disabled: true } as any),
    nome: this.fb.control<string>('', { validators: [Validators.required] }),
    email: this.fb.control<string>('', {
      validators: [Validators.required, Validators.email],
    }),
    is_active: this.fb.control<boolean>(true),
    is_staff: this.fb.control<boolean>(false),
    is_superuser: this.fb.control<boolean>(false),
  });
  formPwd = this.fb.group({
    new_password: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id')) || 0;
    if (!this.id) return;
    this.api.getUser(this.id).subscribe({
      next: (u: any) => {
        this.form.patchValue({
          login: u.login as string,
          nome: u.nome as string,
          email: u.email as string,
          is_active: !!u.is_active,
          is_staff: !!u.is_staff,
          is_superuser: !!u.is_superuser,
        });
      },
      error: () => {},
    });
  }

  save() {
    if (this.form.invalid) return;
    this.busy = true;
    this.msg = '';
    this.err = '';
    const { nome, email, is_active, is_staff, is_superuser } =
      this.form.getRawValue();
    this.api
      .patchUser(this.id, {
        nome: nome || '',
        email: email || '',
        is_active: !!is_active,
        is_staff: !!is_staff,
        is_superuser: !!is_superuser,
      } as any)
      .subscribe({
        next: () => {
          this.msg = 'Salvo';
          this.busy = false;
        },
        error: () => {
          this.err = 'Falha ao salvar';
          this.busy = false;
        },
      });
  }

  resetPwd() {
    if (this.formPwd.invalid) return;
    this.busy = true;
    this.msg = '';
    this.err = '';
    const pw = this.formPwd.get('new_password')?.value || '';
    this.api.resetPassword(this.id, pw).subscribe({
      next: () => {
        this.msg = 'Senha redefinida';
        this.busy = false;
      },
      error: () => {
        this.err = 'Falha ao redefinir senha';
        this.busy = false;
      },
    });
  }
}
