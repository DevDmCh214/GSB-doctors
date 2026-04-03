import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MedecinService, MedecinDetail } from '../../core/services/medecin.service';

@Component({
  selector: 'app-doctor-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Overlay -->
    <div *ngIf="medecinId !== null"
         class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
         (click)="onOverlayClick($event)">
      <!-- Modal card -->
      <div class="bg-white rounded-2xl shadow-xl w-[560px] max-h-[80vh] flex flex-col p-6 relative"
           (click)="$event.stopPropagation()">

        <!-- Edit / cancel edit top-left -->
        <button type="button"
                class="absolute top-4 left-4 text-gray-400 hover:text-gray-600"
                [title]="editing ? 'Annuler la modification' : 'Modifier adresse et téléphone'"
                (click)="toggleEdit()">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-1.657.985l-3.181.795.795-3.181A4 4 0 019 13z" />
          </svg>
        </button>

        <!-- Close button top-right -->
        <button class="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl font-bold leading-none"
                (click)="close.emit()">×</button>

        <!-- Loading state -->
        <div *ngIf="loading" class="text-center py-8 text-gray-400">Chargement...</div>

        <!-- Error state -->
        <div *ngIf="!loading && error" class="text-center py-8 text-red-500">{{ error }}</div>

        <!-- Content -->
        <ng-container *ngIf="!loading && !error && detail">
          <!-- Title -->
          <div class="text-center mb-4">
            <h2 class="text-xl font-semibold">
              Dr. {{ detail.medecin.nom.toUpperCase() }} {{ detail.medecin.prenom }}
            </h2>
            <p *ngIf="detail.medecin.specialitecomplementaire" class="text-sm text-gray-500 mt-1">
              {{ detail.medecin.specialitecomplementaire }}
            </p>
          </div>

          <!-- Address + Phone (read) -->
          <div *ngIf="!editing" class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 text-sm text-gray-600">
            <div class="flex items-start gap-2 flex-1 min-w-0">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 9.75L12 3l9 6.75V21a1 1 0 01-1 1H4a1 1 0 01-1-1V9.75z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 22V12h6v10" />
              </svg>
              <span>{{ detail.medecin.adresse }}</span>
            </div>
            <div class="flex items-center gap-2 shrink-0 sm:ml-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.68l1.13 3.38a1 1 0 01-.23 1.05L7.5 9.5a16.06 16.06 0 006.99 7l1.38-1.63a1 1 0 011.05-.23l3.38 1.13a1 1 0 01.68.95V19a2 2 0 01-2 2C9.16 21 3 14.84 3 7V5z" />
              </svg>
              <span>{{ detail.medecin.tel || '—' }}</span>
            </div>
          </div>

          <!-- Address + Phone (edit) -->
          <div *ngIf="editing" class="mb-4 space-y-3">
            <div>
              <label class="block text-xs text-gray-400 mb-1">adresse</label>
              <input type="text"
                     maxlength="80"
                     class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-gray-400"
                     [(ngModel)]="editAdresse" />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">téléphone</label>
              <input type="text"
                     maxlength="15"
                     class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-gray-400"
                     [(ngModel)]="editTel"
                     placeholder="Téléphone (optionnel)" />
            </div>
            <div *ngIf="saveError" class="text-red-500 text-sm">{{ saveError }}</div>
            <div class="flex justify-between">
              <button type="button"
                      class="px-5 py-2 rounded-full border border-gray-300 text-gray-600 text-sm hover:bg-gray-50"
                      (click)="showDeleteConfirm = true">
                supprimer
              </button>
              <button type="button"
                      class="px-6 py-2 rounded-full bg-gray-800 text-white text-sm hover:bg-gray-900 disabled:opacity-50"
                      [disabled]="saving"
                      (click)="saveEdit()">
                {{ saving ? 'Enregistrement...' : 'OK' }}
              </button>
            </div>
          </div>

          <!-- Divider -->
          <hr class="border-gray-200 mb-3" />

          <!-- Rapport table headers -->
          <div class="flex items-center text-xs text-gray-500 mb-2 px-1">
            <button class="flex items-center gap-1 mr-6 hover:text-gray-700" (click)="sortBy('date')">
              date
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
            <button class="flex items-center gap-1 hover:text-gray-700" (click)="sortBy('motif')">
              motif
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
            <span class="ml-auto text-gray-400">Il y a {{ detail.rapportCount }} rapports</span>
          </div>

          <!-- Rapport rows (scrollable) -->
          <div class="overflow-y-auto flex-1 max-h-48 space-y-1">
            <div *ngIf="sortedRapports.length === 0" class="text-center text-gray-400 text-sm py-4">
              Aucun rapport
            </div>
            <div *ngFor="let r of sortedRapports"
                 class="flex items-center text-sm border border-gray-100 rounded-lg px-3 py-2 gap-3">
              <span class="text-gray-600 w-24 shrink-0">{{ formatDate(r.date) }}</span>
              <span class="flex-1 text-gray-700 truncate">{{ r.motif }}</span>
              <button class="w-6 h-6 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center shrink-0 hover:bg-gray-900"
                      (click)="openRapport(r.id)">i</button>
            </div>
          </div>

          <!-- nouveau rapport button -->
          <div class="mt-4 flex justify-center">
            <button class="px-6 py-2 rounded-full border border-gray-300 text-gray-600 text-sm hover:bg-gray-50"
                    (click)="newRapport()">
              nouveau rapport
            </button>
          </div>
        </ng-container>
      </div>
    </div>

    <!-- Delete confirmation overlay -->
    <div *ngIf="showDeleteConfirm"
         class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[60]">
      <div class="bg-white rounded-xl shadow-xl p-6 w-96">
        <h3 class="text-gray-800 font-semibold mb-2">Voulez-vous supprimer ce médecin ?</h3>
        <p class="text-gray-600 text-sm mb-4">Toutes ces donnes et rapports seront perdus.</p>
        <div *ngIf="deleteError" class="text-red-500 text-sm mb-3">{{ deleteError }}</div>
        <div class="flex gap-3 justify-end">
          <button class="px-4 py-2 rounded-full border border-gray-300 text-gray-600 text-sm hover:bg-gray-50"
                  (click)="showDeleteConfirm = false; deleteError = null">Non</button>
          <button class="px-4 py-2 rounded-full bg-gray-800 text-white text-sm hover:bg-gray-900 disabled:opacity-50"
                  [disabled]="deleting"
                  (click)="doDelete()">
            {{ deleting ? 'Suppression...' : 'Oui' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class DoctorDetailModalComponent implements OnChanges {
  @Input() medecinId: number | null = null;
  @Output() close = new EventEmitter<void>();

  private medecinService = inject(MedecinService);
  private router = inject(Router);

  detail: MedecinDetail | null = null;
  loading = false;
  error: string | null = null;

  editing = false;
  editAdresse = '';
  editTel = '';
  saving = false;
  saveError: string | null = null;
  showDeleteConfirm = false;
  deleting = false;
  deleteError: string | null = null;

  sortField: 'date' | 'motif' = 'date';
  sortDir: 'asc' | 'desc' = 'desc';

  get sortedRapports() {
    if (!this.detail) return [];
    return [...this.detail.rapports].sort((a, b) => {
      const aVal = this.sortField === 'date' ? a.date : (a.motif ?? '');
      const bVal = this.sortField === 'date' ? b.date : (b.motif ?? '');
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return this.sortDir === 'asc' ? cmp : -cmp;
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes['medecinId']) return;
    if (this.medecinId === null) {
      this.editing = false;
      this.showDeleteConfirm = false;
      this.detail = null;
      return;
    }
    this.editing = false;
    this.saveError = null;
    this.showDeleteConfirm = false;
    this.deleteError = null;
    this.loading = true;
    this.detail = null;
    this.error = null;
    this.medecinService.getMedecinById(this.medecinId).subscribe({
      next: (d) => {
        this.detail = d;
        this.syncEditFromDetail();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Impossible de charger les informations du médecin.';
      }
    });
  }

  private syncEditFromDetail() {
    if (!this.detail) return;
    this.editAdresse = this.detail.medecin.adresse;
    this.editTel = this.detail.medecin.tel ?? '';
  }

  toggleEdit() {
    if (!this.detail) return;
    if (this.editing) {
      this.editing = false;
      this.saveError = null;
      this.syncEditFromDetail();
    } else {
      this.syncEditFromDetail();
      this.editing = true;
    }
  }

  saveEdit() {
    if (!this.detail || this.medecinId === null) return;
    const adresse = this.editAdresse.trim();
    if (!adresse) {
      this.saveError = 'L\'adresse est requise.';
      return;
    }
    const telTrim = this.editTel.trim();
    if (telTrim && !/^[\d\s\+\-\.()]+$/.test(telTrim)) {
      this.saveError = 'Le numéro de téléphone contient des caractères invalides.';
      return;
    }
    this.saveError = null;
    this.saving = true;
    this.medecinService
      .updateMedecin(this.medecinId, {
        adresse,
        tel: telTrim === '' ? null : telTrim
      })
      .subscribe({
        next: ({ medecin }) => {
          this.saving = false;
          this.detail = {
            ...this.detail!,
            medecin: { ...this.detail!.medecin, ...medecin }
          };
          this.editing = false;
        },
        error: (err) => {
          this.saving = false;
          this.saveError = err.error?.error ?? 'Impossible d\'enregistrer.';
        }
      });
  }

  doDelete() {
    if (this.medecinId === null) return;
    this.deleting = true;
    this.deleteError = null;
    this.medecinService.deleteMedecin(this.medecinId).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteConfirm = false;
        this.close.emit();
      },
      error: (err) => {
        this.deleting = false;
        this.deleteError = err.error?.error ?? 'Erreur lors de la suppression.';
      }
    });
  }

  sortBy(field: 'date' | 'motif') {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'asc';
    }
  }

  formatDate(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR');
  }

  openRapport(id: number) {
    this.router.navigate(['/rapports', id]);
  }

  newRapport() {
    if (this.medecinId !== null) {
      this.router.navigate(['/rapports/new'], { queryParams: { medecinId: this.medecinId } });
    }
  }

  onOverlayClick(event: MouseEvent) {
    this.close.emit();
  }
}
