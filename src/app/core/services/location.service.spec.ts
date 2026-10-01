import { TestBed } from '@angular/core/testing';
import { LocationService } from './location.service';
import { PermissionsService } from './permissions.service';
import { DEMO_LOCATION } from './senior-mock-data';

type PositionCallback = (position: GeolocationPosition) => void;
type ErrorCallback = (error: GeolocationPositionError) => void;

describe('LocationService', () => {
  function setup(getCurrentPosition?: (ok: PositionCallback, fail: ErrorCallback) => void): LocationService {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: getCurrentPosition ? { getCurrentPosition } : undefined });
    if (!getCurrentPosition) delete (navigator as unknown as Record<string, unknown>)['geolocation'];
    TestBed.configureTestingModule({});
    return TestBed.inject(LocationService);
  }

  it('returns a REAL position when permission is granted', async () => {
    const service = setup((ok) => ok({ coords: { latitude: 1, longitude: 2, accuracy: 15 }, timestamp: 0 } as GeolocationPosition));
    const location = await service.getCurrentPosition();
    expect(location).toMatchObject({ latitude: 1, longitude: 2, accuracy: 15, source: 'REAL' });
    expect(TestBed.inject(PermissionsService).geolocation()).toBe('granted');
  });

  it('maps a denied permission and a timeout', async () => {
    let code = 1;
    const service = setup((_ok, fail) => fail({ code } as GeolocationPositionError));
    expect(await service.getCurrentPosition()).toBeNull();
    expect(service.status()).toBe('denied');
    expect(service.errorMessage()).toBe('No pude obtener tu ubicación.');
    code = 3;
    await service.getCurrentPosition();
    expect(service.status()).toBe('error');
  });

  it('reports unavailable when geolocation is not supported', async () => {
    const service = setup();
    expect(await service.getCurrentPosition()).toBeNull();
    expect(service.status()).toBe('unavailable');
  });

  it('uses the centralized demo location as fallback and can forget it', () => {
    const service = setup();
    expect(service.getDemoPosition()).toMatchObject({ latitude: DEMO_LOCATION.latitude, longitude: DEMO_LOCATION.longitude, source: 'DEMO' });
    service.clear();
    expect(service.position()).toBeNull();
  });
});
