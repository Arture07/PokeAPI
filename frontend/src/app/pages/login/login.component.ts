import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, RouterModule],
  template: `
  <div class="login-wrap">
    <mat-card class="login-card">
      <h1 style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <mat-icon color="primary">login</mat-icon>
        Entrar
      </h1>
      <p *ngIf="expired" class="warn">Sua sessão expirou. Faça login novamente.</p>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Login</mat-label>
          <input matInput formControlName="login" required autocomplete="username">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Senha</mat-label>
          <input matInput [type]="showPassword ? 'text' : 'password'" formControlName="password" required autocomplete="current-password" (keyup.enter)="submit()">
          <button mat-icon-button matSuffix type="button" (click)="showPassword = !showPassword" [attr.aria-label]="showPassword ? 'Ocultar senha' : 'Mostrar senha'" [attr.aria-pressed]="showPassword">
            <mat-icon>{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
        </mat-form-field>
        <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || loading" class="full">
          <mat-icon>arrow_forward</mat-icon>
          Entrar
        </button>
        <p *ngIf="error" class="warn">{{ error }}</p>
        <div class="actions" style="justify-content:space-between">
          <div style="display:flex;align-items:center;gap:8px">
            <span>Não tem conta?</span>
            <button mat-button color="primary" routerLink="/registrar">Criar conta</button>
          </div>
          <button mat-button routerLink="/esqueci-senha">Esqueci minha senha</button>
        </div>
      </form>
    </mat-card>
  </div>
  `,
  styles: [
    `.login-wrap{min-height:calc(100vh - 64px);display:flex;align-items:center;justify-content:center;padding:24px}`,
    `.login-card{width:360px}`,
    `.full{width:100%}`,
    `.warn{color:#c62828;margin:8px 0 0}`,
    `.actions{display:flex;align-items:center;gap:8px;margin-top:12px;justify-content:space-between;flex-wrap:wrap}`,
  ]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = false;
  error = '';
  expired = false;
  showPassword = false;

  form = this.fb.group({
    login: ['', Validators.required],
    password: ['', Validators.required],
  });

  submit() {
    if (this.form.invalid) return;
    const { login, password } = this.form.getRawValue();
    this.loading = true;
    this.error = '';
    this.auth.login(login!, password!).subscribe({
      next: (res) => {
        this.auth.setTokens(res.access, res.refresh);
        this.auth.me().subscribe({
          next: () => this.router.navigateByUrl('/pokemon'),
          error: () => this.router.navigateByUrl('/pokemon')
        });
      },
      error: (err) => {
        const raw = (err?.error?.detail || err?.error?.message || '').toString().toLowerCase();
        if (raw.includes('no active account') || raw.includes('given credentials')) {
          this.error = 'Login ou senha inválidos.';
        } else if (err?.status === 0) {
          this.error = 'Não foi possível contatar o servidor. Tente novamente.';
        } else {
          this.error = 'Falha no login.';
        }
        this.loading = false;
      }
    });
  }

  ngOnInit() {
    this.expired = this.route.snapshot.queryParamMap.get('expired') === '1';
  }
}
