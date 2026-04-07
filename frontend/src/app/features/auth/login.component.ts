import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="min-h-screen bg-white flex items-center justify-center">
      <div class="border border-gray-400 rounded-lg overflow-hidden w-80">
        <div class="bg-gray-500 text-white text-center py-3">
          <span class="text-lg">Connexion</span>
        </div>
        <div class="bg-white p-6">
          <form (ngSubmit)="onSubmit()">
            <div class="mb-4">
              <label class="block text-gray-700 mb-1">Pseudo <span class="text-red-500">*</span></label>
              <input
                type="text"
                [(ngModel)]="login"
                name="login"
                [disabled]="lockoutSeconds > 0"
                class="w-full border border-gray-400 rounded-full px-3 py-1 focus:outline-none disabled:opacity-50 disabled:bg-gray-100"
              />
            </div>
            <div class="mb-4">
              <label class="block text-gray-700 mb-1">Mot de passe <span class="text-red-500">*</span></label>
              <input
                type="password"
                [(ngModel)]="mdp"
                name="mdp"
                [disabled]="lockoutSeconds > 0"
                class="w-full border border-gray-400 rounded-full px-3 py-1 focus:outline-none disabled:opacity-50 disabled:bg-gray-100"
              />
            </div>
            <button
              type="submit"
              [disabled]="loading || lockoutSeconds > 0"
              class="w-full bg-gray-500 text-white rounded py-1.5 hover:bg-gray-600 disabled:opacity-60"
            >
              {{ loading ? 'Connexion...' : 'Se connecter' }}
            </button>
          </form>
          <div *ngIf="lockoutSeconds > 0" class="mt-3 bg-red-50 border border-red-200 rounded p-3 text-center">
            <p class="text-red-700 text-sm font-medium">Trop de tentatives</p>
            <p class="text-red-600 text-lg font-bold mt-1">{{ lockoutSeconds }}s</p>
            <p class="text-red-500 text-xs mt-1">Veuillez patienter avant de réessayer</p>
          </div>
          <p *ngIf="errorMsg && lockoutSeconds === 0" class="mt-3 text-red-600 text-sm text-center">{{ errorMsg }}</p>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);

  login = '';
  mdp = '';
  loading = false;
  errorMsg = '';
  lockoutSeconds = 0;
  private lockoutTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.router.navigate([this.auth.isCommercial() ? '/dashboard-commercial' : '/']);
    }
  }

  ngOnDestroy(): void {
    this.clearLockoutTimer();
  }

  onSubmit(): void {
    if (this.lockoutSeconds > 0) return;
    this.errorMsg = '';
    this.loading = true;
    this.auth.login(this.login, this.mdp).subscribe({
      next: (visiteur) => this.router.navigate([visiteur.role === 'commercial' ? '/dashboard-commercial' : '/']),
      error: (err) => {
        this.loading = false;
        if (err.status === 429 && err.error?.remainingSeconds) {
          this.startLockout(err.error.remainingSeconds);
        } else {
          this.errorMsg = err?.error?.error ?? 'Erreur de connexion';
        }
      }
    });
  }

  private startLockout(seconds: number): void {
    this.lockoutSeconds = seconds;
    this.errorMsg = '';
    this.clearLockoutTimer();
    this.lockoutTimer = setInterval(() => {
      this.lockoutSeconds--;
      if (this.lockoutSeconds <= 0) {
        this.lockoutSeconds = 0;
        this.clearLockoutTimer();
      }
    }, 1000);
  }

  private clearLockoutTimer(): void {
    if (this.lockoutTimer) {
      clearInterval(this.lockoutTimer);
      this.lockoutTimer = null;
    }
  }
}
