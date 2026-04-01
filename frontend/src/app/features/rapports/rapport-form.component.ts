import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { RapportService, RapportDetail } from '../../core/services/rapport.service';
import { MedicamentService, MedicamentSummary } from '../../core/services/medicament.service';
import { MedecinService } from '../../core/services/medecin.service';
import { MedicamentDetailModalComponent } from './medicament-detail-modal.component';

interface EchantillonLocal {
  idMedicament: string;
  nomCommercial: string;
  libelle: string;
  quantite: number;
}

@Component({
  selector: 'app-rapport-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MedicamentDetailModalComponent],
  template: `
    <div class="min-h-screen bg-gray-100 flex items-start justify-center pt-10 pb-10">
      <div class="flex gap-4 items-start">

        <!-- ── MAIN FORM CARD ── -->
        <div class="bg-white rounded-2xl shadow-xl w-[520px] flex flex-col p-6 relative">

          <!-- Top-left dots -->
          <div class="absolute top-4 left-4">
            <span class="text-gray-300 text-lg font-bold tracking-widest leading-none">...</span>
          </div>

          <!-- Top-right dots -->
          <div class="absolute top-4 right-4">
            <span class="text-gray-300 text-lg font-bold tracking-widest leading-none">...</span>
          </div>

          <!-- Loading doctor info -->
          <div *ngIf="loadingDoctor" class="text-center py-8 text-gray-400 mt-4">Chargement...</div>

          <!-- Load error -->
          <div *ngIf="!loadingDoctor && loadError" class="text-center py-8 text-red-500 mt-4">{{ loadError }}</div>

          <!-- Doctor title -->
          <div *ngIf="!loadingDoctor && !loadError" class="text-center mt-6 mb-4">
            <h2 class="text-xl font-semibold">
              Dr. {{ doctorNom.toUpperCase() }} {{ doctorPrenom }}
            </h2>
            <p *ngIf="doctorSpecialite" class="text-sm text-gray-500 mt-1">{{ doctorSpecialite }}</p>
          </div>

          <!-- Form body (hidden while loading or on error) -->
          <ng-container *ngIf="!loadingDoctor && !loadError">

          <!-- Date + Motif row -->
          <div class="flex gap-4 mb-3">
            <div class="flex-1">
              <p class="text-xs text-gray-400 mb-1">date</p>
              <input type="date"
                     class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-gray-400"
                     [(ngModel)]="formDate" />
            </div>
            <div class="flex-1">
              <p class="text-xs text-gray-400 mb-1">motif</p>
              <input type="text"
                     class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-gray-400"
                     [(ngModel)]="formMotif"
                     placeholder="motif" />
            </div>
          </div>

          <!-- Bilan -->
          <div class="mb-4">
            <p class="text-xs text-gray-400 mb-1">bilan</p>
            <textarea
              class="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm text-gray-700 focus:outline-none focus:border-gray-400 min-h-[80px] resize-none"
              [(ngModel)]="formBilan"
              placeholder="bilan"></textarea>
          </div>

          <!-- Action buttons -->
          <div class="flex items-center gap-3 mb-4">
            <button *ngIf="isEditMode"
              class="px-5 py-2 rounded-full border border-gray-300 text-gray-600 text-sm hover:bg-gray-50"
              (click)="confirmDelete()"
              [disabled]="deleting">
              {{ deleting ? 'Suppression...' : 'supprimer' }}
            </button>
            <button
              class="px-5 py-2 rounded-full bg-gray-800 text-white text-sm hover:bg-gray-900 ml-auto"
              (click)="save()"
              [disabled]="saving">
              {{ saving ? 'Sauvegarde...' : 'sauvegarder' }}
            </button>
          </div>

          <!-- Error message -->
          <div *ngIf="saveError" class="text-red-500 text-sm mb-3">{{ saveError }}</div>

          <!-- Medicament search -->
          <div class="relative mb-3">
            <svg xmlns="http://www.w3.org/2000/svg"
                 class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
            </svg>
            <input type="text"
                   class="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                   placeholder="Rechercher un médicament..."
                   [(ngModel)]="searchQuery"
                   (ngModelChange)="onSearchChange($event)" />
          </div>

          <!-- Search results -->
          <div *ngIf="searchResults.length > 0"
               class="overflow-y-auto max-h-48 space-y-1">
            <div *ngFor="let m of searchResults"
                 class="flex items-center text-sm border border-gray-100 rounded-lg px-3 py-2 gap-2">
              <span class="flex-1 text-gray-700">• {{ m.nomCommercial }}, {{ m.libelle }}</span>
              <button class="w-6 h-6 rounded-full border border-gray-300 text-gray-600 text-xs flex items-center justify-center hover:bg-gray-50"
                      (click)="addMedicament(m)">+</button>
              <button class="w-6 h-6 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center hover:bg-gray-900"
                      (click)="openMedicament(m.id)">i</button>
            </div>
          </div>

          <div *ngIf="searching" class="text-gray-400 text-sm text-center py-2">Recherche...</div>

          </ng-container><!-- /form body -->

        </div>

        <!-- ── ECHANTILLONS PANEL (right side) ── -->
        <div *ngIf="echantillons.length > 0"
             class="bg-white rounded-2xl shadow-xl w-64 p-5 flex flex-col">
          <p class="text-sm text-gray-600 mb-3 font-medium">{{ echantillons.length }} echantillons offerts</p>
          <div class="space-y-3 overflow-y-auto max-h-[60vh]">
            <div *ngFor="let e of echantillons" class="text-sm">
              <div class="flex items-center gap-1">
                <span class="flex-1 text-gray-700 truncate">{{ e.nomCommercial }}</span>
                <button class="w-5 h-5 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center hover:bg-gray-900 shrink-0"
                        (click)="openMedicament(e.idMedicament)">i</button>
              </div>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-gray-500 text-xs">{{ e.quantite }}</span>
                <button class="w-5 h-5 rounded-full border border-gray-300 text-gray-600 text-xs flex items-center justify-center hover:bg-gray-50"
                        (click)="decrement(e)">−</button>
                <button class="w-5 h-5 rounded-full border border-gray-300 text-gray-600 text-xs flex items-center justify-center hover:bg-gray-50"
                        (click)="increment(e)">+</button>
              </div>
            </div>
          </div>
        </div>

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
export class RapportFormComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private rapportService = inject(RapportService);
  private medicamentService = inject(MedicamentService);
  private medecinService = inject(MedecinService);

  isEditMode = false;
  rapportId = 0;
  medecinId = 0;

  doctorNom = '';
  doctorPrenom = '';
  doctorSpecialite: string | null = null;
  loadingDoctor = false;

  formDate = '';
  formMotif = '';
  formBilan = '';

  echantillons: EchantillonLocal[] = [];
  searchQuery = '';
  searchResults: MedicamentSummary[] = [];
  searching = false;
  selectedMedicamentId: string | null = null;

  saving = false;
  deleting = false;
  saveError: string | null = null;
  loadError: string | null = null;
  deleteError: string | null = null;
  showDeleteConfirm = false;

  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  ngOnInit() {
    // Detect mode: edit vs create
    const idParam = this.route.snapshot.paramMap.get('id');
    const medecinIdParam = this.route.snapshot.queryParamMap.get('medecinId');

    if (idParam) {
      // EDIT mode
      this.isEditMode = true;
      this.rapportId = Number(idParam);
      this.loadRapport(this.rapportId);
    } else if (medecinIdParam) {
      // CREATE mode
      this.isEditMode = false;
      this.medecinId = Number(medecinIdParam);
      this.loadDoctor(this.medecinId);
    }

    // Set up search debounce
    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        this.searching = true;
        return this.medicamentService.getMedicaments({ search: query || undefined });
      })
    ).subscribe({
      next: (res) => {
        this.searchResults = res.medicaments;
        this.searching = false;
      },
      error: () => { this.searching = false; }
    });
  }

  ngOnDestroy() {
    this.searchSub?.unsubscribe();
  }

  private loadRapport(id: number) {
    this.loadingDoctor = true;
    this.loadError = null;
    this.rapportService.getRapportById(id).subscribe({
      next: (data: RapportDetail) => {
        this.medecinId = data.medecin.id;
        this.doctorNom = data.medecin.nom;
        this.doctorPrenom = data.medecin.prenom;
        this.doctorSpecialite = data.medecin.specialitecomplementaire;
        // Pre-fill form fields
        this.formDate = data.rapport.date ? data.rapport.date.substring(0, 10) : '';
        this.formMotif = data.rapport.motif ?? '';
        this.formBilan = data.rapport.bilan ?? '';
        // Pre-fill echantillons
        this.echantillons = data.echantillons.map(e => ({
          idMedicament: e.idMedicament,
          nomCommercial: e.nomCommercial,
          libelle: e.libelle,
          quantite: e.quantite
        }));
        this.loadingDoctor = false;
      },
      error: (err) => {
        this.loadingDoctor = false;
        if (err.status === 403) this.loadError = 'Vous n\'êtes pas autorisé à modifier ce rapport.';
        else if (err.status === 404) this.loadError = 'Ce rapport n\'existe pas.';
        else this.loadError = 'Impossible de charger le rapport.';
      }
    });
  }

  private loadDoctor(id: number) {
    this.loadingDoctor = true;
    this.loadError = null;
    this.medecinService.getMedecinById(id).subscribe({
      next: (data) => {
        this.doctorNom = data.medecin.nom;
        this.doctorPrenom = data.medecin.prenom;
        this.doctorSpecialite = data.medecin.specialitecomplementaire ?? null;
        this.loadingDoctor = false;
      },
      error: () => {
        this.loadingDoctor = false;
        this.loadError = 'Impossible de charger les informations du médecin.';
      }
    });
  }

  onSearchChange(query: string) {
    if (!query.trim()) {
      this.searchResults = [];
      this.searching = false;
      return;
    }
    this.searchSubject.next(query);
  }

  addMedicament(m: MedicamentSummary) {
    const existing = this.echantillons.find(e => e.idMedicament === m.id);
    if (existing) {
      existing.quantite++;
    } else {
      this.echantillons.push({
        idMedicament: m.id,
        nomCommercial: m.nomCommercial,
        libelle: m.libelle,
        quantite: 1
      });
    }
  }

  increment(e: EchantillonLocal) {
    e.quantite++;
  }

  decrement(e: EchantillonLocal) {
    e.quantite--;
    if (e.quantite < 1) {
      this.echantillons = this.echantillons.filter(x => x !== e);
    }
  }

  openMedicament(id: string) {
    this.selectedMedicamentId = id;
  }

  save() {
    this.saveError = null;
    this.saving = true;

    const payload = {
      date: this.formDate,
      motif: this.formMotif,
      bilan: this.formBilan,
      echantillons: this.echantillons.map(e => ({
        idMedicament: e.idMedicament,
        quantite: e.quantite
      }))
    };

    if (this.isEditMode) {
      this.rapportService.updateRapport(this.rapportId, payload).subscribe({
        next: (res) => {
          this.saving = false;
          this.router.navigate(['/rapports', res.rapport.id]);
        },
        error: (err) => {
          this.saving = false;
          this.saveError = err.error?.error ?? 'Erreur lors de la sauvegarde.';
        }
      });
    } else {
      this.rapportService.createRapport({ ...payload, idMedecin: this.medecinId }).subscribe({
        next: (res) => {
          this.saving = false;
          this.router.navigate(['/rapports', res.rapport.id]);
        },
        error: (err) => {
          this.saving = false;
          this.saveError = err.error?.error ?? 'Erreur lors de la création.';
        }
      });
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
}
