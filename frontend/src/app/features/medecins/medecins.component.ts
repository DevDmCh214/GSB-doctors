import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MedecinService, Medecin } from '../../core/services/medecin.service';
import { DoctorDetailModalComponent } from './doctor-detail-modal.component';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-medecins',
  standalone: true,
  imports: [CommonModule, FormsModule, DoctorDetailModalComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-6 py-8">

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

        <!-- Pagination -->
        <div *ngIf="!loading && !error && totalPages > 1"
             class="flex items-center justify-center gap-1 mt-8 flex-wrap">

          <button
            class="px-3 py-1 rounded border border-gray-300 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            [disabled]="currentPage === 1"
            (click)="goToPage(currentPage - 1)">
            ‹ Précédent
          </button>

          <ng-container *ngFor="let p of pageNumbers">
            <span *ngIf="p === -1" class="px-2 text-gray-400 select-none">…</span>
            <button *ngIf="p !== -1"
              class="px-3 py-1 rounded border text-sm transition-colors"
              [ngClass]="p === currentPage
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'"
              (click)="goToPage(p)">
              {{ p }}
            </button>
          </ng-container>

          <button
            class="px-3 py-1 rounded border border-gray-300 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            [disabled]="currentPage === totalPages"
            (click)="goToPage(currentPage + 1)">
            Suivant ›
          </button>

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

  medecins: Medecin[] = [];
  count = 0;
  totalPages = 1;
  currentPage = 1;
  loading = false;
  error = '';

  searchValue = '';
  selectedMedecinId: number | null = null;

  private searchSubject = new Subject<string>();
  private subs = new Subscription();

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    const cur = this.currentPage;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (cur > 3) pages.push(-1);
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
    if (cur < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  }

  ngOnInit() {
    this.subs.add(
      this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
        this.currentPage = 1;
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

  selectMedecin(id: number) {
    this.selectedMedecinId = id;
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.fetch();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private fetch() {
    this.loading = true;
    this.error = '';
    const params: { search?: string; page: number; limit: number } = {
      page: this.currentPage,
      limit: PAGE_SIZE
    };
    if (this.searchValue.trim()) params.search = this.searchValue.trim();

    this.medecinService.getMedecins(params).subscribe({
      next: (res) => {
        this.medecins = res.medecins;
        this.count = res.count;
        this.totalPages = res.totalPages ?? 1;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Impossible de charger la liste des médecins.';
      }
    });
  }
}
