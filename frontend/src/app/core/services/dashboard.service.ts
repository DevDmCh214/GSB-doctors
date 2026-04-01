import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MedecinSuivi {
  id: number;
  nom: string;
  prenom: string;
  rapportCount: number;
}

export interface RapportSummary {
  id: number;
  date: string;
  motif: string;
  medecin: { id: number; nom: string; prenom: string };
}

export interface DashboardData {
  medecinsSuivis: MedecinSuivi[];
  mesRapports: RapportSummary[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getDashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.base}/api/dashboard`);
  }
}
