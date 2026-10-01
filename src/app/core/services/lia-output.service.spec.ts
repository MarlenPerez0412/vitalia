import { TestBed } from '@angular/core/testing';
import { LanguageContextService } from '../i18n/language-context.service';
import { LiaLanguageCode } from '../i18n/language.models';
import { LanguageIntentCatalog, LIA_INTENT_CATALOGS, LIA_MULTILINGUAL_INTENTS } from '../i18n/lia-multilingual-intents';
import { intentKey, PhrasebookService } from '../i18n/phrasebook.service';
import { LIA_EXPERIMENTAL_TTS_ENABLED, LIA_PILOT_TTS_PROVIDERS, LiaOutputService, PilotTtsProvider } from './lia-output.service';
import { LiaSpeechService } from './lia-speech.service';

describe('LiaOutputService', () => {
  let speak: ReturnType<typeof vi.spyOn>;
  let playClip: ReturnType<typeof vi.spyOn>;
  const nativeVoice: PilotTtsProvider = { variant: 'nahuatl-pilot', isAvailable: () => Promise.resolve(true), synthesize: () => Promise.resolve(new Blob(['wav'])) };

  function create(options: { recording?: boolean; experimental?: boolean; providers?: PilotTtsProvider[] } = {}) {
    localStorage.clear();
    const catalogs = structuredClone(LIA_MULTILINGUAL_INTENTS) as Record<LiaLanguageCode, LanguageIntentCatalog>;
    if (options.recording) catalogs['zapoteco-pilot'] = { ...catalogs['zapoteco-pilot'], recordedAudio: { [intentKey('HELP', 'response')]: 'help.mp3' } };
    TestBed.configureTestingModule({
      providers: [
        { provide: LIA_INTENT_CATALOGS, useValue: catalogs },
        { provide: LIA_EXPERIMENTAL_TTS_ENABLED, useValue: options.experimental ?? false },
        { provide: LIA_PILOT_TTS_PROVIDERS, useValue: options.providers ?? [] },
      ],
    });
    const speech = TestBed.inject(LiaSpeechService);
    speak = vi.spyOn(speech, 'speak').mockResolvedValue(true);
    playClip = vi.spyOn(speech, 'playClip').mockResolvedValue(true);
    return { output: TestBed.inject(LiaOutputService), phrases: TestBed.inject(PhrasebookService), language: TestBed.inject(LanguageContextService) };
  }

  it('Spanish goes to speechSynthesis synchronously with the same text and priority as before', () => {
    const { output, phrases } = create();
    const report = output.deliver(phrases.t('emergency.registered'), { priority: 'CRITICAL' });
    expect(speak).toHaveBeenCalledExactlyOnceWith('Tu solicitud de ayuda quedó registrada.', { priority: 'CRITICAL', interrupt: undefined });
    expect(report).toMatchObject({ visibleText: 'Tu solicitud de ayuda quedó registrada.', translationPending: false, spokenVia: 'speech-synthesis' });
  });

  it.each(['nahuatl-pilot', 'zapoteco-pilot'] as const)('a %s reply is shown and spoken with its requested language', async (code) => {
    const { output, phrases, language } = create();
    language.setAllowSpanishFallback(true);
    const message = phrases.t(intentKey('HELP', 'response'), {}, code);
    const report = output.deliver(message, { priority: 'CRITICAL' });
    expect(report).toMatchObject({ visibleText: message.text, translationPending: false, spokenVia: 'speech-synthesis' });
    await expect(report.done).resolves.toBe(true);
    expect(speak).toHaveBeenCalledWith(message.text, expect.objectContaining({ lang: code === 'nahuatl-pilot' ? 'nah' : 'zap' }));
    expect(playClip).not.toHaveBeenCalled();
  });

  it('a Spanish fallback text in a pilot is shown flagged and NOT spoken without permission', async () => {
    const { output, phrases } = create();
    const report = output.deliver(phrases.t('emergency.registered', {}, 'zapoteco-pilot'), { priority: 'CRITICAL' });
    expect(report).toMatchObject({ visibleText: 'Tu solicitud de ayuda quedó registrada.', translationPending: true, spokenVia: 'none' });
    await expect(report.done).resolves.toBe(false);
    expect(speak).not.toHaveBeenCalled();
  });

  it('Spanish speech is used for a Spanish fallback text only when the person allowed it', () => {
    const { output, phrases, language } = create();
    language.setAllowSpanishFallback(true);
    const report = output.deliver(phrases.t('emergency.registered', {}, 'nahuatl-pilot'), { priority: 'CRITICAL' });
    expect(report.spokenVia).toBe('spanish-fallback');
    expect(speak).toHaveBeenCalledWith('Tu solicitud de ayuda quedó registrada.', expect.objectContaining({ priority: 'CRITICAL', lang: 'es-MX' }));
  });

  it('a validated prerecorded pilot clip plays through the shared speech queue', () => {
    const { output, phrases } = create({ recording: true });
    const report = output.deliver(phrases.t(intentKey('HELP', 'response'), {}, 'zapoteco-pilot'), { priority: 'CRITICAL' });
    expect(report.spokenVia).toBe('recorded');
    expect(playClip).toHaveBeenCalledWith('/audio/zapoteco-pilot/help.mp3', expect.objectContaining({ priority: 'CRITICAL' }));
    expect(speak).not.toHaveBeenCalled();
  });

  it('a native pilot provider takes precedence when experimental TTS is enabled', async () => {
    const off = create({ providers: [nativeVoice] });
    expect(off.output.deliver(off.phrases.t(intentKey('HELP', 'response'), {}, 'nahuatl-pilot'), { priority: 'HIGH' }).spokenVia).toBe('speech-synthesis');
    TestBed.resetTestingModule();
    const on = create({ experimental: true, providers: [nativeVoice] });
    const report = on.output.deliver(on.phrases.t(intentKey('HELP', 'response'), {}, 'nahuatl-pilot'), { priority: 'HIGH' });
    expect(report.spokenVia).toBe('native-tts');
    await expect(report.done).resolves.toBe(true);
    expect(playClip).toHaveBeenCalledWith(expect.any(Blob), expect.objectContaining({ priority: 'HIGH' }));
    expect(speak).not.toHaveBeenCalled();
  });

  it('system notices that only exist in Spanish follow the same permission rule', () => {
    const { output, language } = create();
    expect(output.deliverSpanishNotice('No pude procesar tu voz.', { priority: 'NORMAL' }).spokenVia).toBe('speech-synthesis');
    language.switchInteraction('nahuatl-pilot');
    speak.mockClear();
    expect(output.deliverSpanishNotice('No pude procesar tu voz.', { priority: 'NORMAL' })).toMatchObject({ spokenVia: 'none', translationPending: true });
    expect(speak).not.toHaveBeenCalled();
  });
});
