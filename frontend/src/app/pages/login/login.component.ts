import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <div class="login">
    <h1>Entrar</h1>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <label>Login</label>
      <input formControlName="login" required autocomplete="username" />
      <label>Senha</label>
      <input type="password" formControlName="password" required autocomplete="current-password" (keyup.enter)="submit()" />
      <button type="submit" [disabled]="form.invalid || loading">Entrar</button>
      <p *ngIf="error" style="color:#c00">{{ error }}</p>
    </form>
  </div>
  `,
  styles: [`.login{max-width:360px;margin:40px auto;display:block}`]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  error = '';

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
        this.error = err?.error?.detail || 'Falha no login';
        this.loading = false;
      }
    });
  }
}
