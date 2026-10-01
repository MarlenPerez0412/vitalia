import { TestBed } from '@angular/core/testing';
import { LIA_LANGUAGE_CODES, MULTILINGUAL_INTENTS } from './language.models';
import { LIA_MULTILINGUAL_INTENTS } from './lia-multilingual-intents';
import { MultilingualVoiceIntentMatcher, phraseSimilarity } from './multilingual-voice-intent-matcher';

describe('MultilingualVoiceIntentMatcher', () => {
  let matcher: MultilingualVoiceIntentMatcher;
  beforeEach(() => { TestBed.configureTestingModule({}); matcher = TestBed.inject(MultilingualVoiceIntentMatcher); });

  // Cada frase canónica resuelve su intención en su idioma, con y sin "LIA".
  const canonical = LIA_LANGUAGE_CODES.flatMap((code) => MULTILINGUAL_INTENTS.map((intent) =>
    [code, intent, LIA_MULTILINGUAL_INTENTS[code].intents[intent].canonicalInput] as const));

  it.each(canonical)('%s: %s <- "%s"', (code, intent, phrase) => {
    expect(matcher.match(phrase, code)).toMatchObject({ language: code, intent, matchedBy: 'exact', confidence: 1, accepted: true });
    expect(matcher.match(phrase.replace(/^LIA,\s*/, ''), code)?.intent).toBe(intent);
  });

  it.each([
    ['nahuatl-pilot', 'tlachke pajtli nijtekiuia', 'NEXT_MEDICATION'],
    ['nahuatl-pilot', 'moneki nechpaleuisej', 'HELP'],
    ['nahuatl-pilot', 'xijnotza noichpoca', 'CALL_DAUGHTER'],
    ['zapoteco-pilot', 'xi medicina naquiiñe guicaa ya', 'NEXT_MEDICATION'],
    ['zapoteco-pilot', 'caquiine gacanecabe naa', 'HELP'],
    ['zapoteco-pilot', 'bicaa ridxi xiiñidxaapa', 'CALL_DAUGHTER'],
  ] as const)('%s tolerates text typed without accents or saltillos: "%s"', (code, text, intent) => {
    expect(matcher.match(text, code)?.intent).toBe(intent);
  });

  it.each(["LIA, caquiiñe' gacanécabe naa.", 'LIA, caquiiñe’ gacanécabe naa.', 'LIA, caquiiñeʼ gacanécabe naa.', 'LIA, caquiiñe gacanécabe naa.'])(
    'apostrophe variants do not break Zapotec: %s', (text) => {
      expect(matcher.match(text, 'zapoteco-pilot')).toMatchObject({ intent: 'HELP', accepted: true });
    });

  it('Zapotec apostrophe variants also resolve medication and daughter', () => {
    expect(matcher.match("xi medicina naquiiñe' guicaa' ya'", 'zapoteco-pilot')?.intent).toBe('NEXT_MEDICATION');
    expect(matcher.match('bicaa ridxi xiiñidxaapa’', 'zapoteco-pilot')?.intent).toBe('CALL_DAUGHTER');
  });

  it('accepts the Spanish aliases', () => {
    expect(matcher.match('¿Qué pastilla me toca?', 'es')).toMatchObject({ intent: 'NEXT_MEDICATION', matchedBy: 'alias' });
    expect(matcher.match('Auxilio', 'es')).toMatchObject({ intent: 'HELP', matchedBy: 'alias' });
    expect(matcher.match('Marca a mi hija', 'es')).toMatchObject({ intent: 'CALL_DAUGHTER', matchedBy: 'alias' });
  });

  it.each([
    ['nahuatl-pilot', 'lia tlaquepaque glynnis de kiwi', 'NEXT_MEDICATION'],
    ['nahuatl-pilot', 'lia monet kenneth pa lewis edge', 'HELP'],
    ['nahuatl-pilot', 'lia sydney shannon spoke', 'CALL_DAUGHTER'],
    ['zapoteco-pilot', 'lia once medicina anakin y eggy calla', 'NEXT_MEDICATION'],
    ['zapoteco-pilot', 'lia que aqui llega caneca ve nada', 'HELP'],
    ['zapoteco-pilot', 'lia by carri city nyc chapa', 'CALL_DAUGHTER'],
  ] as const)('%s recognises the calibrated Spanish-Vosk transcription "%s" (experimental fallback)', (code, heard, intent) => {
    expect(matcher.match(heard, code)).toMatchObject({ intent, matchedBy: 'vosk-variant', accepted: true });
  });

  it('a close but inexact Vosk transcription can resolve medication or the daughter', () => {
    expect(matcher.match('lia tlaquepaque glinis de kiwi', 'nahuatl-pilot')).toMatchObject({ intent: 'NEXT_MEDICATION', matchedBy: 'fuzzy', accepted: true });
    expect(matcher.match('lia by carry city nyc chapa', 'zapoteco-pilot')).toMatchObject({ intent: 'CALL_DAUGHTER', accepted: true });
  });

  it('HELP with low confidence never triggers: an approximate match stays below its strict threshold', () => {
    const almost = matcher.evaluate('lia monet kenet pa luis edge', 'nahuatl-pilot');
    expect(almost).toMatchObject({ intent: 'HELP', matchedBy: 'fuzzy', accepted: false });
    expect(almost!.confidence).toBeLessThan(almost!.threshold);
    expect(matcher.match('lia monet kenet pa luis edge', 'nahuatl-pilot')).toBeNull();
    expect(matcher.match('caquiine gacaneca naa', 'zapoteco-pilot')).toBeNull();
  });

  it('unknown or unrelated phrases resolve nothing', () => {
    expect(matcher.match('tlen onkak ipan kalli', 'nahuatl-pilot')).toBeNull();
    expect(matcher.match('hoy hace buen día', 'zapoteco-pilot')).toBeNull();
    expect(matcher.match('', 'es')).toBeNull();
    expect(matcher.match('lia', 'nahuatl-pilot')).toBeNull();
  });

  it('a pilot phrase is not taken for another language', () => {
    expect(matcher.match('LIA, xijnotza noichpoca.', 'zapoteco-pilot')).toBeNull();
    expect(matcher.matchAny('LIA, xijnotza noichpoca.', ['nahuatl-pilot', 'zapoteco-pilot'])).toMatchObject({ language: 'nahuatl-pilot', intent: 'CALL_DAUGHTER' });
  });

  it('phraseSimilarity is 1 for equal phrases and lower for different ones', () => {
    expect(phraseSimilarity('xijnotza noichpoca', 'xijnotza noichpoca')).toBe(1);
    expect(phraseSimilarity('xijnotza noichpoca', 'moneki nechpaleuisej')).toBeLessThan(0.5);
  });
});
