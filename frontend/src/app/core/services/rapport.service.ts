import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RapportSummary } from './dashboard.service';

export interface RapportsResponse {
  rapports: RapportSummary[];
  count: number;
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
}
