import esMX from './catalogs/es-MX.json';
import { LIA_LANGUAGE_CODES, MULTILINGUAL_INTENTS } from './language.models';
import { LIA_MULTILINGUAL_INTENTS } from './lia-multilingual-intents';

const slots = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
const ALLOWED_SLOTS = new Set(['medication', 'dose', 'time', 'contactName', 'firstName']);
const ENTRY_FIELDS = ['aliases', 'canonicalInput', 'confirmationTemplate', 'responseTemplate', 'voskVariants'];

describe('LIA Spanish catalog', () => {
  const spanish: Record<string, string> = esMX.messages;

  it('messages are non-empty and never spoken with the wake word "LIA" (except visible examples)', () => {
    for (const [key, text] of Object.entries(spanish)) {
      expect(text.trim(), key).not.toBe('');
      if (!key.endsWith('.feedback')) expect(text, key).not.toMatch(/\bLIA\b/);
    }
  });
});

describe('LIA multilingual intent catalog', () => {
  it('has the same three intents in Spanish, Nahuatl pilot and Zapotec pilot', () => {
    expect(Object.keys(LIA_MULTILINGUAL_INTENTS).sort()).toEqual([...LIA_LANGUAGE_CODES].sort());
    for (const code of LIA_LANGUAGE_CODES) {
      expect(Object.keys(LIA_MULTILINGUAL_INTENTS[code].intents).sort(), code).toEqual([...MULTILINGUAL_INTENTS].sort());
    }
  });

  it('marks Nahuatl and Zapotec as pilots without native validation', () => {
    expect(LIA_MULTILINGUAL_INTENTS.es).toMatchObject({ variantStatus: 'stable', nativeValidation: true });
    for (const code of ['nahuatl-pilot', 'zapoteco-pilot'] as const) {
      expect(LIA_MULTILINGUAL_INTENTS[code], code).toMatchObject({ language: code, variantStatus: 'pilot', nativeValidation: false });
    }
  });

  it('keeps the predefined MVP phrases exactly as provided', () => {
    expect(LIA_MULTILINGUAL_INTENTS['nahuatl-pilot'].intents.CALL_DAUGHTER.canonicalInput).toBe('LIA, xijnotza noichpoca.');
    expect(LIA_MULTILINGUAL_INTENTS['nahuatl-pilot'].intents.HELP.responseTemplate).toMatch(/^Nimitzcaqui\. Na niitztoc mohuaya\./);
    // Saltillo como MODIFIER LETTER APOSTROPHE (U+02BC), tal como se entregó.
    expect(LIA_MULTILINGUAL_INTENTS['zapoteco-pilot'].intents.HELP.canonicalInput).toBe('LIA, caquiiñeʼ gacanécabe naa.');
    expect(LIA_MULTILINGUAL_INTENTS['zapoteco-pilot'].intents.NEXT_MEDICATION.canonicalInput).toBe('LIA, xi medicina naquiiñeʼ guicaaʼ yaʼ.');
  });

  it('templates only use the real-data placeholders and pilots ask for the same data as Spanish', () => {
    for (const intent of MULTILINGUAL_INTENTS) {
      const spanishSlots = slots(LIA_MULTILINGUAL_INTENTS.es.intents[intent].responseTemplate);
      for (const code of LIA_LANGUAGE_CODES) {
        const entry = LIA_MULTILINGUAL_INTENTS[code].intents[intent];
        for (const slot of slots(entry.responseTemplate)) expect(ALLOWED_SLOTS.has(slot), `${code} ${intent} {${slot}}`).toBe(true);
        expect(slots(entry.responseTemplate), `${code} ${intent}`).toEqual(spanishSlots);
      }
    }
  });

  it('no response hardcodes demo data (medication, dose, time or contact name)', () => {
    for (const code of LIA_LANGUAGE_CODES) {
      for (const intent of MULTILINGUAL_INTENTS) {
        const { responseTemplate, confirmationTemplate } = LIA_MULTILINGUAL_INTENTS[code].intents[intent];
        for (const text of [responseTemplate, confirmationTemplate ?? '']) {
          expect(text, `${code} ${intent}`).not.toMatch(/Losart[aá]n|Metformina|\b50 mg\b|10:00|Ana Hern[aá]ndez/);
        }
      }
    }
  });

  it('no language duplicates domain logic: entries hold only phrases (no functions or actions)', () => {
    for (const code of LIA_LANGUAGE_CODES) {
      for (const intent of MULTILINGUAL_INTENTS) {
        const entry = LIA_MULTILINGUAL_INTENTS[code].intents[intent] as unknown as Record<string, unknown>;
        expect(Object.keys(entry).sort(), `${code} ${intent}`).toEqual(ENTRY_FIELDS);
        for (const value of Object.values(entry)) {
          const ok = value === null || typeof value === 'string' || (Array.isArray(value) && value.every((item) => typeof item === 'string'));
          expect(ok, `${code} ${intent}`).toBe(true);
        }
      }
    }
  });
});
