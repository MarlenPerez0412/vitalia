import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LanguageContextService } from '../../../../core/i18n/language-context.service';
import { LiaLanguageCode } from '../../../../core/i18n/language.models';
import { AudioCaptureService } from '../../../../core/services/audio-capture.service';
import { LiaSpeechService } from '../../../../core/services/lia-speech.service';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { VoiceApiService } from '../../../../core/services/voice-api.service';
import { EmergencyService } from '../../services/emergency.service';
import { LiaMessage, SeniorContact } from '../../models/senior.models';
import { LiaPageComponent } from './lia-page.component';
import { IndigenousPhrase } from './indigenous-phrases';

type Page = {
  send(prompt: string, viaVoice?: boolean, inputVariant?: LiaLanguageCode): void;
  sendQuick(prompt: string): void;
  sendPhrase(phrase: IndigenousPhrase): void;
  switchLanguage(): void;
  toggleVoice(): Promise<void>;
  openAction(action: NonNullable<LiaMessage['action']>): void;
  messages(): readonly LiaMessage[];
  languageLabel(): string;
  canSwitchLanguage(): boolean;
  switchLanguageLabel(): string;
  callContact(): SeniorContact | null;
  pendingNote(message: LiaMessage): string;
};

describe('LiaPageComponent languages', () => {
  const start = vi.fn();
  const stop = vi.fn();
  const transcribe = vi.fn();
  let speak: ReturnType<typeof vi.spyOn>;
  let language: LanguageContextService;

  async function open(preferred: LiaLanguageCode = 'es'): Promise<Page> {
    vi.useFakeTimers();
    localStorage.clear();
    start.mockReset().mockResolvedValue(true);
    stop.mockReset().mockResolvedValue({ blob: new Blob(['wav']), mimeType: 'audio/wav', durationMs: 900, createdAt: '' });
    transcribe.mockReset();
    await TestBed.configureTestingModule({
      imports: [LiaPageComponent],
      providers: [
        provideRouter([]),
        { provide: PermissionsService, useValue: { checkMicrophonePermission: async () => 'granted', hasSeenExplanation: () => true, microphone: () => 'granted' } },
        { provide: AudioCaptureService, useValue: { start, stop, release: vi.fn(), status: () => 'idle', errorMessage: () => '' } },
        { provide: VoiceApiService, useValue: { transcribe } },
      ],
    }).compileComponents();
    speak = vi.spyOn(TestBed.inject(LiaSpeechService), 'speak').mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    language = TestBed.inject(LanguageContextService);
    language.setLiaLanguage(preferred);
    const fixture = TestBed.createComponent(LiaPageComponent);
    fixture.detectChanges();
    return fixture.componentInstance as unknown as Page;
  }
  afterEach(() => vi.useRealTimers());
  const lastLia = (page: Page) => page.messages().filter((message) => message.sender === 'lia').at(-1)!;
  async function ask(page: Page, text: string) { page.send(text); await vi.advanceTimersByTimeAsync(1100); return lastLia(page); }

  it('Spanish by default: no switch, replies in Spanish and spoken as before', async () => {
    const page = await open();
    expect(page.languageLabel()).toBe('Español (México)');
    expect(page.canSwitchLanguage()).toBe(false);
    expect(page.messages()[0]).toMatchObject({ variant: 'es', text: 'Hola, María. Estoy aquí para ayudarte. ¿Qué necesitas hoy?' });
    const reply = await ask(page, 'LIA, llama a mi hija.');
    expect(reply).toMatchObject({ variant: 'es', text: 'Encontré a Ana Hernández. ¿Quieres que abra el marcador para llamarla?', action: { label: 'Llamar a Ana' } });
    expect(speak).toHaveBeenCalledWith('Encontré a Ana Hernández. ¿Quieres que abra el marcador para llamarla?', expect.objectContaining({ priority: 'HIGH' }));
  });

  it.each([
    ['nahuatl-pilot', 'LIA, xijnotza noichpoca.', 'Nijpantik Ana Hernández.'],
    ['zapoteco-pilot', 'LIA, bicaa ridxi xiiñidxaapaʼ.', 'Bidxelaʼ Ana Hernández.'],
  ] as const)('%s: a typed predefined phrase is answered and spoken in the selected language', async (code, phrase, reply) => {
    const page = await open(code);
    expect(page.languageLabel()).not.toContain('piloto');
    const answer = await ask(page, phrase);
    expect(answer).toMatchObject({ variant: code, pilotText: true });
    expect(answer.text.startsWith(reply)).toBe(true);
    expect(page.pendingNote(answer)).toContain('sin validación de hablantes nativos');
    expect(speak).toHaveBeenCalledWith(expect.stringContaining(reply), expect.objectContaining({ lang: code === 'nahuatl-pilot' ? 'nah' : 'zap' }));
  });

  it('a predefined Nahuatl phrase typed during a Spanish conversation moves the conversation to Nahuatl', async () => {
    const page = await open();
    const answer = await ask(page, 'LIA, moneki nechpaleuisej.');
    expect(language.interactionVariant()).toBe('nahuatl-pilot');
    expect(answer).toMatchObject({ variant: 'nahuatl-pilot', intent: 'START_EMERGENCY', action: { emergency: true } });
    expect(page.switchLanguageLabel()).toBe('Cambiar a español');
  });

  it('sends a selected phrase through the same bidirectional chat flow', async () => {
    const page = await open('nahuatl-pilot');
    const phrase: IndigenousPhrase = {
      id: 'test-help', category: 'help', spanish: 'Necesito ayuda',
      nahuatl: { text: 'Moneki nechpaleuisej', translation: 'Necesito ayuda' },
      zapoteco: { text: 'Caquiiñeʼ gacanécabe naa', translation: 'Necesito ayuda' },
      audio: { nahuatl: null, zapoteco: null },
    };
    page.sendPhrase(phrase);
    await vi.advanceTimersByTimeAsync(1100);
    expect(page.messages().at(-2)).toMatchObject({ sender: 'user', text: 'Moneki nechpaleuisej' });
    expect(page.messages().at(-1)).toMatchObject({ sender: 'lia', variant: 'nahuatl-pilot', intent: 'START_EMERGENCY' });
  });

  it('acknowledges a selected phrase without assigning an unsafe action', async () => {
    const page = await open('nahuatl-pilot');
    const phrase: IndigenousPhrase = {
      id: 'test-goodbye', category: 'greeting', spanish: 'Despedida',
      nahuatl: { text: 'Xihualaca huan ximoiyocacahuaca.', translation: 'Despedida' },
      zapoteco: { text: 'Bidxaagalú ne despedida.', translation: 'Despedida' },
      audio: { nahuatl: null, zapoteco: null },
    };
    page.sendPhrase(phrase);
    await vi.advanceTimersByTimeAsync(500);
    expect(page.messages().at(-1)).toMatchObject({ sender: 'lia', variant: 'nahuatl-pilot', text: 'Nimitzcactoc.' });
  });

  it('help in a pilot never starts the emergency on its own: it needs the button', async () => {
    const page = await open('zapoteco-pilot');
    const emergency = TestBed.inject(EmergencyService);
    const answer = await ask(page, 'LIA, caquiiñeʼ gacanécabe naa.');
    expect(emergency.inProgress()).toBe(false);
    page.openAction(answer.action!);
    expect(emergency.step()).toBe('countdown');
  });

  it('an unrecognised pilot phrase gets the Spanish notice, flagged, with no action', async () => {
    const page = await open('nahuatl-pilot');
    const answer = await ask(page, 'tlen onkak ipan kalli');
    expect(answer).toMatchObject({ text: 'No pude reconocer ese comando. Puedes repetirlo o usar español.', translationPending: true });
    expect(answer.action).toBeUndefined();
    expect(speak).not.toHaveBeenCalled();
  });

  it('the call button opens the existing call confirmation (never dials by itself)', async () => {
    const page = await open('nahuatl-pilot');
    const answer = await ask(page, 'LIA, xijnotza noichpoca.');
    page.openAction(answer.action!);
    expect(page.callContact()).toMatchObject({ name: 'Ana Hernández' });
  });

  it('the medication reply carries the real data in every language', async () => {
    const page = await open('zapoteco-pilot');
    page.sendQuick('¿Qué medicamento me toca?');
    await vi.advanceTimersByTimeAsync(1100);
    expect(lastLia(page)).toMatchObject({ variant: 'zapoteco-pilot', intent: 'NEXT_MEDICATION' });
    expect(lastLia(page).text).toContain('500 mg de Metformina');
  });

  it('"habla en español" and the switch button change the conversation language explicitly', async () => {
    const page = await open('nahuatl-pilot');
    page.send('por favor habla en español');
    expect(language.interactionVariant()).toBe('es');
    expect(lastLia(page).text).toBe('De acuerdo. Seguiremos en español.');
    expect(speak).toHaveBeenCalledWith('De acuerdo. Seguiremos en español.', expect.anything());
    expect(page.switchLanguageLabel()).toBe('Cambiar a náhuatl');
    page.switchLanguage();
    expect(language.interactionVariant()).toBe('nahuatl-pilot');
    expect(lastLia(page)).toMatchObject({ variant: 'nahuatl-pilot', translationPending: true, text: 'De acuerdo. Seguiremos en náhuatl.' });
  });

  it('pilot voice uses the Spanish Vosk fallback and the matcher; it never blocks for lack of a native ASR', async () => {
    const page = await open('zapoteco-pilot');
    transcribe.mockResolvedValue('lia by carri city nyc chapa');
    await page.toggleVoice();
    expect(start).toHaveBeenCalledOnce();
    await page.toggleVoice();
    await vi.advanceTimersByTimeAsync(1100);
    expect(transcribe).toHaveBeenCalledOnce();
    expect(lastLia(page)).toMatchObject({ variant: 'zapoteco-pilot', intent: 'CALL_DAUGHTER' });
  });
});
