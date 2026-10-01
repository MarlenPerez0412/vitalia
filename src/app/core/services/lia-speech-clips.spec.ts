import { TestBed } from '@angular/core/testing';
import { AudioCaptureService } from './audio-capture.service';
import { LiaSpeechService } from './lia-speech.service';
import { VoiceSessionCoordinatorService } from './voice-session-coordinator.service';

/** Audio simulado: permite comprobar el orden "microfono cerrado -> play" y disparar `ended`/`error`. */
class FakeAudio {
  static instances: FakeAudio[] = [];
  static rejectPlay = false;
  volume = 1;
  duration = Number.NaN;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onloadedmetadata: (() => void) | null = null;
  play = vi.fn(() => (FakeAudio.rejectPlay ? Promise.reject(new Error('NotAllowedError')) : Promise.resolve()));
  pause = vi.fn();
  constructor(readonly src: string) { FakeAudio.instances.push(this); }
}

class FakeUtterance {
  voice: SpeechSynthesisVoice | null = null;
  lang = '';
  rate = 1;
  pitch = 1;
  volume = 1;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  constructor(readonly text: string) {}
}

describe('LiaSpeechService audio clips', () => {
  const pause = vi.fn();
  const resume = vi.fn();
  const synth = { paused: false, getVoices: () => [], speak: vi.fn(), cancel: vi.fn(), pause: vi.fn(), resume: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() };
  const original = { audio: globalThis.Audio, create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  let coordinator: VoiceSessionCoordinatorService;

  function create(): LiaSpeechService {
    TestBed.configureTestingModule({ providers: [{ provide: AudioCaptureService, useValue: { status: () => 'idle' } }] });
    coordinator = TestBed.inject(VoiceSessionCoordinatorService);
    coordinator.registerGlobal({ pause, resume });
    return TestBed.inject(LiaSpeechService);
  }
  const lastAudio = () => FakeAudio.instances.at(-1)!;

  beforeEach(() => {
    vi.useFakeTimers();
    FakeAudio.instances = [];
    FakeAudio.rejectPlay = false;
    [pause, resume, synth.speak, synth.cancel].forEach((mock) => mock.mockClear());
    localStorage.removeItem('vitalia.lia-voice');
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { value: FakeUtterance, configurable: true, writable: true });
    Object.defineProperty(globalThis, 'Audio', { value: FakeAudio, configurable: true, writable: true });
    URL.createObjectURL = vi.fn(() => 'blob:clip-1');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    vi.useRealTimers();
    delete (window as { speechSynthesis?: unknown }).speechSynthesis;
    delete (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
    Object.defineProperty(globalThis, 'Audio', { value: original.audio, configurable: true, writable: true });
    URL.createObjectURL = original.create;
    URL.revokeObjectURL = original.revoke;
  });

  it('closes the microphone before the clip plays and reopens it only after it ends plus the echo guard', async () => {
    const speech = create();
    coordinator.requestGlobal();
    const done = speech.playClip(new Blob(['wav']), { label: 'respuesta en zapoteco', priority: 'NORMAL' });
    const audio = lastAudio();
    expect(audio.src).toBe('blob:clip-1');
    expect(pause).toHaveBeenCalledWith('SPEECH');
    expect(pause.mock.invocationCallOrder[0]).toBeLessThan(audio.play.mock.invocationCallOrder[0]);
    expect(coordinator.requestGlobal()).toBe(false);
    expect(speech.currentMessage()).toBe('respuesta en zapoteco');

    audio.onended!();
    await expect(done).resolves.toBe(true);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:clip-1');
    expect(resume).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(400);
    expect(resume).toHaveBeenCalledOnce();
  });

  it('an emergency phrase interrupts a lower priority clip; clips and phrases share the same queue', async () => {
    const speech = create();
    const clip = speech.playClip('/audio/zapoteco/zaa/info.mp3', { label: 'informativo', priority: 'LOW' });
    const audio = lastAudio();
    void speech.speak('Voy a ayudarte.', { priority: 'CRITICAL' });
    await expect(clip).resolves.toBe(false);
    expect(audio.pause).toHaveBeenCalled();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60);
    expect(synth.speak).toHaveBeenCalledOnce();
  });

  it('a clip the browser refuses to play counts as a failure and releases the microphone', async () => {
    FakeAudio.rejectPlay = true;
    const speech = create();
    coordinator.requestGlobal();
    await expect(speech.playClip('/audio/x.mp3', { label: 'x' })).resolves.toBe(false);
    expect(speech.status()).toBe('error');
    await vi.advanceTimersByTimeAsync(400);
    expect(resume).toHaveBeenCalledOnce();
  });

  it('stop() silences a clip; a disabled voice never plays clips', async () => {
    const speech = create();
    const clip = speech.playClip('/audio/x.mp3', { label: 'x' });
    speech.stop();
    await expect(clip).resolves.toBe(false);
    expect(lastAudio().pause).toHaveBeenCalled();
    speech.setEnabled(false);
    await expect(speech.playClip('/audio/x.mp3', { label: 'x' })).resolves.toBe(false);
    expect(FakeAudio.instances).toHaveLength(1);
  });

  it('the watchdog ends a clip that never reports its end, using its real duration when known', async () => {
    const speech = create();
    const clip = speech.playClip('/audio/x.mp3', { label: 'x' });
    const audio = lastAudio();
    audio.duration = 2;
    audio.onloadedmetadata!();
    await vi.advanceTimersByTimeAsync(2000 + 3000 + 1);
    await expect(clip).resolves.toBe(false);
    expect(speech.status()).toBe('idle');
  });
});
