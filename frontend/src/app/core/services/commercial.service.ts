import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SpecialiteStat {
  rang: number;
  specialite: string;
  nbRapports: number;
}

@Injectable({ providedIn: 'root' })
export class CommercialService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getStats(): Observable<SpecialiteStat[]> {
    return this.http.get<{ stats: SpecialiteStat[] }>(`${this.base}/api/commercial/stats`).pipe(
      map(res => res.stats)
    );
  }
}
