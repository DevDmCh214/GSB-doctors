import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Medecin {
  id: number;
  nom: string;
  prenom: string;
  adresse: string;
  tel: string | null;
  specialitecomplementaire: string | null;
  departement: number;
}

export interface MedecinDetail {
  medecin: {
    id: number;
    nom: string;
    prenom: string;
    adresse: string;
    tel: string | null;
    specialitecomplementaire: string | null;
  };
  rapports: { id: number; date: string; motif: string }[];
  rapportCount: number;
}

@Injectable({ providedIn: 'root' })
export class MedecinService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getMedecins(params?: { search?: string; page?: number; limit?: number }): Observable<{ medecins: Medecin[]; count: number; totalPages: number }> {
    let httpParams = new HttpParams();
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
    return this.http.get<{ medecins: Medecin[]; count: number; totalPages: number }>(`${this.base}/api/medecins`, { params: httpParams });
  }

  getMedecinById(id: number): Observable<MedecinDetail> {
    return this.http.get<MedecinDetail>(`${this.base}/api/medecins/${id}`);
  }

  deleteMedecin(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/api/medecins/${id}`);
  }

  updateMedecin(
    id: number,
    body: { adresse: string; tel: string | null }
  ): Observable<{ medecin: MedecinDetail['medecin'] }> {
    return this.http.patch<{ medecin: MedecinDetail['medecin'] }>(
      `${this.base}/api/medecins/${id}`,
      body
    );
  }
}
