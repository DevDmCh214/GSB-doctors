import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RapportService, RapportDetail } from '../../core/services/rapport.service';
import { MedicamentDetailModalComponent } from './medicament-detail-modal.component';

@Component({
  selector: 'app-rapport-detail',
  standalone: true,
  imports: [CommonModule, MedicamentDetailModalComponent],
  template: `
    <div class="min-h-screen bg-gray-100 flex items-start justify-center pt-10 pb-10">
      <div class="bg-white rounded-2xl shadow-xl w-[560px] flex flex-col p-6 relative">

        <!-- Top-left: dots + pencil -->
        <div class="absolute top-4 left-4 flex items-center gap-2">
          <span class="text-gray-300 text-lg font-bold tracking-widest leading-none">...</span>
          <button class="text-gray-400 hover:text-gray-600" title="Modifier" (click)="goToEdit()">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-1.657.985l-3.181.795.795-3.181A4 4 0 019 13z" />
            </svg>
          </button>
        </div>

        <!-- Top-right: dots + close -->
        <div class="absolute top-4 right-4 flex items-center gap-2">
          <span class="text-gray-300 text-lg font-bold tracking-widest leading-none">...</span>
          <button class="text-gray-400 hover:text-gray-700 text-xl font-bold leading-none"
                  (click)="goBack()">×</button>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="text-center py-16 text-gray-400">Chargement...</div>

        <!-- Error -->
        <div *ngIf="!loading && error" class="text-center py-16 text-red-500">{{ error }}</div>

        <!-- Content -->
        <ng-container *ngIf="!loading && detail">

          <!-- Doctor title -->
          <div class="text-center mt-6 mb-4">
            <h2 class="text-xl font-semibold">
              Dr. {{ detail.medecin.nom.toUpperCase() }} {{ detail.medecin.prenom }}
            </h2>
            <p *ngIf="detail.medecin.specialitecomplementaire" class="text-sm text-gray-500 mt-1">
              {{ detail.medecin.specialitecomplementaire }}
            </p>
          </div>

          <!-- Date + Motif row -->
          <div class="flex gap-4 mb-3">
            <div class="flex-1">
              <p class="text-xs text-gray-400 mb-1">date</p>
              <div class="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50">
                {{ formatDate(detail.rapport.date) }}
              </div>
            </div>
            <div class="flex-1">
              <p class="text-xs text-gray-400 mb-1">motif</p>
              <div class="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50">
                {{ detail.rapport.motif }}
              </div>
            </div>
          </div>

          <!-- Bilan -->
          <div class="mb-4">
            <p class="text-xs text-gray-400 mb-1">bilan</p>
            <div class="border border-gray-200 rounded-lg px-3 py-3 text-sm text-gray-700 bg-gray-50 min-h-[80px] whitespace-pre-wrap">
              {{ detail.rapport.bilan }}
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3 mb-4">
            <button
              class="px-5 py-2 rounded-full border border-gray-300 text-gray-600 text-sm hover:bg-gray-50"
              (click)="confirmDelete()"
              [disabled]="deleting">
              {{ deleting ? 'Suppression...' : 'supprimer' }}
            </button>
          </div>

          <!-- Divider -->
          <hr class="border-gray-200 mb-3" />

          <!-- Echantillons -->
          <ng-container *ngIf="detail.echantillons.length > 0">
            <p class="text-sm text-gray-600 mb-2">{{ totalEchantillons() }} echantillons offerts</p>
            <div class="overflow-y-auto max-h-48 space-y-1">
              <div *ngFor="let e of detail.echantillons"
                   class="flex items-center text-sm border border-gray-100 rounded-lg px-3 py-2 gap-3">
                <span class="flex-1 text-gray-700">• {{ e.nomCommercial }}, {{ e.libelle }} <span class="text-gray-400">(x{{ e.quantite }})</span></span>
                <button class="w-6 h-6 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center shrink-0 hover:bg-gray-900"
                        (click)="openMedicament(e.idMedicament)">i</button>
              </div>
            </div>
          </ng-container>

        </ng-container>
      </div>
    </div>

    <!-- Medicament detail modal -->
    <app-medicament-detail-modal
      [medicamentId]="selectedMedicamentId"
      (close)="selectedMedicamentId = null">
    </app-medicament-detail-modal>

    <!-- Delete confirmation overlay -->
    <div *ngIf="showDeleteConfirm"
         class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-xl p-6 w-80">
        <p class="text-gray-800 mb-4">Supprimer ce rapport ?</p>
        <div *ngIf="deleteError" class="text-red-500 text-sm mb-3">{{ deleteError }}</div>
        <div class="flex gap-3 justify-end">
          <button class="px-4 py-2 rounded-full border border-gray-300 text-gray-600 text-sm hover:bg-gray-50"
                  (click)="showDeleteConfirm = false; deleteError = null">Annuler</button>
          <button class="px-4 py-2 rounded-full bg-gray-800 text-white text-sm hover:bg-gray-900"
                  (click)="doDelete()">Supprimer</button>
        </div>
      </div>
    </div>
  `
})
export class RapportDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private rapportService = inject(RapportService);

  detail: RapportDetail | null = null;
  loading = false;
  error: string | null = null;
  deleting = false;
  deleteError: string | null = null;
  showDeleteConfirm = false;
  selectedMedicamentId: string | null = null;

  private rapportId = 0;

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.rapportId = id;
    this.loading = true;
    this.rapportService.getRapportById(id).subscribe({
      next: (data) => { this.detail = data; this.loading = false; },
      error: (err) => {
        this.loading = false;
        if (err.status === 403) this.error = 'Accès refusé à ce rapport.';
        else if (err.status === 404) this.error = 'Rapport introuvable.';
        else this.error = 'Erreur lors du chargement.';
      }
    });
  }

  goToEdit() {
    this.router.navigate(['/rapports', this.rapportId, 'edit']);
  }

  goBack() {
    if (history.length > 1) {
      history.back();
    } else {
      this.router.navigate(['/medecins']);
    }
  }

  confirmDelete() {
    this.showDeleteConfirm = true;
  }

  doDelete() {
    this.showDeleteConfirm = false;
    this.deleting = true;
    this.deleteError = null;
    this.rapportService.deleteRapport(this.rapportId).subscribe({
      next: () => this.router.navigate(['/medecins']),
      error: (err) => {
        this.deleting = false;
        this.showDeleteConfirm = true;
        this.deleteError = err.error?.error ?? 'Erreur lors de la suppression. Veuillez réessayer.';
      }
    });
  }

  openMedicament(id: string) {
    this.selectedMedicamentId = id;
  }

  totalEchantillons(): number {
    if (!this.detail) return 0;
    return this.detail.echantillons.reduce((sum, e) => sum + (e.quantite || 0), 0);
  }

  formatDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR');
  }
}
