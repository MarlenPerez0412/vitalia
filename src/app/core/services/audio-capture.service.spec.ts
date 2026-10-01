import { TestBed } from '@angular/core/testing';
import { AudioCaptureService } from './audio-capture.service';

class FakeRecorder extends EventTarget {
  static isTypeSupported = () => true;
  state: 'inactive' | 'recording' = 'inactive';
  mimeType = 'audio/webm';
  start(): void { this.state = 'recording'; }
  stop(): void {
    this.state = 'inactive';
    const data = new Event('dataavailable') as Event & { data: Blob };
    data.data = new Blob(['audio'], { type: this.mimeType });
    this.dispatchEvent(data);
    this.dispatchEvent(new Event('stop'));
  }
}

describe('AudioCaptureService', () => {
  const originalRecorder = globalThis.MediaRecorder;
  let stopTrack: ReturnType<typeof vi.fn>;

  function setup(getUserMedia: () => Promise<unknown>): AudioCaptureService {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    TestBed.configureTestingModule({});
    return TestBed.inject(AudioCaptureService);
  }

  beforeEach(() => {
    stopTrack = vi.fn();
    (globalThis as { MediaRecorder?: unknown }).MediaRecorder = FakeRecorder;
  });
  afterEach(() => { (globalThis as { MediaRecorder?: unknown }).MediaRecorder = originalRecorder; });

  it('records, stops and releases the microphone tracks', async () => {
    const service = setup(() => Promise.resolve({ getTracks: () => [{ stop: stopTrack }] }));
    expect(await service.start()).toBe(true);
    expect(service.status()).toBe('recording');

    const recording = await service.stop();
    expect(service.status()).toBe('stopped');
    expect(recording?.blob.size).toBeGreaterThan(0);
    expect(stopTrack).toHaveBeenCalled();
  });

  it('exposes an error when the permission is rejected', async () => {
    const service = setup(() => Promise.reject(new DOMException('no', 'NotAllowedError')));
    expect(await service.start()).toBe(false);
    expect(service.status()).toBe('error');
    expect(service.errorMessage()).toContain('permiso');
  });

  it('exposes an error when there is no microphone', async () => {
    const service = setup(() => Promise.reject(new DOMException('none', 'NotFoundError')));
    expect(await service.start()).toBe(false);
    expect(service.errorMessage()).toContain('No encontré un micrófono');
  });

  it('fails gracefully without MediaRecorder and never opens the microphone', async () => {
    (globalThis as { MediaRecorder?: unknown }).MediaRecorder = undefined;
    const getUserMedia = vi.fn();
    const service = setup(getUserMedia);
    expect(await service.start()).toBe(false);
    expect(service.status()).toBe('error');
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('stops recording when the page goes to background', async () => {
    const service = setup(() => Promise.resolve({ getTracks: () => [{ stop: stopTrack }] }));
    await service.start();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    expect(stopTrack).toHaveBeenCalled();
    expect(service.status()).toBe('stopped');
  });
});
