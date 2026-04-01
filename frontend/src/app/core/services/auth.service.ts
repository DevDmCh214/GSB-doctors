import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Visiteur {
  id: string;
  nom: string;
  prenom: string;
  cp: string;
}

export interface RegisterData {
  nom: string;
  prenom: string;
  login: string;
  mdp: string;
  adresse: string;
  cp: string;
  ville: string;
  dateEmbauche: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  private _visiteur$ = new BehaviorSubject<Visiteur | null>(null);
  readonly visiteur$ = this._visiteur$.asObservable();

  isLoggedIn(): boolean {
    return this._visiteur$.value !== null;
  }

  currentVisiteur(): Visiteur | null {
    return this._visiteur$.value;
  }

  me(): Observable<Visiteur> {
    return this.http.get<{ visiteur: Visiteur }>(`${this.base}/api/auth/me`).pipe(
      map(res => res.visiteur),
      tap(visiteur => this._visiteur$.next(visiteur))
    );
  }

  login(login: string, mdp: string): Observable<Visiteur> {
    return this.http.post<{ visiteur: Visiteur }>(`${this.base}/api/auth/login`, { login, mdp }).pipe(
      map(res => res.visiteur),
      tap(visiteur => this._visiteur$.next(visiteur))
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.base}/api/auth/logout`, {}).pipe(
      tap(() => this._visiteur$.next(null))
    );
  }

  register(data: RegisterData): Observable<Visiteur> {
    return this.http.post<{ visiteur: Visiteur }>(`${this.base}/api/auth/register`, data).pipe(
      map(res => res.visiteur),
      tap(visiteur => this._visiteur$.next(visiteur))
    );
  }
}
