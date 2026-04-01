import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MedecinService, Medecin } from '../../core/services/medecin.service';
import { AuthService } from '../../core/services/auth.service';
import { DoctorDetailModalComponent } from './doctor-detail-modal.component';

@Component({
  selector: 'app-medecins',
  standalone: true,
  imports: [CommonModule, FormsModule, DoctorDetailModalComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-6 py-8">

        <!-- Toggle -->
        <div class="flex flex-col items-center mb-4">
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-600">Mon département</span>
            <button
              type="button"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
              [class.bg-gray-700]="deptFilter"
              [class.bg-gray-300]="!deptFilter"
              (click)="toggleDept()">
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                [class.translate-x-6]="deptFilter"
                [class.translate-x-1]="!deptFilter">
              </span>
            </button>
          </div>
        </div>

        <!-- Search bar -->
        <div class="relative mb-3">
          <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
               xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
          </svg>
          <input
            type="text"
            class="w-full border border-gray-300 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            placeholder="Rechercher un médecin..."
            [(ngModel)]="searchValue"
            (ngModelChange)="onSearchChange($event)" />
        </div>

        <!-- Count -->
        <p class="text-center text-sm text-gray-500 mb-6">{{ count }} médecins trouvés</p>

        <!-- Loading -->
        <div *ngIf="loading" class="text-center text-gray-400 py-12">Chargement...</div>

        <!-- Error -->
        <div *ngIf="!loading && error" class="text-center text-red-500 py-12">{{ error }}</div>

        <!-- Cards grid -->
        <div *ngIf="!loading && !error" class="grid grid-cols-4 gap-4">
          <div *ngFor="let m of medecins"
               class="border border-gray-200 rounded-xl p-4 bg-white cursor-pointer hover:shadow-md hover:border-gray-300 transition-shadow"
               (click)="selectMedecin(m.id)">
            <p class="font-semibold text-gray-800 text-sm mb-1">
              Dr. {{ m.nom.toUpperCase() }} {{ m.prenom }}
            </p>
            <p *ngIf="m.specialitecomplementaire"
               class="text-xs text-gray-500 mb-2 truncate">
              {{ m.specialitecomplementaire }}
            </p>
            <div class="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 9.75L12 3l9 6.75V21a1 1 0 01-1 1H4a1 1 0 01-1-1V9.75z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 22V12h6v10" />
              </svg>
              <span class="truncate">{{ m.adresse }}</span>
            </div>
            <div *ngIf="m.tel" class="flex items-center gap-1 text-xs text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.68l1.13 3.38a1 1 0 01-.23 1.05L7.5 9.5a16.06 16.06 0 006.99 7l1.38-1.63a1 1 0 011.05-.23l3.38 1.13a1 1 0 01.68.95V19a2 2 0 01-2 2C9.16 21 3 14.84 3 7V5z" />
              </svg>
              <span>{{ m.tel }}</span>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Doctor detail modal -->
    <app-doctor-detail-modal
      [medecinId]="selectedMedecinId"
      (close)="selectedMedecinId = null">
    </app-doctor-detail-modal>
  `
})
export class MedecinsComponent implements OnInit, OnDestroy {
  private medecinService = inject(MedecinService);
  private authService = inject(AuthService);

  medecins: Medecin[] = [];
  count = 0;
  loading = false;
  error = '';

  searchValue = '';
  deptFilter = false;
  selectedMedecinId: number | null = null;

  private searchSubject = new Subject<string>();
  private subs = new Subscription();

  ngOnInit() {
    this.subs.add(
      this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
        this.fetch();
      })
    );
    this.fetch();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  onSearchChange(value: string) {
    this.searchSubject.next(value);
  }

  toggleDept() {
    this.deptFilter = !this.deptFilter;
    this.fetch();
  }

  selectMedecin(id: number) {
    this.selectedMedecinId = id;
  }

  private fetch() {
    this.loading = true;
    this.error = '';
    const params: { search?: string; dept?: number } = {};

    if (this.searchValue.trim()) {
      params.search = this.searchValue.trim();
    }

    if (this.deptFilter) {
      const visiteur = this.authService.currentVisiteur();
      if (visiteur?.cp) {
        params.dept = parseInt(visiteur.cp.substring(0, 2), 10);
      }
    }

    this.medecinService.getMedecins(params).subscribe({
      next: (res) => {
        this.medecins = res.medecins;
        this.count = res.count;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Impossible de charger la liste des médecins.';
      }
    });
  }
}
