import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { commercialGuard } from './core/guards/commercial.guard';
import { visiteurGuard } from './core/guards/visiteur.guard';

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
    path: 'dashboard-commercial',
    canActivate: [authGuard, commercialGuard],
    loadComponent: () => import('./features/dashboard-commercial/dashboard-commercial.component').then(m => m.DashboardCommercialComponent)
  },
  {
    path: 'medecins',
    canActivate: [authGuard],
    loadComponent: () => import('./features/medecins/medecins.component').then(m => m.MedecinsComponent)
  },
  {
    path: 'rapports/new',
    canActivate: [authGuard, visiteurGuard],
    loadComponent: () => import('./features/rapports/rapport-form.component').then(m => m.RapportFormComponent)
  },
  {
    path: 'rapports/:id/edit',
    canActivate: [authGuard, visiteurGuard],
    loadComponent: () => import('./features/rapports/rapport-form.component').then(m => m.RapportFormComponent)
  },
  {
    path: 'rapports/:id',
    canActivate: [authGuard, visiteurGuard],
    loadComponent: () => import('./features/rapports/rapport-detail.component').then(m => m.RapportDetailComponent)
  },
  { path: '**', redirectTo: '' }
];
