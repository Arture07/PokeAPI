import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-register',
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
      <h1 class="title">Criar conta</h1>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Login</mat-label>
          <input matInput formControlName="login" required autocomplete="username">
          <mat-error *ngIf="fc('login').hasError('required')">Informe um login.</mat-error>
          <mat-error *ngIf="fc('login').hasError('serverExists')">Este login já está em uso.</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" required autocomplete="email">
          <mat-error *ngIf="fc('email').hasError('required')">Informe um e-mail.</mat-error>
          <mat-error *ngIf="fc('email').hasError('email')">E-mail inválido.</mat-error>
          <mat-error *ngIf="fc('email').hasError('serverExists')">Este e-mail já está em uso.</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Nome</mat-label>
          <input matInput formControlName="nome" autocomplete="name">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Senha</mat-label>
          <input matInput type="password" formControlName="password" required autocomplete="new-password">
          <mat-hint align="start">Mín. 8 caracteres, com letra maiúscula, minúscula e número.</mat-hint>
          <mat-error *ngIf="fc('password').hasError('required')">Informe uma senha.</mat-error>
          <mat-error *ngIf="fc('password').hasError('minlength')">A senha precisa ter pelo menos 8 caracteres.</mat-error>
          <mat-error *ngIf="fc('password').hasError('weak')">
            Senha fraca: adicione {{ missingPasswordReqs() }}.
          </mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Confirmar senha</mat-label>
          <input matInput type="password" formControlName="confirm" required autocomplete="new-password">
          <mat-error *ngIf="fc('confirm').hasError('required')">Confirme a senha.</mat-error>
          <mat-error *ngIf="(form.errors?.['passwordMismatch'] || form.hasError('passwordMismatch')) && (fc('confirm').touched || submitted)">As senhas não conferem.</mat-error>
        </mat-form-field>
        <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || loading" class="full cta">Registrar</button>
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
  ]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  error = '';
  submitted = false;

  // Validadores
  static passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const p = group.get('password')?.value;
    const c = group.get('confirm')?.value;
    return p && c && p !== c ? { passwordMismatch: true } : null;
  }

  passwordStrength(control: AbstractControl): ValidationErrors | null {
    const v = (control.value || '') as string;
    if (!v) return null;
    const hasUpper = /[A-Z]/.test(v);
    const hasLower = /[a-z]/.test(v);
    const hasNumber = /\d/.test(v);
    return hasUpper && hasLower && hasNumber ? null : { weak: true };
  }

  form = this.fb.group({
    login: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    nome: [''],
  password: ['', [Validators.required, Validators.minLength(8), (c: AbstractControl) => this.passwordStrength(c)]],
    confirm: ['', Validators.required],
  }, { validators: RegisterComponent.passwordsMatch });

  constructor() {
    // Limpa erros de servidor ao editar
    this.form.get('login')?.valueChanges.subscribe(() => {
      const c = this.form.get('login');
      if (c?.hasError('serverExists')) {
        const e = { ...(c.errors || {}) } as any; delete e.serverExists; c.setErrors(Object.keys(e).length ? e : null);
      }
    });
    this.form.get('email')?.valueChanges.subscribe(() => {
      const c = this.form.get('email');
      if (c?.hasError('serverExists')) {
        const e = { ...(c.errors || {}) } as any; delete e.serverExists; c.setErrors(Object.keys(e).length ? e : null);
      }
    });
  }

  submit() {
    this.submitted = true;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const payload = this.form.getRawValue();
    this.loading = true;
    this.error = '';
    this.auth.register(payload as any).subscribe({
      next: () => {
        // após registrar, faça login automático
        this.auth.login(payload.login!, payload.password!).subscribe({
          next: (res) => {
            this.auth.setTokens(res.access, res.refresh);
            this.router.navigateByUrl('/pokemon');
          },
          error: () => {
            this.loading = false;
            this.router.navigateByUrl('/login');
          }
        });
      },
      error: (err) => {
        const msg = (err?.error?.detail || err?.error?.message || '').toString().toLowerCase();
        if (msg.includes('login já utilizado')) {
          this.form.get('login')?.setErrors({ ...(this.form.get('login')?.errors||{}), serverExists: true });
        } else if (msg.includes('email já utilizado')) {
          this.form.get('email')?.setErrors({ ...(this.form.get('email')?.errors||{}), serverExists: true });
        } else {
          this.error = 'Falha ao registrar.';
        }
        this.loading = false;
      }
    });
  }
  fc(name: string) { return this.form.get(name)!; }
  missingPasswordReqs(): string {
    const v = (this.form.get('password')?.value || '') as string;
    const lacks: string[] = [];
    if (!/[A-Z]/.test(v)) lacks.push('letra maiúscula');
    if (!/[a-z]/.test(v)) lacks.push('letra minúscula');
    if (!/\d/.test(v)) lacks.push('número');
    return lacks.join(', ');
  }
  
}
