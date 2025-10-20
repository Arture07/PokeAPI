import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div style="max-width:800px;margin:16px auto;padding:0 16px;display:grid;gap:16px">
      <mat-card>
        <h1>Minha Conta</h1>
        <form [formGroup]="form" (ngSubmit)="saveProfile()" style="display:grid;gap:12px">
          <mat-form-field appearance="outline"><mat-label>Login</mat-label><input matInput formControlName="login" [disabled]="true"></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Nome</mat-label><input matInput formControlName="nome"></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Email</mat-label><input matInput type="email" formControlName="email"></mat-form-field>
          <div><button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || busy">Salvar</button></div>
          <p *ngIf="msg" style="color:#2e7d32">{{ msg }}</p>
          <p *ngIf="err" style="color:#c62828">{{ err }}</p>
        </form>
      </mat-card>
      <mat-card>
        <h2>Alterar senha</h2>
        <form [formGroup]="formPwd" (ngSubmit)="changePwd()" style="display:grid;gap:12px">
          <mat-form-field appearance="outline"><mat-label>Senha atual</mat-label><input matInput type="password" formControlName="current_password"></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Nova senha</mat-label><input matInput type="password" formControlName="new_password"></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Confirmar nova senha</mat-label><input matInput type="password" formControlName="confirm"></mat-form-field>
          <div><button mat-raised-button color="warn" type="submit" [disabled]="formPwd.invalid || busy">Alterar</button></div>
          <p *ngIf="msgPwd" style="color:#2e7d32">{{ msgPwd }}</p>
          <p *ngIf="errPwd" style="color:#c62828">{{ errPwd }}</p>
        </form>
      </mat-card>
    </div>
  `
})
export class AccountSettingsComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  busy = false;
  msg = '';
  err = '';
  msgPwd = '';
  errPwd = '';

  form = this.fb.group({
    login: this.fb.control<string>({value:'', disabled:true} as any),
    nome: this.fb.control<string>('', { validators: [Validators.required] }),
    email: this.fb.control<string>('', { validators: [Validators.required, Validators.email] }),
  });
  formPwd = this.fb.group({
    current_password: this.fb.control<string>('', { validators: [Validators.required] }),
    new_password: this.fb.control<string>('', { validators: [Validators.required, Validators.minLength(8)] }),
    confirm: this.fb.control<string>('', { validators: [Validators.required] }),
  });

  ngOnInit(){
    this.auth.me().subscribe({ next: (me)=>{ this.auth.cachedMe = me; this.form.patchValue({ login: me.login, nome: me.nome, email: me.email }); }, error: ()=>{} });
  }

  saveProfile(){
    if (this.form.invalid) return;
    this.busy = true; this.msg=''; this.err='';
    const { nome, email } = this.form.getRawValue();
    this.auth.updateMe({ nome: nome||'', email: email||'' }).subscribe({ next: ()=>{ this.msg = 'Dados atualizados'; this.busy=false; }, error: ()=>{ this.err='Falha ao atualizar'; this.busy=false; } });
  }

  changePwd(){
    if (this.formPwd.invalid) return;
    const { current_password, new_password, confirm } = this.formPwd.getRawValue();
    if (new_password !== confirm) { this.errPwd='Senhas não conferem'; return; }
    this.busy = true; this.msgPwd=''; this.errPwd='';
    this.auth.changePassword(current_password!, new_password!).subscribe({ next: ()=>{ this.msgPwd = 'Senha alterada'; this.busy=false; }, error: ()=>{ this.errPwd='Falha ao alterar senha'; this.busy=false; } });
  }
}
