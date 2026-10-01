import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AudioRecording } from '../../../../core/models/permission.models';
import { AudioCaptureService } from '../../../../core/services/audio-capture.service';
import { LiaSpeechService } from '../../../../core/services/lia-speech.service';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { VoiceApiError, VoiceApiService } from '../../../../core/services/voice-api.service';
import { VoiceSessionCoordinatorService } from '../../../../core/services/voice-session-coordinator.service';
import { SeniorStateService } from '../../services/senior-state.service';
import { LiaPageComponent } from './lia-page.component';

type Page = { toggleVoice(): Promise<void>; send(prompt: string): void; state(): string; voiceNotice(): string; messages(): readonly { text: string; viaVoice?: boolean; sender: string }[] };

describe('LiaPageComponent voice flow', () => {
  const recording: AudioRecording = { blob: new Blob(['a']), mimeType: 'audio/webm', durationMs: 1000, createdAt: '' };
  const transcribe = vi.fn();
  let speak: ReturnType<typeof vi.spyOn>;
  let navigate: ReturnType<typeof vi.spyOn>;
  const spoken = (): string[] => speak.mock.calls.map(([text]: unknown[]) => text as string);

  beforeEach(async () => {
    vi.useFakeTimers();
    transcribe.mockReset();
    await TestBed.configureTestingModule({
      imports: [LiaPageComponent],
      providers: [
        provideRouter([]),
        { provide: PermissionsService, useValue: { checkMicrophonePermission: async () => 'granted', hasSeenExplanation: () => true, microphone: () => 'granted' } },
        { provide: AudioCaptureService, useValue: { start: async () => true, stop: async () => recording, release: vi.fn(), status: () => 'stopped', errorMessage: () => '' } },
        { provide: VoiceApiService, useValue: { transcribe } },
      ],
    }).compileComponents();
    speak = vi.spyOn(TestBed.inject(LiaSpeechService), 'speak').mockResolvedValue(true);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => vi.useRealTimers());

  function open(): Page {
    const fixture = TestBed.createComponent(LiaPageComponent);
    fixture.detectChanges();
    return fixture.componentInstance as unknown as Page;
  }

  async function talk(): Promise<Page> {
    const page = open();
    await page.toggleVoice();
    expect(page.state()).toBe('listening');
    await page.toggleVoice();
    return page;
  }

  it('sends the transcription to LIA and records the medication', async () => {
    transcribe.mockResolvedValue('ya me tome mi medicamento');
    const page = await talk();
    expect(page.messages().at(-1)).toMatchObject({ sender: 'user', text: 'ya me tome mi medicamento', viaVoice: true });
    await vi.advanceTimersByTimeAsync(1200);
    expect(page.messages().at(-1)?.text).toContain('Metformina');
    expect(TestBed.inject(SeniorStateService).medications().find((item) => item.id === 'med-metformin')?.status).toBe('TAKEN');
  });

  it('keeps LIA usable when the backend is unavailable', async () => {
    transcribe.mockRejectedValue(new VoiceApiError('No pude procesar tu voz. Puedes seguir escribiendo.', 0));
    const page = await talk();
    expect(page.state()).toBe('idle');
    expect(page.voiceNotice()).toBe('No pude procesar tu voz. Puedes seguir escribiendo.');
  });

  it('asks to repeat when nothing was recognized', async () => {
    transcribe.mockResolvedValue('');
    const page = await talk();
    expect(page.voiceNotice()).toContain('No logré entender');
    expect(page.messages().some((message) => message.sender === 'user')).toBe(false);
  });

  it('speaks only what was really recorded and keeps the microphone turn until LIA answers', async () => {
    transcribe.mockResolvedValue('ya me tome mi medicamento');
    const coordinator = TestBed.inject(VoiceSessionCoordinatorService);
    await talk();
    // Captura terminada: la escucha global no se reabre mientras LIA prepara la respuesta.
    expect(coordinator.owner()).toBe('LIA');
    await vi.advanceTimersByTimeAsync(1200);
    expect(spoken()).toEqual(['Perfecto. Registré tu medicamento Metformina como tomado.']);
    expect(coordinator.owner()).toBe('IDLE');
  });

  it('says "te escuché" and "estoy procesando" only when the answer takes time', async () => {
    transcribe.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve('que medicamento me toca'), 5000)));
    const page = open();
    await page.toggleVoice();
    const stopping = page.toggleVoice();
    await vi.advanceTimersByTimeAsync(1200);
    expect(spoken()).toEqual(['Sí, te escuché.']);
    await vi.advanceTimersByTimeAsync(2800);
    expect(spoken().at(-1)).toBe('Estoy procesando lo que me dijiste. Espera un momento.');
    await vi.advanceTimersByTimeAsync(2200);
    await stopping;
    expect(spoken().at(-1)).toBe('Tu próximo medicamento es Metformina de 500 miligramos a las 10 de la mañana.');
    expect(spoken()).toHaveLength(3);
  });

  it('opens the existing screen after answering, unless the person keeps talking', async () => {
    const page = open();
    page.send('Quiero llamar a mi familia');
    await vi.advanceTimersByTimeAsync(1100);
    expect(spoken().at(-1)).toBe('Claro. Te mostraré tus contactos.');
    expect(navigate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1500);
    expect(navigate).toHaveBeenCalledWith(['/senior/family'], expect.anything());

    navigate.mockClear();
    page.send('Dame información de mi pensión');
    await vi.advanceTimersByTimeAsync(1100);
    await page.toggleVoice();
    await vi.advanceTimersByTimeAsync(2000);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('a voice processing error is shown and spoken', async () => {
    transcribe.mockRejectedValue(new VoiceApiError('No pude procesar tu voz. Puedes seguir escribiendo.', 0));
    await talk();
    expect(spoken()).toEqual(['No pude procesar tu voz. Puedes seguir escribiendo.']);
    expect(TestBed.inject(VoiceSessionCoordinatorService).owner()).toBe('IDLE');
  });
});
