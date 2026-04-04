import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService, Visiteur } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('isLoggedIn should return false initially', () => {
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('currentVisiteur should return null initially', () => {
    expect(service.currentVisiteur()).toBeNull();
  });

  it('login should set visiteur and return it', () => {
    const mockVisiteur: Visiteur = { id: 'ab00', nom: 'Test', prenom: 'User', cp: '75001' };

    service.login('user', 'pass').subscribe(v => {
      expect(v).toEqual(mockVisiteur);
      expect(service.isLoggedIn()).toBeTrue();
      expect(service.currentVisiteur()).toEqual(mockVisiteur);
    });

    const req = httpMock.expectOne(r => r.url.includes('/api/auth/login'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ login: 'user', mdp: 'pass' });
    req.flush({ visiteur: mockVisiteur });
  });

  it('logout should clear visiteur', () => {
    // Simulate logged-in state
    service.login('user', 'pass').subscribe();
    httpMock.expectOne(r => r.url.includes('/api/auth/login'))
      .flush({ visiteur: { id: 'ab00', nom: 'T', prenom: 'U', cp: '75' } });

    expect(service.isLoggedIn()).toBeTrue();

    service.logout().subscribe(() => {
      expect(service.isLoggedIn()).toBeFalse();
      expect(service.currentVisiteur()).toBeNull();
    });

    const req = httpMock.expectOne(r => r.url.includes('/api/auth/logout'));
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('me should fetch and set current visiteur', () => {
    const mockVisiteur: Visiteur = { id: 'ab00', nom: 'Test', prenom: 'User', cp: '75001' };

    service.me().subscribe(v => {
      expect(v).toEqual(mockVisiteur);
      expect(service.isLoggedIn()).toBeTrue();
    });

    const req = httpMock.expectOne(r => r.url.includes('/api/auth/me'));
    expect(req.request.method).toBe('GET');
    req.flush({ visiteur: mockVisiteur });
  });

  it('register should create visiteur and set state', () => {
    const mockVisiteur: Visiteur = { id: 'dj00', nom: 'Dupont', prenom: 'Jean', cp: '75001' };

    service.register({
      nom: 'Dupont', prenom: 'Jean', login: 'jd', mdp: 'Test1234',
      adresse: '', cp: '75001', ville: 'Paris', dateEmbauche: ''
    }).subscribe(v => {
      expect(v).toEqual(mockVisiteur);
      expect(service.isLoggedIn()).toBeTrue();
    });

    const req = httpMock.expectOne(r => r.url.includes('/api/auth/register'));
    expect(req.request.method).toBe('POST');
    req.flush({ visiteur: mockVisiteur });
  });
});
