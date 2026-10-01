import { TestBed } from '@angular/core/testing';
import { VitaliaLocation } from '../../../core/models/location.models';
import { EmergencyRegistryService } from '../../../core/services/emergency-registry.service';
import { LiaSpeechService } from '../../../core/services/lia-speech.service';
import { LocationService } from '../../../core/services/location.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { EmergencyService } from './emergency.service';

describe('EmergencyService', () => {
  const real: VitaliaLocation = { latitude: 19.4, longitude: -99.1, accuracy: 20, timestamp: '', source: 'REAL' };
  const getCurrentPosition = vi.fn();
  let emergency: EmergencyService;
  let registry: EmergencyRegistryService;

  beforeEach(() => {
    vi.useFakeTimers();
    getCurrentPosition.mockReset().mockResolvedValue(real);
    TestBed.configureTestingModule({
      providers: [
        { provide: PermissionsService, useValue: { needsExplanation: async () => false, markExplanationSeen: vi.fn() } },
        { provide: LocationService, useValue: { getCurrentPosition, getDemoPosition: vi.fn(), status: () => 'error' } },
      ],
    });
    emergency = TestBed.inject(EmergencyService);
    registry = TestBed.inject(EmergencyRegistryService);
  });
  afterEach(() => vi.useRealTimers());

  it('button flow: short countdown, explicit confirmation, location and event', async () => {
    emergency.selectReason('Me siento mal');
    emergency.startCountdown();
    await vi.advanceTimersByTimeAsync(3 * 650);
    expect(emergency.step()).toBe('confirmed');
    expect(getCurrentPosition).not.toHaveBeenCalled();
    await emergency.confirm();
    await vi.advanceTimersByTimeAsync(1400);
    expect(emergency.step()).toBe('registered');
    expect(registry.latest()).toMatchObject({ type: 'SICK', source: 'BUTTON', locationSource: 'REAL', contactName: 'Ana Hernández' });
  });

  it('voice flow: 5 second countdown then proceeds on its own', async () => {
    emergency.startVoiceRequest({ type: 'HELP', reason: 'Necesito ayuda', source: 'GLOBAL_VOICE' });
    expect(emergency.countdown()).toBe(5);
    await vi.advanceTimersByTimeAsync(4000);
    expect(emergency.step()).toBe('countdown');
    expect(getCurrentPosition).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1400);
    expect(emergency.step()).toBe('registered');
    expect(registry.latest()).toMatchObject({ type: 'HELP', source: 'GLOBAL_VOICE' });
  });

  it('cancelling before confirming never requests the location', async () => {
    emergency.startVoiceRequest({ type: 'FALL', reason: 'Me caí', source: 'GLOBAL_VOICE' });
    await vi.advanceTimersByTimeAsync(2000);
    emergency.cancel();
    await vi.advanceTimersByTimeAsync(10000);
    expect(emergency.step()).toBe('cancelled');
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(registry.events()).toHaveLength(0);
  });

  it('LIA requests reuse the same flow and a confirmed request skips the countdown', async () => {
    emergency.startVoiceRequest({ type: 'HELP', reason: 'Necesito ayuda', source: 'LIA' });
    expect(emergency.source()).toBe('LIA');
    expect(emergency.startVoiceRequest({ type: 'FALL', reason: 'Me caí', source: 'GLOBAL_VOICE' })).toBe(false);
    emergency.cancel();
    emergency.confirmRequest({ type: 'FALL', reason: 'Me caí', source: 'GLOBAL_VOICE' });
    await vi.advanceTimersByTimeAsync(1500);
    expect(registry.latest()).toMatchObject({ type: 'FALL', reason: 'Me caí', source: 'GLOBAL_VOICE' });
  });

  describe('voice of LIA', () => {
    let speech: LiaSpeechService;
    let speak: ReturnType<typeof vi.spyOn>;
    const spoken = (): string[] => speak.mock.calls.map(([text]: unknown[]) => text as string);
    beforeEach(() => {
      speech = TestBed.inject(LiaSpeechService);
      speak = vi.spyOn(speech, 'speak').mockResolvedValue(true);
    });

    it('narrates the real progress of a voice request and never claims a notification', async () => {
      emergency.confirmRequest({ type: 'SICK', reason: 'Me siento mal', source: 'GLOBAL_VOICE' });
      await vi.advanceTimersByTimeAsync(1400);
      expect(emergency.step()).toBe('registered');
      expect(spoken()).toEqual(['Estoy obteniendo tu ubicación.', 'Ubicación obtenida.', 'Tu solicitud de ayuda quedó registrada.']);
      expect(speak.mock.calls.every(([, options]: unknown[]) => (options as { priority: string }).priority === 'CRITICAL')).toBe(true);
    });

    it('says when the location could not be obtained', async () => {
      getCurrentPosition.mockResolvedValue(null);
      emergency.confirmRequest({ type: 'HELP', reason: 'Necesito ayuda', source: 'LIA' });
      await vi.advanceTimersByTimeAsync(0);
      expect(emergency.step()).toBe('location-fallback');
      expect(spoken().at(-1)).toBe('No pude obtener tu ubicación actual.');
    });

    it('keeps the button flow silent', async () => {
      emergency.selectReason('Me caí');
      emergency.startCountdown();
      await vi.advanceTimersByTimeAsync(3 * 650);
      await emergency.confirm();
      await vi.advanceTimersByTimeAsync(1400);
      expect(emergency.step()).toBe('registered');
      expect(speak).not.toHaveBeenCalled();
    });

    it('the voice countdown waits while LIA is speaking, so the person can still say "cancelar"', async () => {
      emergency.startVoiceRequest({ type: 'FALL', reason: 'Me caí', source: 'GLOBAL_VOICE' });
      speech.status.set('speaking');
      await vi.advanceTimersByTimeAsync(3000);
      expect(emergency.countdown()).toBe(5);
      speech.status.set('idle');
      await vi.advanceTimersByTimeAsync(4000);
      expect(emergency.countdown()).toBe(1);
      expect(getCurrentPosition).not.toHaveBeenCalled();
    });

    it('cancelling a voice request silences the narration', () => {
      const stop = vi.spyOn(speech, 'stop');
      emergency.startVoiceRequest({ type: 'HELP', reason: 'Necesito ayuda', source: 'GLOBAL_VOICE' });
      emergency.cancel();
      expect(stop).toHaveBeenCalledOnce();
    });
  });
});
