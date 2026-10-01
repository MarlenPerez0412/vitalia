import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LocationService } from '../../../../core/services/location.service';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { SeniorStateService } from '../../services/senior-state.service';
import { EmergencyPageComponent } from './emergency-page.component';

type Page = {
  selectReason(reason: string): void; startCountdown(): void; confirm(): Promise<void>; cancel(): void;
  acceptLocationConsent(): Promise<void>; useDemoLocation(): void; step(): string;
};

describe('EmergencyPageComponent location flow', () => {
  const getCurrentPosition = vi.fn();
  const needsExplanation = vi.fn();

  beforeEach(async () => {
    vi.useFakeTimers();
    getCurrentPosition.mockReset();
    needsExplanation.mockReset().mockResolvedValue(false);
    await TestBed.configureTestingModule({
      imports: [EmergencyPageComponent],
      providers: [
        provideRouter([]),
        { provide: PermissionsService, useValue: { needsExplanation, markExplanationSeen: vi.fn() } },
        { provide: LocationService, useValue: { getCurrentPosition, getDemoPosition: () => ({ latitude: 0, longitude: 0, accuracy: null, timestamp: new Date().toISOString(), source: 'DEMO' }), status: () => 'denied' } },
      ],
    }).compileComponents();
  });
  afterEach(() => vi.useRealTimers());

  function page(): Page {
    const fixture = TestBed.createComponent(EmergencyPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as Page;
    component.selectReason('Me caí');
    return component;
  }

  it('never requests location when cancelled before confirming', () => {
    const component = page();
    component.startCountdown();
    component.cancel();
    vi.runAllTimers();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(needsExplanation).not.toHaveBeenCalled();
  });

  it('asks for consent after confirming and records the real location', async () => {
    needsExplanation.mockResolvedValue(true);
    getCurrentPosition.mockResolvedValue({ latitude: 1, longitude: 2, accuracy: 10, timestamp: '', source: 'REAL' });
    const component = page();
    await component.confirm();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    await component.acceptLocationConsent();
    vi.advanceTimersByTime(1400);
    expect(component.step()).toBe('registered');
    expect(TestBed.inject(SeniorStateService).emergencyEvents()[0]).toMatchObject({ locationSource: 'REAL', latitude: 1 });
  });

  it('offers the demo fallback when GPS fails', async () => {
    getCurrentPosition.mockResolvedValue(null);
    const component = page();
    await component.confirm();
    expect(component.step()).toBe('location-fallback');
    component.useDemoLocation();
    vi.advanceTimersByTime(1400);
    expect(TestBed.inject(SeniorStateService).emergencyEvents()[0]).toMatchObject({ locationSource: 'DEMO' });
  });
});
