import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LanguageContextService } from '../../../core/i18n/language-context.service';
import { LiaLanguageCode } from '../../../core/i18n/language.models';
import { VitaliaLocation } from '../../../core/models/location.models';
import { AudioCaptureService } from '../../../core/services/audio-capture.service';
import { EmergencyRegistryService } from '../../../core/services/emergency-registry.service';
import { LiaSpeechService } from '../../../core/services/lia-speech.service';
import { LocationService } from '../../../core/services/location.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { VoiceApiService } from '../../../core/services/voice-api.service';
import { EmergencyService } from './emergency.service';
import { SeniorStateService } from './senior-state.service';
import { VoiceCommandService } from './voice-command.service';

/**
 * Simetria linguistica de los comandos globales: la respuesta sale en la lengua de la entrada, y las tres lenguas
 * terminan en los MISMOS servicios (emergencia, contactos, medicamentos). Náhuatl y zapoteco son piloto.
 */
describe('LIA language symmetry', () => {
  const location: VitaliaLocation = { latitude: 19.4, longitude: -99.1, accuracy: 20, timestamp: '', source: 'REAL' };
  const getCurrentPosition = vi.fn();
  let speak: ReturnType<typeof vi.spyOn>;
  let playClip: ReturnType<typeof vi.spyOn>;

  function setup(language: LiaLanguageCode) {
    vi.useFakeTimers();
    localStorage.clear();
    getCurrentPosition.mockReset().mockResolvedValue(location);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AudioCaptureService, useValue: { startContinuous: vi.fn(), stopContinuous: vi.fn(), hearingSpeech: () => false, errorMessage: () => '', status: () => 'idle' } },
        { provide: VoiceApiService, useValue: { transcribe: vi.fn() } },
        { provide: PermissionsService, useValue: { checkMicrophonePermission: async () => 'granted', needsExplanation: async () => false, markExplanationSeen: vi.fn() } },
        { provide: LocationService, useValue: { getCurrentPosition, getDemoPosition: vi.fn(), status: () => 'granted' } },
      ],
    });
    const speech = TestBed.inject(LiaSpeechService);
    speak = vi.spyOn(speech, 'speak').mockResolvedValue(true);
    playClip = vi.spyOn(speech, 'playClip').mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const context = TestBed.inject(LanguageContextService);
    context.setLiaLanguage(language);
    return { voice: TestBed.inject(VoiceCommandService), emergency: TestBed.inject(EmergencyService), context };
  }
  afterEach(() => vi.useRealTimers());

  async function say(voice: VoiceCommandService, text: string, variant: LiaLanguageCode) {
    const done = voice.handleTranscript(text, variant);
    await vi.advanceTimersByTimeAsync(700);
    await done;
  }
  const spokenTexts = () => speak.mock.calls.map(([text]: unknown[]) => text as string);

  it('Spanish: "LIA, necesito ayuda" starts the help request and answers in Spanish (text and voice)', async () => {
    const { voice, emergency } = setup('es');
    await say(voice, 'lia necesito ayuda', 'es');
    expect(emergency.step()).toBe('countdown');
    expect(voice.feedback()?.message).toBe('Voy a iniciar la solicitud de ayuda. Puedes cancelar.');
    expect(spokenTexts()).toEqual(['Te escuché. Estoy contigo. ¿Quieres que active la solicitud de ayuda y contacte a tu familiar de emergencia?']);
  });

  it.each([
    ['nahuatl-pilot', 'LIA, tlachke pajtli nijtekiuia?', /^Nopa seyok pajtli tlen tijselis eli 500 mg Metformina ipan 10:00/],
    ['zapoteco-pilot', 'LIA, xi medicina naquiiñeʼ guicaaʼ yaʼ.', /^Sti medicina ni chigudiicabe lii nga 500 mg de Metformina 10:00/],
  ] as const)('%s: next medication answers in the pilot with the real data, shown as text only', async (code, phrase, reply) => {
    const { voice } = setup(code);
    await say(voice, phrase, code);
    expect(voice.feedback()).toMatchObject({ pilotText: true, action: { route: '/senior/medications' } });
    expect(voice.feedback()?.message).toMatch(reply);
    expect(voice.prompt()).toEqual({ kind: 'MEDICATION' });
    // Sin voz nativa: nunca se lee con la voz española.
    expect(speak).not.toHaveBeenCalled();
    expect(playClip).not.toHaveBeenCalled();
  });

  it.each([
    ['nahuatl-pilot', 'LIA, xijnotza noichpoca.', 'Nijpantik Ana Hernández.'],
    ['zapoteco-pilot', 'LIA, bicaa ridxi xiiñidxaapaʼ.', 'Bidxelaʼ Ana Hernández.'],
  ] as const)('%s: calling the daughter finds the real contact and only prepares the call', async (code, phrase, reply) => {
    const { voice } = setup(code);
    await say(voice, phrase, code);
    expect(voice.prompt()).toMatchObject({ kind: 'CALL', contact: { name: 'Ana Hernández' } });
    expect(voice.feedback()?.message.startsWith(reply)).toBe(true);
    // "Sí" no marca: pide pulsar el botón; la confirmación aún no tiene traducción piloto y se muestra en español.
    await say(voice, 'sí', code);
    expect(voice.feedback()).toMatchObject({ message: 'Pulsa «Llamar a Ana» para abrir el marcador.', translationPending: true });
    expect(speak).not.toHaveBeenCalled();
  });

  it.each([
    ['nahuatl-pilot', 'LIA, moneki nechpaleuisej.'],
    ['zapoteco-pilot', 'LIA, caquiiñeʼ gacanécabe naa.'],
  ] as const)('%s: help uses the same emergency flow (countdown, GPS, registry), never blocked by language', async (code, phrase) => {
    const { voice, emergency } = setup(code);
    await say(voice, phrase, code);
    expect(emergency.step()).toBe('countdown');
    expect(emergency.type()).toBe('HELP');
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(1400);
    expect(getCurrentPosition).toHaveBeenCalledOnce();
    expect(emergency.step()).toBe('registered');
    expect(TestBed.inject(EmergencyRegistryService).latest()).toMatchObject({ type: 'HELP', source: 'GLOBAL_VOICE', locationSource: 'REAL' });
  });

  it('HELP recognised with low confidence does not start an emergency', async () => {
    const { voice, emergency } = setup('nahuatl-pilot');
    await say(voice, 'lia monet kenet pa luis edge', 'nahuatl-pilot');
    expect(emergency.inProgress()).toBe(false);
    expect(voice.feedback()).toMatchObject({ message: 'No pude reconocer ese comando. Puedes repetirlo o usar español.', translationPending: true });
  });

  it('an unrecognised pilot phrase shows the Spanish notice, executes nothing and is not spoken without permission', async () => {
    const { voice, emergency, context } = setup('zapoteco-pilot');
    await say(voice, 'lia nada que ver con nada', 'zapoteco-pilot');
    expect(voice.feedback()?.message).toBe('No pude reconocer ese comando. Puedes repetirlo o usar español.');
    expect(voice.prompt()).toBeNull();
    expect(emergency.inProgress()).toBe(false);
    expect(speak).not.toHaveBeenCalled();
    context.setAllowSpanishFallback(true);
    await say(voice, 'lia nada que ver con nada', 'zapoteco-pilot');
    expect(speak).toHaveBeenCalledWith('No pude reconocer ese comando. Puedes repetirlo o usar español.', expect.objectContaining({ lang: 'es-MX' }));
  });

  it('the Vosk fallback text of a pilot phrase resolves the intent (experimental recognition)', async () => {
    const { voice } = setup('nahuatl-pilot');
    await say(voice, 'lia sydney shannon spoke', 'nahuatl-pilot');
    expect(voice.prompt()).toMatchObject({ kind: 'CALL' });
    expect(voice.languageNotice()).toContain('experimental');
  });

  it('no language duplicates domain logic: the same intent ends in the same data in every language', async () => {
    const results: string[] = [];
    for (const [code, phrase] of [['es', 'lia llama a mi hija'], ['nahuatl-pilot', 'LIA, xijnotza noichpoca.'], ['zapoteco-pilot', 'LIA, bicaa ridxi xiiñidxaapaʼ.']] as const) {
      TestBed.resetTestingModule();
      const { voice } = setup(code);
      await say(voice, phrase, code);
      const prompt = voice.prompt();
      results.push(prompt?.kind === 'CALL' ? prompt.contact.id : 'none');
      vi.useRealTimers();
    }
    expect(new Set(results).size).toBe(1);
    expect(results[0]).not.toBe('none');
  });

  it('confirming the medication question by voice never records the dose by itself', async () => {
    const { voice } = setup('es');
    const state = TestBed.inject(SeniorStateService);
    const pending = state.nextMedication()!;
    await say(voice, 'lia que medicamento me toca', 'es');
    await say(voice, 'sí', 'es');
    expect(voice.feedback()?.message).toBe('De acuerdo. Cuando lo tomes, pulsa «Ya la tomé» y quedará registrado.');
    expect(state.nextMedication()?.id).toBe(pending.id);
    expect(voice.prompt()).toBeNull();
  });
});
