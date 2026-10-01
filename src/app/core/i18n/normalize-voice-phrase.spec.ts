import { loosePhrase, normalizeVoicePhrase } from './normalize-voice-phrase';

describe('normalizeVoicePhrase', () => {
  it('lowercases, trims, removes punctuation and collapses spaces', () => {
    expect(normalizeVoicePhrase('  LIA,   ¿Qué  medicación estoy tomando?  ')).toBe('lia qué medicación estoy tomando');
    expect(normalizeVoicePhrase('¡Necesito   ayuda!')).toBe('necesito ayuda');
  });

  it('removes the wake word "LIA" (and its Vosk forms) only when asked', () => {
    expect(normalizeVoicePhrase('LIA, xijnotza noichpoca.', { stripWakeWord: true })).toBe('xijnotza noichpoca');
    expect(normalizeVoicePhrase('Lía necesito ayuda', { stripWakeWord: true })).toBe('necesito ayuda');
    expect(normalizeVoicePhrase('oye lia necesito ayuda', { stripWakeWord: true })).toBe('necesito ayuda');
    expect(normalizeVoicePhrase('liana llegó', { stripWakeWord: true })).toBe('liana llegó');
  });

  it.each(["caquiiñe' gacanécabe naa", 'caquiiñe’ gacanécabe naa', 'caquiiñeʼ gacanécabe naa', 'caquiiñe‘ gacanécabe naa', 'caquiiñe´ gacanécabe naa'])(
    'unifies every apostrophe/saltillo form: %s', (text) => {
      expect(normalizeVoicePhrase(text)).toBe("caquiiñe' gacanécabe naa");
    });

  it('keeps accents and saltillos inside words; it never translates', () => {
    expect(normalizeVoicePhrase('Rucaadiagaʼ lii.')).toBe("rucaadiaga' lii");
    expect(normalizeVoicePhrase('LIA, tlachke pajtli nijtekiuia?')).toBe('lia tlachke pajtli nijtekiuia');
  });

  it('treats a lone apostrophe as punctuation', () => {
    expect(normalizeVoicePhrase("hola ' lia")).toBe('hola lia');
  });

  it('the loose form also ignores accents and apostrophes (Vosk does not reproduce them)', () => {
    expect(loosePhrase('LIA, caquiiñeʼ gacanécabe naa.', { stripWakeWord: true })).toBe('caquiine gacanecabe naa');
  });
});
