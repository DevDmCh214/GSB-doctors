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

  getMedecins(params?: { search?: string; dept?: number }): Observable<{ medecins: Medecin[]; count: number }> {
    let httpParams = new HttpParams();
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.dept !== undefined) httpParams = httpParams.set('dept', params.dept.toString());
    return this.http.get<{ medecins: Medecin[]; count: number }>(`${this.base}/api/medecins`, { params: httpParams });
  }

  getMedecinById(id: number): Observable<MedecinDetail> {
    return this.http.get<MedecinDetail>(`${this.base}/api/medecins/${id}`);
  }
}
