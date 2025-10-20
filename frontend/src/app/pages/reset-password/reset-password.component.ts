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
  <div class="wrap themed">
    <div class="bg">
      <div class="pokeball pb1"></div>
      <div class="pokeball pb2"></div>
      <div class="pokeball pb3"></div>
    </div>
    <mat-card class="card glass">
      <h1 class="title">Redefinir senha</h1>

      <!-- Passo 1: solicitar token -->
      <form [formGroup]="formRequest" (ngSubmit)="request()" *ngIf="step===1">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Login</mat-label>
          <input matInput formControlName="login" required autocomplete="username">
        </mat-form-field>
  <button mat-raised-button color="primary" class="full cta" type="submit" [disabled]="formRequest.invalid || loading">Gerar token</button>
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
  <button mat-raised-button color="primary" class="full cta" type="submit" [disabled]="formConfirm.invalid || loading">Redefinir</button>
        <p *ngIf="success" class="ok">{{ success }}</p>
        <p *ngIf="error" class="warn">{{ error }}</p>
      </form>
    </mat-card>
  </div>
  `,
  styles: [
    `.wrap{min-height:calc(100vh - 64px);display:flex;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden}`,
    `.wrap.themed .bg{position:absolute;inset:0;pointer-events:none;}
     .pokeball{position:absolute;border-radius:50%;background:radial-gradient(circle at 50% 50%, #fff 0 34%, #d32f2f 35% 68%, #212121 69% 72%, #fff 73% 100%);opacity:.15;filter:blur(1px)}
     .pb1{width:420px;height:420px;top:-80px;left:-60px}
     .pb2{width:320px;height:320px;bottom:-60px;right:10%}
     .pb3{width:260px;height:260px;top:20%;right:-80px}
    `,
    `.card{width:420px}`,
    `.glass{background:rgba(255,255,255,.28) !important;border:1px solid rgba(255,255,255,.4);backdrop-filter:blur(8px);box-shadow:0 18px 42px rgba(0,0,0,.18);border-radius:16px !important}`,
    `.title{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-weight:800;letter-spacing:.3px}`,
    `.full{width:100%}`,
    `.cta{box-shadow:0 8px 22px rgba(25,118,210,.35)}
     .cta:focus-visible{outline:3px solid rgba(25,118,210,.35)}`,
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
