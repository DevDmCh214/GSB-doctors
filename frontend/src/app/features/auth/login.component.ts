import { Component, OnInit, inject } from '@angular/core';
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
              <label class="block text-gray-700 mb-1">Pseudo :</label>
              <input
                type="text"
                [(ngModel)]="login"
                name="login"
                class="w-full border border-gray-400 rounded-full px-3 py-1 focus:outline-none"
              />
            </div>
            <div class="mb-4">
              <label class="block text-gray-700 mb-1">Mot de passe :</label>
              <input
                type="password"
                [(ngModel)]="mdp"
                name="mdp"
                class="w-full border border-gray-400 rounded-full px-3 py-1 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              [disabled]="loading"
              class="w-full bg-gray-500 text-white rounded py-1.5 hover:bg-gray-600 disabled:opacity-60"
            >
              {{ loading ? 'Connexion...' : 'Se connecter' }}
            </button>
          </form>
          <p *ngIf="errorMsg" class="mt-3 text-red-600 text-sm text-center">{{ errorMsg }}</p>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  login = '';
  mdp = '';
  loading = false;
  errorMsg = '';

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/']);
    }
  }

  onSubmit(): void {
    this.errorMsg = '';
    this.loading = true;
    this.auth.login(this.login, this.mdp).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.error ?? 'Erreur de connexion';
      }
    });
  }
}
