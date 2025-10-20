import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
  <div class="wrap">
    <mat-card class="card">
      <h1>Redefinir senha</h1>

      <!-- Passo 1: solicitar token -->
      <form [formGroup]="formRequest" (ngSubmit)="request()" *ngIf="step===1">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Login</mat-label>
          <input matInput formControlName="login" required autocomplete="username">
        </mat-form-field>
        <button mat-raised-button color="primary" class="full" type="submit" [disabled]="formRequest.invalid || loading">Gerar token</button>
        <p *ngIf="token" class="info">Token gerado (ambiente dev): <strong>{{ token }}</strong></p>
        <p *ngIf="error" class="warn">{{ error }}</p>
        <div class="actions"><button mat-button color="primary" type="button" (click)="goToStep2()" [disabled]="!token">Ir para confirmação</button></div>
      </form>

      <!-- Passo 2: confirmar troca -->
      <form [formGroup]="formConfirm" (ngSubmit)="confirm()" *ngIf="step===2">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Login</mat-label>
          <input matInput formControlName="login" required autocomplete="username">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Token</mat-label>
          <input matInput formControlName="token" required>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Nova senha</mat-label>
          <input matInput type="password" formControlName="new_password" required autocomplete="new-password">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Confirmar senha</mat-label>
          <input matInput type="password" formControlName="confirm" required autocomplete="new-password">
        </mat-form-field>
        <button mat-raised-button color="primary" class="full" type="submit" [disabled]="formConfirm.invalid || loading">Redefinir</button>
        <p *ngIf="success" class="ok">{{ success }}</p>
        <p *ngIf="error" class="warn">{{ error }}</p>
      </form>
    </mat-card>
  </div>
  `,
  styles: [
    `.wrap{min-height:calc(100vh - 64px);display:flex;align-items:center;justify-content:center;padding:24px}`,
    `.card{width:420px}`,
    `.full{width:100%}`,
    `.warn{color:#c62828;margin:8px 0 0}`,
    `.ok{color:#2e7d32;margin:8px 0 0}`,
    `.info{color:#1565c0;margin:8px 0 0}`,
    `.actions{display:flex;justify-content:flex-end;margin-top:8px}`,
  ]
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  step = 1;
  loading = false;
  error = '';
  success = '';
  token = '';

  formRequest = this.fb.group({
    login: ['', Validators.required],
  });

  formConfirm = this.fb.group({
    login: ['', Validators.required],
    token: ['', Validators.required],
    new_password: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', Validators.required],
  });

  request() {
    if (this.formRequest.invalid) return;
    this.loading = true; this.error = ''; this.success = '';
    const login = this.formRequest.get('login')?.value!;
    this.auth.requestPasswordReset(login).subscribe({
      next: (res) => { this.token = (res as any)?.token || ''; this.loading = false; },
      error: () => { this.error = 'Não foi possível gerar o token.'; this.loading = false; }
    });
  }

  goToStep2() {
    this.step = 2;
    const login = this.formRequest.get('login')?.value || '';
    if (login) this.formConfirm.patchValue({ login });
    if (this.token) this.formConfirm.patchValue({ token: this.token });
  }

  confirm() {
    if (this.formConfirm.invalid) return;
    const { login, token, new_password, confirm } = this.formConfirm.getRawValue();
    if (new_password !== confirm) {
      this.error = 'As senhas não conferem.'; return;
    }
    this.loading = true; this.error = ''; this.success = '';
    this.auth.confirmPasswordReset(login!, token!, new_password!).subscribe({
      next: (res) => { this.success = (res as any)?.detail || 'Senha redefinida com sucesso.'; this.loading = false; },
      error: () => { this.error = 'Não foi possível redefinir a senha.'; this.loading = false; }
    });
  }
}
