import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { RapportService } from './rapport.service';

describe('RapportService', () => {
  let service: RapportService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RapportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getRapports should call GET /api/rapports', () => {
    service.getRapports().subscribe(res => {
      expect(res.rapports).toEqual([]);
      expect(res.count).toBe(0);
    });
    const req = httpMock.expectOne(r => r.url.includes('/api/rapports') && r.method === 'GET');
    req.flush({ rapports: [], count: 0 });
  });

  it('getRapports should pass search params', () => {
    service.getRapports({ search: 'test', sortDate: 'asc' }).subscribe(res => {
      expect(res.count).toBe(0);
    });
    const req = httpMock.expectOne(r =>
      r.url.includes('/api/rapports') &&
      r.params.get('search') === 'test' &&
      r.params.get('sortDate') === 'asc'
    );
    expect(req).toBeTruthy();
    req.flush({ rapports: [], count: 0 });
  });

  it('getRapportById should call GET /api/rapports/:id', () => {
    service.getRapportById(42).subscribe(res => {
      expect(res.rapport.id).toBe(42);
    });
    const req = httpMock.expectOne(r => r.url.includes('/api/rapports/42'));
    req.flush({
      rapport: { id: 42, date: '2024-01-01', motif: 'test', bilan: 'ok' },
      medecin: { id: 1, nom: 'M', prenom: 'P', specialitecomplementaire: null },
      echantillons: []
    });
  });

  it('createRapport should call POST /api/rapports', () => {
    const data = { idMedecin: 1, date: '2024-01-01', motif: 'test', bilan: 'ok', echantillons: [] };
    service.createRapport(data).subscribe(res => {
      expect(res.rapport.id).toBe(1);
    });
    const req = httpMock.expectOne(r => r.url.includes('/api/rapports') && r.method === 'POST');
    expect(req.request.body).toEqual(data);
    req.flush({ rapport: { id: 1 } });
  });

  it('deleteRapport should call DELETE /api/rapports/:id', () => {
    service.deleteRapport(5).subscribe(res => {
      expect(res.success).toBeTrue();
    });
    const req = httpMock.expectOne(r => r.url.includes('/api/rapports/5') && r.method === 'DELETE');
    req.flush({ success: true });
  });
});
