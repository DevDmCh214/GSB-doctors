import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RapportSummary } from './dashboard.service';

export interface RapportsResponse {
  rapports: RapportSummary[];
  count: number;
}

export interface Echantillon {
  idMedicament: string;
  nomCommercial: string;
  libelle: string;
  quantite: number;
}

export interface RapportDetail {
  rapport: { id: number; date: string; motif: string; bilan: string };
  medecin: { id: number; nom: string; prenom: string; specialitecomplementaire: string | null };
  echantillons: Echantillon[];
}

export interface EchantillonInput {
  idMedicament: string;
  quantite: number;
}

export interface RapportInput {
  idMedecin?: number;
  date: string;
  motif: string;
  bilan: string;
  echantillons: EchantillonInput[];
}

@Injectable({ providedIn: 'root' })
export class RapportService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getRapports(params?: {
    search?: string;
    sortDate?: string;
    sortMotif?: string;
    sortNom?: string;
  }): Observable<RapportsResponse> {
    let httpParams = new HttpParams();
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.sortDate) httpParams = httpParams.set('sortDate', params.sortDate);
    if (params?.sortMotif) httpParams = httpParams.set('sortMotif', params.sortMotif);
    if (params?.sortNom) httpParams = httpParams.set('sortNom', params.sortNom);
    return this.http.get<RapportsResponse>(`${this.base}/api/rapports`, { params: httpParams });
  }

  getRapportById(id: number): Observable<RapportDetail> {
    return this.http.get<RapportDetail>(`${this.base}/api/rapports/${id}`);
  }

  createRapport(data: RapportInput): Observable<{ rapport: any }> {
    return this.http.post<{ rapport: any }>(`${this.base}/api/rapports`, data);
  }

  updateRapport(id: number, data: RapportInput): Observable<{ rapport: any }> {
    return this.http.put<{ rapport: any }>(`${this.base}/api/rapports/${id}`, data);
  }

  deleteRapport(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/api/rapports/${id}`);
  }
}
