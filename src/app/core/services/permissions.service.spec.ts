import { TestBed } from '@angular/core/testing';
import { PermissionsService } from './permissions.service';

function setNavigator(key: string, value: unknown): void {
  Object.defineProperty(navigator, key, { configurable: true, value });
}

describe('PermissionsService', () => {
  let service: PermissionsService;

  beforeEach(() => {
    localStorage.clear();
    setNavigator('permissions', undefined);
    setNavigator('mediaDevices', undefined);
    TestBed.configureTestingModule({});
    service = TestBed.inject(PermissionsService);
  });

  it('reports microphone as unavailable when getUserMedia is not supported', async () => {
    expect(await service.checkMicrophonePermission()).toBe('unavailable');
  });

  it('keeps prompt when navigator.permissions is missing (fallback)', async () => {
    setNavigator('mediaDevices', { getUserMedia: vi.fn() });
    expect(await service.checkMicrophonePermission()).toBe('prompt');
  });

  it('keeps the known state when the permission name is not supported', async () => {
    setNavigator('mediaDevices', { getUserMedia: vi.fn() });
    setNavigator('permissions', { query: vi.fn().mockRejectedValue(new TypeError('unsupported')) });
    expect(await service.checkMicrophonePermission()).toBe('prompt');
  });

  it('maps navigator.permissions states', async () => {
    setNavigator('mediaDevices', { getUserMedia: vi.fn() });
    setNavigator('permissions', { query: vi.fn().mockResolvedValue({ state: 'denied', addEventListener: vi.fn() }) });
    expect(await service.checkMicrophonePermission()).toBe('denied');
  });

  it('grants the microphone and releases the tracks after a permission-only request', async () => {
    const stop = vi.fn();
    setNavigator('mediaDevices', { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) });
    expect(await service.requestMicrophonePermission()).toBe('granted');
    expect(stop).toHaveBeenCalled();
  });

  it('maps a rejected request to denied and a missing device to unavailable', async () => {
    const getUserMedia = vi.fn().mockRejectedValueOnce(new DOMException('no', 'NotAllowedError'));
    setNavigator('mediaDevices', { getUserMedia });
    expect(await service.requestMicrophonePermission()).toBe('denied');
    getUserMedia.mockRejectedValueOnce(new DOMException('none', 'NotFoundError'));
    expect(await service.requestMicrophonePermission()).toBe('unavailable');
  });

  it('only persists that the explanation was seen', async () => {
    setNavigator('mediaDevices', { getUserMedia: vi.fn() });
    expect(await service.needsExplanation('microphone')).toBe(true);
    service.markExplanationSeen('microphone');
    expect(await service.needsExplanation('microphone')).toBe(false);
    expect(Object.keys(localStorage)).toEqual(['vitalia.permission-explained.microphone']);
  });
});
