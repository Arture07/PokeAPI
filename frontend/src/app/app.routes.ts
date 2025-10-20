import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { LoginComponent } from './pages/login/login.component';
import { ShellComponent } from './layout/shell.component';
import { RegisterComponent } from './pages/register/register.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { adminGuard } from './core/admin.guard';
import { AccountSettingsComponent } from './pages/account/settings.component';

export const routes: Routes = [
	{ path: 'login', component: LoginComponent },
	{ path: 'registrar', component: RegisterComponent },
	{ path: 'esqueci-senha', component: ResetPasswordComponent },
	{
		path: '',
		component: ShellComponent,
		canActivate: [authGuard],
		children: [
			{ path: 'pokemon', loadComponent: () => import('./pages/pokemon/list.component').then(m => m.PokemonListComponent) },
					{ path: 'pokemon/:codigo', loadComponent: () => import('./pages/pokemon/detail.component').then(m => m.PokemonDetailComponent) },
			{ path: 'favoritos', loadComponent: () => import('./pages/favoritos/favoritos.component').then(m => m.FavoritosComponent) },
			{ path: 'equipe', loadComponent: () => import('./pages/equipe/equipe.component').then(m => m.EquipeComponent) },
			{ path: 'conta', component: AccountSettingsComponent },
			{ path: '', pathMatch: 'full', redirectTo: 'pokemon' },
					{ path: 'admin/users', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/users-list.component').then(m => m.AdminUsersListComponent) },
					{ path: 'admin/users/:id', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/user-detail.component').then(m => m.AdminUserDetailComponent) },
		]
	},
	{ path: '**', redirectTo: 'pokemon' }
];
