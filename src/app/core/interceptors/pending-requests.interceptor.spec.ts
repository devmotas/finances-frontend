import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PendingRequestsService } from '../services/pending-requests.service';
import { pendingRequestsInterceptor } from './pending-requests.interceptor';

describe('pendingRequestsInterceptor', () => {
  const url = '/categories';
  let http: HttpClient;
  let backend: HttpTestingController;
  let pending: PendingRequestsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([pendingRequestsInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    pending = TestBed.inject(PendingRequestsService);
  });

  afterEach(() => backend.verify());

  it('conta a requisição enquanto aguarda e libera quando a resposta chega', () => {
    http.get(url).subscribe();
    expect(pending.count()).toBe(1);
    expect(pending.hasPending()).toBeTrue();

    backend.expectOne(url).flush([]);

    expect(pending.count()).toBe(0);
    expect(pending.hasPending()).toBeFalse();
  });

  it('libera o contador também quando a requisição falha', () => {
    http.get(url).subscribe({ error: () => undefined });

    backend.expectOne(url).flush(null, { status: 500, statusText: 'Server Error' });

    expect(pending.count()).toBe(0);
  });

  it('soma requisições simultâneas e desconta cada uma ao terminar', () => {
    http.get(url).subscribe();
    http.get(`${url}/1`).subscribe();
    expect(pending.count()).toBe(2);

    backend.expectOne(url).flush([]);
    expect(pending.count()).toBe(1);

    backend.expectOne(`${url}/1`).flush({});
    expect(pending.count()).toBe(0);
  });

  it('libera o contador quando a requisição é cancelada', () => {
    const subscription = http.get(url).subscribe();
    expect(pending.count()).toBe(1);

    subscription.unsubscribe();

    expect(pending.count()).toBe(0);
    backend.expectOne(url);
  });
});
