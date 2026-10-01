import { TestBed } from '@angular/core/testing';
import { parseGlobalVoiceCommand } from './global-voice-command.parser';
import { IntentLexiconService, SPANISH_LEXICON } from './intent-lexicon';

describe('IntentLexicon', () => {
  let lexicons: IntentLexiconService;
  beforeEach(() => { TestBed.configureTestingModule({}); lexicons = TestBed.inject(IntentLexiconService); });

  it.each([
    ['¿Qué medicamento me toca?', 'NEXT_MEDICATION'],
    ['LIA, ¿qué medicación estoy tomando?', 'NEXT_MEDICATION'],
    ['ya me tome mi medicamento', 'MEDICATION_TAKEN'],
    ['Necesito ayuda', 'START_EMERGENCY'],
    ['Quiero hablar con mi hija', 'CALL_FAMILY'],
    ['LIA, llama a mi hija.', 'CALL_DAUGHTER'],
    ['muestrame mi ubicacion', 'OPEN_LOCATION'],
    ['Quiero registrar cómo me siento', 'START_CHECKIN'],
    ['Dame información de mi pensión', 'PENSION_INFO'],
    ['Quiero hacer un ejercicio de memoria', 'MEMORY_ACTIVITY'],
  ])('Spanish keeps its LIA rules: %s -> %s', (text, intent) => {
    expect(lexicons.forVariant('es').liaIntent(text)?.intent).toBe(intent);
  });

  it('Spanish keeps its global command rules and wake word (default lexicon)', () => {
    expect(parseGlobalVoiceCommand('LIA, llama a mi contacto de emergencia')?.intent).toBe('CALL_PRIMARY_CONTACT');
    expect(parseGlobalVoiceCommand('lia habra emergencia')?.intent).toBe('OPEN_EMERGENCY');
    expect(parseGlobalVoiceCommand('oye lía me caí')?.intent).toBe('EMERGENCY_FALL');
    expect(parseGlobalVoiceCommand('lia que medicacion estoy tomando')?.intent).toBe('NEXT_MEDICATION');
    expect(parseGlobalVoiceCommand('sí')).toBeNull();
    expect(parseGlobalVoiceCommand('sí', { awaitingAnswer: true })?.intent).toBe('CONFIRM');
    expect(parseGlobalVoiceCommand('hoy hace buen día')).toBeNull();
    expect(SPANISH_LEXICON.variant).toBe('es');
  });

  it.each([
    ['nahuatl-pilot', 'LIA, tlachke pajtli nijtekiuia?', 'NEXT_MEDICATION', 'NEXT_MEDICATION'],
    ['nahuatl-pilot', 'LIA, moneki nechpaleuisej.', 'START_EMERGENCY', 'EMERGENCY_HELP'],
    ['nahuatl-pilot', 'LIA, xijnotza noichpoca.', 'CALL_DAUGHTER', 'CALL_DAUGHTER'],
    ['zapoteco-pilot', 'LIA, xi medicina naquiiñeʼ guicaaʼ yaʼ.', 'NEXT_MEDICATION', 'NEXT_MEDICATION'],
    ['zapoteco-pilot', 'LIA, caquiiñeʼ gacanécabe naa.', 'START_EMERGENCY', 'EMERGENCY_HELP'],
    ['zapoteco-pilot', 'LIA, bicaa ridxi xiiñidxaapaʼ.', 'CALL_DAUGHTER', 'CALL_DAUGHTER'],
  ] as const)('%s maps "%s" to the SAME intents as Spanish (%s / %s)', (code, phrase, liaIntent, globalIntent) => {
    expect(lexicons.forVariant(code).liaIntent(phrase)?.intent).toBe(liaIntent);
    expect(parseGlobalVoiceCommand(phrase, { lexicons: lexicons.chainFor(code) })).toMatchObject({ intent: globalIntent, variant: code, wakeWord: true });
  });

  it('a pilot conversation still understands Spanish, and answers in Spanish', () => {
    expect(parseGlobalVoiceCommand('lia necesito ayuda', { lexicons: lexicons.chainFor('zapoteco-pilot') })).toMatchObject({ intent: 'EMERGENCY_HELP', variant: 'es' });
    expect(parseGlobalVoiceCommand('sí', { awaitingAnswer: true, lexicons: lexicons.chainFor('nahuatl-pilot') })?.intent).toBe('CONFIRM');
  });

  it('pilot phrases without "LIA" are ignored; unknown pilot commands are UNKNOWN in the pilot language', () => {
    expect(parseGlobalVoiceCommand('xijnotza noichpoca', { lexicons: lexicons.chainFor('nahuatl-pilot') })).toBeNull();
    expect(parseGlobalVoiceCommand('lia tlen onkak ipan kalli', { lexicons: lexicons.chainFor('nahuatl-pilot') })).toMatchObject({ intent: 'UNKNOWN', variant: 'nahuatl-pilot' });
  });

  it('HELP by approximation never becomes an emergency in a pilot', () => {
    expect(parseGlobalVoiceCommand('lia monet kenet pa luis edge', { lexicons: lexicons.chainFor('nahuatl-pilot') })?.intent).toBe('UNKNOWN');
    expect(lexicons.forVariant('zapoteco-pilot').liaIntent('caquiine gacaneca naa')).toBeNull();
  });

  it('the language-switch request exists only in Spanish', () => {
    const spanish = lexicons.forVariant('es');
    expect(spanish.languageSwitch(spanish.normalize('Habla en náhuatl'))).toBe('nahuatl-pilot');
    expect(spanish.languageSwitch(spanish.normalize('respóndeme en zapoteco'))).toBe('zapoteco-pilot');
    expect(spanish.languageSwitch(spanish.normalize('sigamos en español'))).toBe('es');
    expect(lexicons.forVariant('nahuatl-pilot').languageSwitch('habla en español')).toBeNull();
  });
});
