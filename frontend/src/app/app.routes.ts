import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { LoginComponent } from './pages/login/login.component';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
	{ path: 'login', component: LoginComponent },
	{
		path: '',
		component: ShellComponent,
		canActivate: [authGuard],
		children: [
			{ path: 'pokemon', loadComponent: () => import('./pages/pokemon/list.component').then(m => m.PokemonListComponent) },
			{ path: 'favoritos', loadComponent: () => import('./pages/favoritos/favoritos.component').then(m => m.FavoritosComponent) },
			{ path: 'equipe', loadComponent: () => import('./pages/equipe/equipe.component').then(m => m.EquipeComponent) },
			{ path: '', pathMatch: 'full', redirectTo: 'pokemon' },
		]
	},
	{ path: '**', redirectTo: 'pokemon' }
];
