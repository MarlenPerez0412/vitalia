import { detectLanguage, LANGUAGE_SWITCH_CONFIDENCE } from './language-detector';

describe('detectLanguage (conservative)', () => {
  it.each(['ayuda', 'sí', 'lia', 'hola buenos'])('never decides with fewer than three words: %s', (text) => {
    expect(detectLanguage(text)).toMatchObject({ language: null, confidence: 0 });
  });

  it.each(['¿Qué medicamento me toca?', 'Quiero llamar a mi familia', 'Dame información de mi pensión', 'Ya me tomé mi medicamento'])(
    'recognizes clear Spanish with high confidence: %s', (text) => {
      const detection = detectLanguage(text);
      expect(detection.language).toBe('es');
      expect(detection.confidence).toBeGreaterThanOrEqual(LANGUAGE_SWITCH_CONFIDENCE);
    });

  it('a predefined pilot phrase (high matcher confidence) identifies that pilot', () => {
    expect(detectLanguage('LIA, xijnotza noichpoca.', { language: 'nahuatl-pilot', confidence: 1 })).toMatchObject({ language: 'nahuatl', variant: 'nahuatl-pilot' });
    expect(detectLanguage('LIA, caquiiñeʼ gacanécabe naa.', { language: 'zapoteco-pilot', confidence: 0.95 })).toMatchObject({ language: 'zapoteco', variant: 'zapoteco-pilot' });
  });

  it('an approximate pilot match is not enough to change language', () => {
    expect(detectLanguage('xijnotza noichpoca ahora mismo', { language: 'nahuatl-pilot', confidence: 0.8 }).variant).not.toBe('nahuatl-pilot');
  });

  it('"ñ" alone is not a Zapotec signal and mixed or unknown text stays undecided', () => {
    expect(detectLanguage('ñañ ñoñ ñuñ').language).toBeNull();
    expect(detectLanguage('kiubo mai bro').language).toBeNull();
  });
});
