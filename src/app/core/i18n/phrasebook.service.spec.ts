import { TestBed } from '@angular/core/testing';
import { LanguageContextService } from './language-context.service';
import { LanguageIntentCatalog, LIA_INTENT_CATALOGS, LIA_MULTILINGUAL_INTENTS } from './lia-multilingual-intents';
import { LiaLanguageCode } from './language.models';
import { intentKey, PhrasebookService } from './phrasebook.service';

const METFORMINA = { medication: 'Metformina', dose: { dose: '500 mg · Con alimentos' }, time: { time: '10:00 AM' } };
const LOSARTAN = { medication: 'Losartán', dose: { dose: '50 mg' }, time: { time: '8:00 PM' } };
type Catalogs = Record<LiaLanguageCode, LanguageIntentCatalog>;

describe('PhrasebookService', () => {
  function create(catalogs?: Catalogs) {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: catalogs ? [{ provide: LIA_INTENT_CATALOGS, useValue: catalogs }] : [] });
    return { phrases: TestBed.inject(PhrasebookService), language: TestBed.inject(LanguageContextService) };
  }

  it('Spanish texts stay exactly as before', () => {
    const { phrases } = create();
    expect(phrases.t('lia.welcome', { name: 'María' }).text).toBe('Hola, María. Estoy aquí para ayudarte. ¿Qué necesitas hoy?');
    expect(phrases.t('emergency.registered').text).toBe('Tu solicitud de ayuda quedó registrada.');
  });

  it('{medication}, {dose} and {time} come from the data: shown as written, spoken in words in Spanish', () => {
    const { phrases } = create();
    const key = intentKey('NEXT_MEDICATION', 'response');
    expect(phrases.t(key, METFORMINA, 'es').text).toBe('Tu próximo medicamento es Metformina de 500 mg a las 10:00 AM. ¿Quieres que marque la toma como realizada cuando lo tomes?');
    expect(phrases.t(key, METFORMINA, 'es', 'speech').text).toBe('Tu próximo medicamento es Metformina de 500 miligramos a las 10 de la mañana. ¿Quieres que marque la toma como realizada cuando lo tomes?');
    expect(phrases.t(key, LOSARTAN, 'es', 'speech').text).toContain('Losartán de 50 miligramos a las 8 de la noche.');
  });

  it('pilot templates insert the same real data as written (technical terms are not translated)', () => {
    const { phrases } = create();
    const key = intentKey('NEXT_MEDICATION', 'response');
    expect(phrases.t(key, LOSARTAN, 'nahuatl-pilot').text).toBe('Nopa seyok pajtli tlen tijselis eli 50 mg Losartán ipan 8:00 PM. ¿Tijneki ma nijtlalili se marca kej tijpixtok kema tijkuis?');
    expect(phrases.t(key, METFORMINA, 'zapoteco-pilot', 'speech').text).toContain('nga 500 mg de Metformina 10:00 AM.');
  });

  it.each(['es', 'nahuatl-pilot', 'zapoteco-pilot'] as const)('{contactName} is replaced with the real contact (%s)', (code) => {
    const { phrases } = create();
    const text = phrases.t(intentKey('CALL_DAUGHTER', 'response'), { contactName: 'Rosa Pérez' }, code).text;
    expect(text).toContain('Rosa Pérez');
    expect(text).not.toMatch(/\{\w+\}/);
  });

  it('a pilot text is available, marked as pilot without native validation', () => {
    const { phrases } = create();
    expect(phrases.t(intentKey('HELP', 'response'), {}, 'zapoteco-pilot')).toMatchObject({
      variant: 'zapoteco-pilot', available: true, nativeValidation: false, fallbackText: null,
      text: 'Rucaadiagaʼ lii. Naa nuaa né lii. Pa racaláʼdxiluʼ guneʼ activar solicitud de ayuda ne guiníʼneluʼ contactu stiluʼ de emergencia la?',
    });
  });

  it('falls back to Spanish only when a pilot message has no translation', () => {
    const { phrases } = create();
    expect(phrases.t(intentKey('HELP', 'confirmation'), {}, 'nahuatl-pilot')).toMatchObject({
      variant: 'nahuatl-pilot', available: true, text: 'Kuali kajki. Ya mosentlalijtok tlen tijchijki.', fallbackText: null,
    });
    // Los mensajes del sistema solo existen en español.
    expect(phrases.t('emergency.registered', {}, 'zapoteco-pilot')).toMatchObject({ available: false, text: 'Tu solicitud de ayuda quedó registrada.' });
  });

  it('a pilot catalog missing an intent falls back to the Spanish response with real data', () => {
    const catalogs = structuredClone(LIA_MULTILINGUAL_INTENTS) as Catalogs;
    (catalogs['nahuatl-pilot'].intents as Record<string, unknown>)['CALL_DAUGHTER'] = undefined;
    const { phrases } = create(catalogs);
    expect(phrases.t(intentKey('CALL_DAUGHTER', 'response'), { contactName: 'Ana Hernández' }, 'nahuatl-pilot')).toMatchObject({
      available: false, text: 'Encontré a Ana Hernández. ¿Quieres que abra el marcador para llamarla?',
    });
  });

  it('follows the conversation language by default', () => {
    const { phrases, language } = create();
    language.switchInteraction('nahuatl-pilot');
    expect(phrases.t(intentKey('HELP', 'response')).text).toMatch(/^Nimitzcaqui\./);
  });

  it('there are no recorded pilot clips yet; when there are, they are served from public/audio/<code>/', () => {
    expect(create().phrases.recordedAudio(intentKey('HELP', 'response'), 'zapoteco-pilot')).toBeNull();
    TestBed.resetTestingModule();
    const catalogs = structuredClone(LIA_MULTILINGUAL_INTENTS) as Catalogs;
    catalogs['zapoteco-pilot'] = { ...catalogs['zapoteco-pilot'], recordedAudio: { [intentKey('HELP', 'response')]: 'help.mp3' } };
    expect(create(catalogs).phrases.recordedAudio(intentKey('HELP', 'response'), 'zapoteco-pilot')).toBe('/audio/zapoteco-pilot/help.mp3');
  });

  it('reports the pilot coverage honestly: three intents, no native validation', () => {
    expect(create().phrases.coverage('nahuatl-pilot')).toEqual({ intents: ['NEXT_MEDICATION', 'HELP', 'CALL_DAUGHTER'], nativeValidation: false });
  });
});
