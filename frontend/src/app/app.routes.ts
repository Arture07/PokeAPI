import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { LoginComponent } from './pages/login/login.component';

export const routes: Routes = [
	{ path: 'login', component: LoginComponent },
	{ path: 'pokemon', canActivate: [authGuard], loadComponent: () => import('./pages/pokemon/list.component').then(m => m.PokemonListComponent) },
	{ path: '', pathMatch: 'full', redirectTo: 'pokemon' },
	{ path: '**', redirectTo: 'pokemon' }
];
