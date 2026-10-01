import { TestBed } from '@angular/core/testing';
import { AudioCaptureService } from './audio-capture.service';
import { LiaSpeechService, pickLiaVoice } from './lia-speech.service';
import { VoiceSessionCoordinatorService } from './voice-session-coordinator.service';

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

const voice = (name: string, lang: string, localService = true) =>
  ({ name, lang, voiceURI: name, localService, default: false }) as SpeechSynthesisVoice;

const DALIA = voice('Microsoft Dalia Online (Natural) - Spanish (Mexico)', 'es-MX', false);
const JORGE = voice('Microsoft Jorge Online (Natural) - Spanish (Mexico)', 'es-MX', false);
const SABINA = voice('Microsoft Sabina - Spanish (Mexico)', 'es-MX');
const ELVIRA = voice('Microsoft Elvira - Spanish (Spain)', 'es-ES');
const GOOGLE_ES = voice('Google español', 'es-ES');

describe('pickLiaVoice', () => {
  it.each([
    [[GOOGLE_ES, JORGE, DALIA], DALIA],
    [[GOOGLE_ES, ELVIRA, JORGE], JORGE],
    [[ELVIRA, voice('Paulina', 'es_419')], voice('Paulina', 'es_419')],
    [[voice('US', 'es-US'), ELVIRA], ELVIRA],
    [[voice('Zira', 'en-US'), voice('US', 'es-US')], voice('US', 'es-US')],
  ])('prefers Dalia, then es-MX, es-419, es-ES and any Spanish (%#)', (voices, expected) => {
    expect(pickLiaVoice(voices)?.name).toBe(expected.name);
  });

  it('returns null without Spanish voices', () => {
    expect(pickLiaVoice([voice('Zira', 'en-US')])).toBeNull();
  });
});

describe('LiaSpeechService', () => {
  let voices: SpeechSynthesisVoice[];
  let spoken: FakeUtterance[];
  let listeners: Map<string, () => void>;
  let audioStatus: string;
  const pause = vi.fn();
  const resume = vi.fn();
  const synth = {
    paused: false,
    getVoices: () => voices,
    speak: vi.fn((utterance: FakeUtterance) => spoken.push(utterance)),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    addEventListener: (type: string, listener: () => void) => listeners.set(type, listener),
    removeEventListener: vi.fn(),
  };
  let coordinator: VoiceSessionCoordinatorService;

  function create(): LiaSpeechService {
    TestBed.configureTestingModule({ providers: [{ provide: AudioCaptureService, useValue: { status: () => audioStatus } }] });
    coordinator = TestBed.inject(VoiceSessionCoordinatorService);
    coordinator.registerGlobal({ pause, resume });
    return TestBed.inject(LiaSpeechService);
  }

  const last = () => spoken.at(-1)!;

  beforeEach(() => {
    vi.useFakeTimers();
    voices = [GOOGLE_ES, JORGE, DALIA];
    spoken = [];
    listeners = new Map();
    audioStatus = 'idle';
    [pause, resume, synth.speak, synth.cancel].forEach((mock) => mock.mockClear());
    localStorage.removeItem('vitalia.lia-voice');
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { value: FakeUtterance, configurable: true, writable: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    delete (window as { speechSynthesis?: unknown }).speechSynthesis;
    delete (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
  });

  it('speaks with Dalia, es-MX and the default rate, pitch and volume', () => {
    const speech = create();
    void speech.speak('Hola, María.');
    expect(last()).toMatchObject({ text: 'Hola, María.', voice: DALIA, lang: 'es-MX', rate: 0.9, pitch: 1, volume: 1 });
    expect(speech.status()).toBe('speaking');
    expect(speech.isSpeaking()).toBe(true);
    expect(speech.currentMessage()).toBe('Hola, María.');
  });

  it('keeps the voice at the browser maximum when a higher volume is requested', () => {
    const speech = create();
    void speech.speak('Hablar más fuerte.', { volume: 1.4 });
    expect(last().volume).toBe(1);
  });

  it('picks the voice when the browser loads voices asynchronously (voiceschanged)', () => {
    voices = [];
    const speech = create();
    expect(speech.voice()).toBeNull();
    voices = [ELVIRA, SABINA];
    listeners.get('voiceschanged')!();
    expect(speech.voice()).toBe(SABINA);
  });

  it('closes the global microphone before speaking and reopens it only after the end and the echo guard', async () => {
    const speech = create();
    expect(coordinator.requestGlobal()).toBe(true);
    const done = speech.speak('Sí, te escuché.');
    expect(pause).toHaveBeenCalledWith('SPEECH');
    expect(pause.mock.invocationCallOrder[0]).toBeLessThan(synth.speak.mock.invocationCallOrder[0]);
    // Mientras LIA habla, la escucha global no puede volver a abrir el microfono.
    expect(coordinator.requestGlobal()).toBe(false);

    last().onend!();
    await expect(done).resolves.toBe(true);
    expect(speech.status()).toBe('idle');
    expect(resume).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(400);
    expect(resume).toHaveBeenCalledOnce();
    expect(coordinator.speaking()).toBe(false);
  });

  it('does not resume global listening if it was not active before', async () => {
    const speech = create();
    void speech.speak('Hola');
    last().onend!();
    await vi.advanceTimersByTimeAsync(1000);
    expect(pause).not.toHaveBeenCalled();
    expect(resume).not.toHaveBeenCalled();
  });

  it('never speaks over a LIA recording', async () => {
    audioStatus = 'recording';
    const speech = create();
    await expect(speech.speak('Hola')).resolves.toBe(false);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('LIA listening (acquireLia) silences the voice', () => {
    const speech = create();
    void speech.speak('Te mostraré tus contactos.');
    coordinator.acquireLia();
    expect(synth.cancel).toHaveBeenCalled();
    expect(speech.status()).toBe('idle');
    expect(coordinator.owner()).toBe('LIA');
  });

  it('an emergency interrupts secondary messages and same priority messages wait in a short queue', async () => {
    const speech = create();
    const info = speech.speak('Información', { priority: 'LOW' });
    const help = speech.speak('Voy a ayudarte.', { priority: 'CRITICAL' });
    await expect(info).resolves.toBe(false);
    expect(synth.cancel).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(60);
    expect(last().text).toBe('Voy a ayudarte.');

    const first = speech.speak('Estoy obteniendo tu ubicación.', { priority: 'CRITICAL' });
    void speech.speak('Ubicación obtenida.', { priority: 'CRITICAL' });
    void speech.speak('Tu solicitud de ayuda quedó registrada.', { priority: 'CRITICAL' });
    await expect(first).resolves.toBe(false);
    expect(synth.cancel).toHaveBeenCalledOnce();

    last().onend!();
    await expect(help).resolves.toBe(true);
    expect(last().text).toBe('Ubicación obtenida.');
    last().onend!();
    expect(last().text).toBe('Tu solicitud de ayuda quedó registrada.');
  });

  it('the disabled preference silences LIA, is saved and restored', async () => {
    let speech = create();
    speech.setEnabled(false);
    await expect(speech.speak('Hola')).resolves.toBe(false);
    expect(synth.speak).not.toHaveBeenCalled();
    expect(localStorage.getItem('vitalia.lia-voice')).toBe('false');

    TestBed.resetTestingModule();
    speech = create();
    expect(speech.enabled()).toBe(false);
    speech.setEnabled(true);
    expect(localStorage.getItem('vitalia.lia-voice')).toBe('true');
  });

  it('gives up if the browser never reports the end (watchdog) and releases the microphone', async () => {
    const speech = create();
    coordinator.requestGlobal();
    const done = speech.speak('Hola');
    await vi.advanceTimersByTimeAsync(5000 + 4 * 110 / 0.9 + 1);
    await expect(done).resolves.toBe(false);
    expect(speech.status()).toBe('idle');
    await vi.advanceTimersByTimeAsync(400);
    expect(resume).toHaveBeenCalledOnce();
  });

  it('retries once with another voice when an online voice fails', () => {
    voices = [DALIA, SABINA];
    const speech = create();
    void speech.speak('Hola');
    expect(last().voice).toBe(DALIA);
    last().onerror!({ error: 'network' });
    expect(last().voice).toBe(SABINA);
    expect(speech.status()).toBe('speaking');
  });

  it('pause keeps the microphone closed; resume continues and stop releases it', () => {
    const speech = create();
    coordinator.requestGlobal();
    void speech.speak('Hola');
    speech.pause();
    expect(speech.status()).toBe('paused');
    expect(coordinator.speaking()).toBe(true);
    speech.resume();
    expect(speech.status()).toBe('speaking');
    speech.stop();
    expect(speech.status()).toBe('idle');
    expect(resume).toHaveBeenCalledOnce();
  });
});
