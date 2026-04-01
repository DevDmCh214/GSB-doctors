import { Component, inject } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [AsyncPipe, NgIf, RouterLink],
  template: `
    <nav class="navbar">
      <div class="navbar-left">
        <a routerLink="/" class="nav-link">dashboard</a>
        <a routerLink="/medecins" class="nav-link">liste de medecins</a>
      </div>

      <div class="navbar-center">
        <span class="navbar-title">GSB-doctors</span>
      </div>

      <div class="navbar-right">
        <ng-container *ngIf="auth.visiteur$ | async as visiteur; else loggedOut">
          <span class="nav-greeting">Salut, {{ visiteur.prenom }} !</span>
          <button class="btn-outline" (click)="onLogout()">déconnexion</button>
        </ng-container>
        <ng-template #loggedOut>
          <a routerLink="/login" class="btn-outline">connexion</a>
          <a routerLink="/register" class="btn-outline">inscription</a>
        </ng-template>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background-color: #a8bcc8;
      padding: 0 24px;
      height: 64px;
    }
    .navbar-left {
      display: flex;
      gap: 40px;
    }
    .nav-link {
      color: white;
      text-decoration: none;
      font-size: 1rem;
    }
    .navbar-center {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
    }
    .navbar-title {
      font-family: 'Caveat', cursive;
      font-size: 2rem;
      color: white;
      letter-spacing: 1px;
    }
    .navbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .nav-greeting {
      color: white;
      font-size: 1rem;
    }
    .btn-outline {
      color: white;
      background: transparent;
      border: 2px solid white;
      border-radius: 4px;
      padding: 4px 14px;
      font-size: 0.9rem;
      cursor: pointer;
      text-decoration: none;
      font-family: inherit;
    }
    .btn-outline:hover {
      background: rgba(255,255,255,0.15);
    }
  `]
})
export class NavbarComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  onLogout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}
