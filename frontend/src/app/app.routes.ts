import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'medecins',
    canActivate: [authGuard],
    loadComponent: () => import('./features/medecins/medecins.component').then(m => m.MedecinsComponent)
  },
  {
    path: 'rapports/new',
    canActivate: [authGuard],
    loadComponent: () => import('./features/rapports/rapport-form.component').then(m => m.RapportFormComponent)
  },
  {
    path: 'rapports/:id/edit',
    canActivate: [authGuard],
    loadComponent: () => import('./features/rapports/rapport-form.component').then(m => m.RapportFormComponent)
  },
  {
    path: 'rapports/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/rapports/rapport-detail.component').then(m => m.RapportDetailComponent)
  },
  { path: '**', redirectTo: '' }
];
