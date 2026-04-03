import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="min-h-screen bg-white flex items-center justify-center">
      <div class="border border-gray-400 rounded-lg overflow-hidden w-80">
        <div class="bg-gray-500 text-white text-center py-3">
          <span class="text-lg">Inscription</span>
        </div>
        <div class="bg-white p-4">
          <form (ngSubmit)="onSubmit()">
            <!-- Row 1: Nom | Prénom -->
            <div class="flex gap-2 mb-2">
              <div class="flex-1">
                <label class="block text-gray-700 text-sm mb-0.5">Nom :</label>
                <input
                  type="text"
                  [(ngModel)]="nom"
                  name="nom"
                  class="w-full border border-gray-400 rounded px-2 py-0.5 text-sm focus:outline-none"
                />
              </div>
              <div class="flex-1">
                <label class="block text-gray-700 text-sm mb-0.5">Prénom :</label>
                <input
                  type="text"
                  [(ngModel)]="prenom"
                  name="prenom"
                  class="w-full border border-gray-400 rounded px-2 py-0.5 text-sm focus:outline-none"
                />
              </div>
            </div>
            <!-- Row 2: Pseudo -->
            <div class="mb-2">
              <label class="block text-gray-700 text-sm mb-0.5">Pseudo :</label>
              <input
                type="text"
                [(ngModel)]="login"
                name="login"
                class="w-full border border-gray-400 rounded px-2 py-0.5 text-sm focus:outline-none"
              />
            </div>
            <!-- Row 3: Mot de passe -->
            <div class="mb-2">
              <label class="block text-gray-700 text-sm mb-0.5">Mot de passe :</label>
              <input
                type="password"
                [(ngModel)]="mdp"
                name="mdp"
                class="w-full border border-gray-400 rounded px-2 py-0.5 text-sm focus:outline-none"
              />
            </div>
            <!-- Row 4: Adresse -->
            <div class="mb-2">
              <label class="block text-gray-700 text-sm mb-0.5">Adresse :</label>
              <input
                type="text"
                [(ngModel)]="adresse"
                name="adresse"
                class="w-full border border-gray-400 rounded px-2 py-0.5 text-sm focus:outline-none"
              />
            </div>
            <!-- Row 5: Code postal | Ville -->
            <div class="flex gap-2 mb-2">
              <div class="flex-1">
                <label class="block text-gray-700 text-sm mb-0.5">Code postal :</label>
                <input
                  type="text"
                  [(ngModel)]="cp"
                  name="cp"
                  class="w-full border border-gray-400 rounded px-2 py-0.5 text-sm focus:outline-none"
                />
              </div>
              <div class="flex-1">
                <label class="block text-gray-700 text-sm mb-0.5">Ville :</label>
                <input
                  type="text"
                  [(ngModel)]="ville"
                  name="ville"
                  class="w-full border border-gray-400 rounded px-2 py-0.5 text-sm focus:outline-none"
                />
              </div>
            </div>
            <!-- Row 6: Date d'embauche | Valider -->
            <div class="flex gap-2 items-end mb-2">
              <div class="flex-1">
                <label class="block text-gray-700 text-sm mb-0.5">Date d'embauche :</label>
                <input
                  type="date"
                  [(ngModel)]="dateEmbauche"
                  name="dateEmbauche"
                  class="w-full border border-gray-400 rounded px-2 py-0.5 text-sm focus:outline-none"
                />
              </div>
              <div class="flex-1">
                <button
                  type="submit"
                  [disabled]="loading"
                  class="w-full bg-gray-600 text-white rounded py-0.5 text-sm hover:bg-gray-700 disabled:opacity-60"
                >
                  {{ loading ? '...' : 'Valider' }}
                </button>
              </div>
            </div>
          </form>
          <p *ngIf="errorMsg" class="mt-2 text-red-600 text-sm text-center">{{ errorMsg }}</p>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  nom = '';
  prenom = '';
  login = '';
  mdp = '';
  adresse = '';
  cp = '';
  ville = '';
  dateEmbauche = '';
  loading = false;
  errorMsg = '';

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/']);
    }
  }

  onSubmit(): void {
    this.errorMsg = '';

    // Client-side validation
    if (!this.nom.trim() || !this.prenom.trim()) {
      this.errorMsg = 'Le nom et le prénom sont requis.';
      return;
    }
    if (!this.login.trim()) {
      this.errorMsg = 'Le pseudo est requis.';
      return;
    }
    if (this.mdp.length < 4) {
      this.errorMsg = 'Le mot de passe doit contenir au moins 4 caractères.';
      return;
    }
    if (this.cp && !/^\d{5}$/.test(this.cp.trim())) {
      this.errorMsg = 'Le code postal doit contenir exactement 5 chiffres.';
      return;
    }

    this.loading = true;
    this.auth.register({
      nom: this.nom,
      prenom: this.prenom,
      login: this.login,
      mdp: this.mdp,
      adresse: this.adresse,
      cp: this.cp,
      ville: this.ville,
      dateEmbauche: this.dateEmbauche
    }).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.error ?? 'Erreur lors de l\'inscription';
      }
    });
  }
}
