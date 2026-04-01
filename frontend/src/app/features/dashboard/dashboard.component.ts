import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { DashboardService, MedecinSuivi, RapportSummary } from '../../core/services/dashboard.service';
import { RapportService } from '../../core/services/rapport.service';

type SortField = 'date' | 'nom' | 'motif';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex gap-4 p-4 h-full" style="min-height: calc(100vh - 48px);">

      <!-- LEFT PANEL: Médecins suivis -->
      <div class="flex flex-col bg-white border border-gray-300 rounded-lg p-4" style="width: 35%; min-width: 260px;">
        <h2 class="text-base font-semibold mb-3">Medecins suivis</h2>

        <input
          type="text"
          [(ngModel)]="medecinSearch"
          (ngModelChange)="onMedecinSearch()"
          placeholder="Rechercher..."
          class="w-full border border-gray-300 rounded px-2 py-1 text-sm mb-2 outline-none focus:border-gray-500"
        />

        <p class="text-sm text-gray-500 mb-3">{{ filteredMedecins.length }} medecins</p>

        <div *ngIf="loading" class="text-sm text-gray-400">Chargement...</div>
        <div *ngIf="error" class="text-sm text-red-500">{{ error }}</div>

        <div class="flex flex-col gap-2 overflow-y-auto">
          <div
            *ngFor="let m of filteredMedecins"
            (click)="goToMedecins()"
            class="flex items-center justify-between border border-gray-300 rounded-full px-3 py-1 cursor-pointer hover:bg-gray-50"
          >
            <span class="text-sm">{{ m.nom }} {{ m.prenom }}</span>
            <span class="text-xs text-gray-500 ml-2 whitespace-nowrap">{{ m.rapportCount }} rapports</span>
          </div>
        </div>
      </div>

      <!-- RIGHT PANEL: Mes rapports -->
      <div class="flex flex-col bg-white border border-gray-300 rounded-lg p-4 flex-1">
        <h2 class="text-base font-semibold mb-3">Mes rapports</h2>

        <!-- Search + count -->
        <div class="flex items-center gap-3 mb-3">
          <input
            type="text"
            [(ngModel)]="rapportSearch"
            (ngModelChange)="onRapportSearchChange($event)"
            placeholder="Rechercher..."
            class="border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-gray-500"
            style="width: 220px;"
          />
          <span class="text-sm text-gray-500">{{ rapportCount }} rapports trouvés</span>
        </div>

        <!-- Column headers -->
        <div class="flex items-center text-sm font-medium text-gray-600 mb-1 px-1">
          <div class="cursor-pointer select-none flex items-center gap-1" style="width: 110px;" (click)="toggleSort('date')">
            date <span>{{ getSortIcon('date') }}</span>
          </div>
          <div class="cursor-pointer select-none flex items-center gap-1 flex-1" (click)="toggleSort('nom')">
            nom/prenom <span>{{ getSortIcon('nom') }}</span>
          </div>
          <div class="cursor-pointer select-none flex items-center gap-1 flex-1" (click)="toggleSort('motif')">
            motif <span>{{ getSortIcon('motif') }}</span>
          </div>
          <div style="width: 32px;"></div>
        </div>

        <div *ngIf="rapportLoading" class="text-sm text-gray-400 py-2">Chargement...</div>
        <div *ngIf="rapportError" class="text-sm text-red-500 py-2">{{ rapportError }}</div>

        <!-- Rapport rows -->
        <div class="flex flex-col gap-1 overflow-y-auto">
          <div
            *ngFor="let r of rapports"
            class="flex items-center border border-gray-200 rounded px-1 py-1 text-sm hover:bg-gray-50"
          >
            <div style="width: 110px;" class="text-gray-700">{{ formatDate(r.date) }}</div>
            <div class="flex-1 text-gray-700">{{ r.medecin.nom }} {{ r.medecin.prenom }}</div>
            <div class="flex-1 text-gray-700 truncate">{{ r.motif }}</div>
            <button
              (click)="goToRapport(r.id)"
              class="w-6 h-6 rounded-full bg-gray-800 text-white text-xs flex items-center justify-center flex-shrink-0 hover:bg-gray-600"
            >i</button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private rapportService = inject(RapportService);
  private router = inject(Router);

  // Left panel state
  loading = false;
  error = '';
  allMedecins: MedecinSuivi[] = [];
  filteredMedecins: MedecinSuivi[] = [];
  medecinSearch = '';

  // Right panel state
  rapportLoading = false;
  rapportError = '';
  rapports: RapportSummary[] = [];
  rapportCount = 0;
  rapportSearch = '';
  sortField: SortField | null = null;
  sortDir: SortDir = 'asc';

  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  ngOnInit() {
    this.loading = true;
    this.dashboardService.getDashboard().subscribe({
      next: data => {
        this.loading = false;
        this.allMedecins = data.medecinsSuivis;
        this.filteredMedecins = [...this.allMedecins];
      },
      error: () => {
        this.loading = false;
        this.error = 'Erreur lors du chargement des données.';
      }
    });

    // Set up debounced search for rapports
    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(search => {
        this.rapportLoading = true;
        this.rapportError = '';
        return this.rapportService.getRapports({ search, ...this.buildSortParams() });
      })
    ).subscribe({
      next: res => {
        this.rapportLoading = false;
        this.rapports = res.rapports;
        this.rapportCount = res.count;
      },
      error: () => {
        this.rapportLoading = false;
        this.rapportError = 'Erreur lors du chargement des rapports.';
      }
    });

    // Initial rapports load
    this.fetchRapports();
  }

  ngOnDestroy() {
    this.searchSub?.unsubscribe();
  }

  onMedecinSearch() {
    const q = this.medecinSearch.toLowerCase();
    this.filteredMedecins = q
      ? this.allMedecins.filter(m =>
          m.nom.toLowerCase().includes(q) || m.prenom.toLowerCase().includes(q)
        )
      : [...this.allMedecins];
  }

  onRapportSearchChange(value: string) {
    this.searchSubject.next(value);
  }

  toggleSort(field: SortField) {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'asc';
    }
    this.fetchRapports();
  }

  getSortIcon(field: SortField): string {
    if (this.sortField !== field) return '↕';
    return this.sortDir === 'asc' ? '↑' : '↓';
  }

  private buildSortParams(): { sortDate?: string; sortNom?: string; sortMotif?: string } {
    if (!this.sortField) return {};
    if (this.sortField === 'date') return { sortDate: this.sortDir };
    if (this.sortField === 'nom') return { sortNom: this.sortDir };
    if (this.sortField === 'motif') return { sortMotif: this.sortDir };
    return {};
  }

  private fetchRapports() {
    this.rapportLoading = true;
    this.rapportError = '';
    this.rapportService.getRapports({
      search: this.rapportSearch || undefined,
      ...this.buildSortParams()
    }).subscribe({
      next: res => {
        this.rapportLoading = false;
        this.rapports = res.rapports;
        this.rapportCount = res.count;
      },
      error: () => {
        this.rapportLoading = false;
        this.rapportError = 'Erreur lors du chargement des rapports.';
      }
    });
  }

  formatDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  goToMedecins() {
    this.router.navigate(['/medecins']);
  }

  goToRapport(id: number) {
    this.router.navigate(['/rapports', id]);
  }
}
