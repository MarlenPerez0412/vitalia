import { TestBed } from '@angular/core/testing';
import { LanguageContextService } from './language-context.service';
import { LanguageDetection } from './language-detector';

describe('LanguageContextService', () => {
  const create = () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return TestBed.inject(LanguageContextService);
  };

  beforeEach(() => localStorage.clear());

  it('starts in Spanish by default', () => {
    const language = create();
    expect(language.liaLanguage()).toBe('es');
    expect(language.interactionVariant()).toBe('es');
    expect(language.preferredLanguage()).toBe('es');
    expect(language.allowSpanishFallback()).toBe(false);
    expect(language.lastDetectedLanguage()).toBeNull();
    expect(language.confidence()).toBeNull();
  });

  it.each(['nahuatl-pilot', 'zapoteco-pilot', 'es'] as const)('persists liaLanguage = %s and the next session starts in it', (code) => {
    create().setLiaLanguage(code);
    expect(JSON.parse(localStorage.getItem('vitalia.lia-language')!)).toMatchObject({ liaLanguage: code });
    const language = create();
    expect(language.liaLanguage()).toBe(code);
    expect(language.interactionVariant()).toBe(code);
  });

  it('an explicit switch changes the conversation, not the saved preference', () => {
    const language = create();
    language.setLiaLanguage('nahuatl-pilot');
    language.switchInteraction('es');
    expect(language.interactionVariant()).toBe('es');
    expect(language.liaLanguage()).toBe('nahuatl-pilot');
    language.resetInteraction();
    expect(language.interactionVariant()).toBe('nahuatl-pilot');
  });

  it('ignores invalid or corrupted stored values', () => {
    localStorage.setItem('vitalia.lia-language', JSON.stringify({ liaLanguage: 'klingon' }));
    expect(create().liaLanguage()).toBe('es');
    localStorage.setItem('vitalia.lia-language', '{no-json');
    expect(create().liaLanguage()).toBe('es');
    const language = create();
    language.setLiaLanguage('zaa' as never);
    expect(language.liaLanguage()).toBe('es');
  });

  it('remembers whether Spanish fallback speech is allowed', () => {
    create().setAllowSpanishFallback(true);
    expect(create().allowSpanishFallback()).toBe(true);
  });
});

describe('LanguageContextService.resolveTextInput', () => {
  const create = () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return TestBed.inject(LanguageContextService);
  };
  const detection = (variant: LanguageDetection['variant'], confidence: number): LanguageDetection =>
    ({ language: variant === 'es' ? 'es' : variant === 'nahuatl-pilot' ? 'nahuatl' : variant ? 'zapoteco' : null, variant, confidence, reason: 'prueba' });

  it('keeps the conversation language when confidence is low', () => {
    const language = create();
    language.setLiaLanguage('zapoteco-pilot');
    expect(language.resolveTextInput(detection('es', 0.6))).toEqual({ variant: 'zapoteco-pilot', switched: false });
    expect(language.resolveTextInput(detection(null, 0))).toEqual({ variant: 'zapoteco-pilot', switched: false });
  });

  it('a predefined pilot phrase typed in a Spanish conversation answers (and continues) in that pilot', () => {
    const language = create();
    expect(language.resolveTextInput(detection('nahuatl-pilot', 1))).toEqual({ variant: 'nahuatl-pilot', switched: true });
    expect(language.interactionVariant()).toBe('nahuatl-pilot');
    expect(language.liaLanguage()).toBe('es');
    expect(language.lastDetectedLanguage()).toBe('nahuatl-pilot');
    expect(language.confidence()).toBe(1);
  });

  it('clear Spanish in a pilot conversation answers in Spanish', () => {
    const language = create();
    language.setLiaLanguage('zapoteco-pilot');
    expect(language.resolveTextInput(detection('es', 0.95))).toEqual({ variant: 'es', switched: true });
  });
});
