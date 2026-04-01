import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MedicamentSummary {
  id: string;
  nomCommercial: string;
  libelle: string;
  idFamille: string;
}

export interface MedicamentDetail {
  id: string;
  nomCommercial: string;
  idFamille: string;
  libelle: string;
  composition: string;
  effets: string;
  contreIndications: string;
}

@Injectable({ providedIn: 'root' })
export class MedicamentService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getMedicaments(params?: { search?: string }): Observable<{ medicaments: MedicamentSummary[] }> {
    let httpParams = new HttpParams();
    if (params?.search) httpParams = httpParams.set('search', params.search);
    return this.http.get<{ medicaments: MedicamentSummary[] }>(`${this.base}/api/medicaments`, { params: httpParams });
  }

  getMedicamentById(id: string): Observable<{ medicament: MedicamentDetail }> {
    return this.http.get<{ medicament: MedicamentDetail }>(`${this.base}/api/medicaments/${id}`);
  }
}
