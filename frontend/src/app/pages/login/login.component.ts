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
  <div class="login-wrap themed">
    <div class="bg">
      <div class="pokeball pb1"></div>
      <div class="pokeball pb2"></div>
      <div class="pokeball pb3"></div>
    </div>
    <mat-card class="login-card glass">
      <h1 class="title">
        <mat-icon>catching_pokemon</mat-icon>
        Bem-vindo de volta
      </h1>
      <div class="demo-admin" role="note" aria-label="Credenciais de demonstração">
        <mat-icon aria-hidden="true">info</mat-icon>
        <div>
          <strong>Acesso de demonstração (Admin)</strong><br>
          <span>Login: <code>admin</code> — Senha: <code>Admin123!</code></span>
        </div>
        <button mat-stroked-button color="primary" type="button" (click)="useAdmin()">Usar admin</button>
      </div>
      <p *ngIf="expired" class="warn">Sua sessão expirou. Faça login novamente.</p>
      <form [formGroup]="form" (ngSubmit)="submit()" class="form">
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
        <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || loading" class="full cta">
          <mat-icon>login</mat-icon>
          Entrar
        </button>
        <p *ngIf="error" class="warn">{{ error }}</p>
        <div class="actions">
          <div class="left">
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
    `.login-wrap{min-height:calc(100vh - 64px);display:flex;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden}`,
    `.login-wrap.themed .bg{position:absolute;inset:0;pointer-events:none;}
     .pokeball{position:absolute;border-radius:50%;background:radial-gradient(circle at 50% 50%, #fff 0 34%, #d32f2f 35% 68%, #212121 69% 72%, #fff 73% 100%);opacity:.15;filter:blur(1px)}
     .pb1{width:420px;height:420px;top:-80px;left:-60px}
     .pb2{width:320px;height:320px;bottom:-60px;right:10%}
     .pb3{width:260px;height:260px;top:20%;right:-80px}
    `,
    `.login-card{width:380px}`,
    `.glass{background:rgba(255,255,255,.28) !important;border:1px solid rgba(255,255,255,.4);backdrop-filter:blur(8px);box-shadow:0 18px 42px rgba(0,0,0,.18);border-radius:16px !important}`,
    `.title{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-weight:800;letter-spacing:.3px}`,
    `.full{width:100%}`,
    `.form{display:flex;flex-direction:column;gap:10px}`,
    `.cta{box-shadow:0 8px 22px rgba(25,118,210,.35)}
     .cta:focus-visible{outline:3px solid rgba(25,118,210,.35)}`,
    `.warn{color:#c62828;margin:8px 0 0}`,
    `.actions{display:flex;align-items:center;gap:8px;margin-top:12px;justify-content:space-between;flex-wrap:wrap}`,
    `.actions .left{display:flex;align-items:center;gap:8px}`,
    `.demo-admin{display:flex;align-items:center;gap:10px;background:rgba(103,58,183,.1);border:1px dashed rgba(103,58,183,.4);border-radius:10px;padding:8px 12px;margin:8px 0;line-height:1.4}`,
    `.demo-admin code{background:#fff; padding:0 4px; border-radius:4px;}`,
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

  useAdmin() {
    this.form.patchValue({ login: 'admin', password: 'Admin123!' });
    this.showPassword = true;
  }

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
