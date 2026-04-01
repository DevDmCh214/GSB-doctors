import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MedicamentService, MedicamentDetail } from '../../core/services/medicament.service';

@Component({
  selector: 'app-medicament-detail-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="medicamentId !== null"
         class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[60]"
         (click)="close.emit()">
      <div class="bg-white rounded-xl shadow-xl p-5 relative"
           style="min-width: 280px; max-width: 90vw; width: fit-content;"
           (click)="$event.stopPropagation()">

        <!-- Close button -->
        <button class="absolute top-2 right-3 text-gray-400 hover:text-gray-700 text-xl font-bold leading-none"
                (click)="close.emit()">×</button>

        <!-- Loading -->
        <div *ngIf="loading" class="text-gray-400 text-sm py-2">Chargement...</div>

        <!-- Content -->
        <ng-container *ngIf="!loading && detail">
          <!-- Title -->
          <p class="text-sm font-medium text-gray-800 mb-3 pr-4">
            {{ detail.nomCommercial }}, {{ detail.libelle }}, {{ detail.idFamille }}
          </p>

          <div class="text-sm text-gray-700 space-y-2">
            <div>
              <span class="font-medium">Effets :</span>
              <p class="text-gray-600 mt-0.5">{{ detail.effets }}</p>
            </div>
            <div>
              <span class="font-medium">ContreIndications :</span>
              <p class="text-gray-600 mt-0.5">{{ detail.contreIndications }}</p>
            </div>
            <div>
              <span class="font-medium">Composition :</span>
              <p class="text-gray-600 mt-0.5">{{ detail.composition }}</p>
            </div>
          </div>
        </ng-container>

        <!-- Error -->
        <div *ngIf="!loading && !detail" class="text-red-500 text-sm py-2">
          Impossible de charger les détails.
        </div>
      </div>
    </div>
  `
})
export class MedicamentDetailModalComponent implements OnChanges {
  @Input() medicamentId: string | null = null;
  @Output() close = new EventEmitter<void>();

  private medicamentService = inject(MedicamentService);

  detail: MedicamentDetail | null = null;
  loading = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['medicamentId']) {
      if (this.medicamentId !== null) {
        this.loading = true;
        this.detail = null;
        this.medicamentService.getMedicamentById(this.medicamentId).subscribe({
          next: (res) => { this.detail = res.medicament; this.loading = false; },
          error: () => { this.loading = false; }
        });
      } else {
        this.detail = null;
      }
    }
  }
}
