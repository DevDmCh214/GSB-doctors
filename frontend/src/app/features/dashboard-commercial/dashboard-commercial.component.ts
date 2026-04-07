import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommercialService, SpecialiteStat } from '../../core/services/commercial.service';

@Component({
  selector: 'app-dashboard-commercial',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex justify-center p-6" style="min-height: calc(100vh - 64px);">
      <div class="bg-white border border-gray-300 rounded-lg p-6 w-full" style="max-width: 800px;">
        <h2 class="text-lg font-semibold mb-4 text-center">Statistiques par specialite</h2>

        <div *ngIf="loading" class="text-sm text-gray-400 text-center">Chargement...</div>
        <div *ngIf="error" class="text-sm text-red-500 text-center">{{ error }}</div>

        <table *ngIf="!loading && !error && stats.length > 0" class="w-full border-collapse">
          <thead>
            <tr class="bg-gray-100">
              <th class="border border-gray-300 px-4 py-2 text-left text-sm font-semibold" style="width: 80px;">Rang</th>
              <th class="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Specialite</th>
              <th class="border border-gray-300 px-4 py-2 text-right text-sm font-semibold" style="width: 160px;">Nb rapports</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of stats" class="hover:bg-gray-50">
              <td class="border border-gray-300 px-4 py-2 text-sm text-center">{{ s.rang }}</td>
              <td class="border border-gray-300 px-4 py-2 text-sm">{{ s.specialite }}</td>
              <td class="border border-gray-300 px-4 py-2 text-sm text-right">{{ s.nbRapports }}</td>
            </tr>
          </tbody>
        </table>

        <p *ngIf="!loading && !error && stats.length === 0" class="text-sm text-gray-400 text-center">
          Aucune donnee disponible.
        </p>
      </div>
    </div>
  `
})
export class DashboardCommercialComponent implements OnInit {
  private commercialService = inject(CommercialService);

  stats: SpecialiteStat[] = [];
  loading = true;
  error = '';

  ngOnInit(): void {
    this.commercialService.getStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.error ?? 'Erreur lors du chargement des statistiques';
        this.loading = false;
      }
    });
  }
}
