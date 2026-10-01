import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LanguageContextService } from '../../../../core/i18n/language-context.service';
import { AccessibilityPageComponent } from './accessibility-page.component';

describe('AccessibilityPageComponent: Idioma de VITALIA', () => {
  async function render() {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [AccessibilityPageComponent], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(AccessibilityPageComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const button = (label: string) => [...element.querySelectorAll('button')].find((item) => item.textContent?.trim().startsWith(label))!;
    return { fixture, element, button, language: TestBed.inject(LanguageContextService) };
  }

  it('offers Spanish (default), Nahuatl (pilot) and Zapotec (pilot)', async () => {
    const { button, element } = await render();
    expect(button('Español (México)').getAttribute('aria-pressed')).toBe('true');
    expect(button('Náhuatl (piloto)').getAttribute('aria-pressed')).toBe('false');
    expect(button('Zapoteco (piloto)').getAttribute('aria-pressed')).toBe('false');
    expect(element.textContent).not.toContain('Reconocimiento de voz experimental');
  });

  it.each([['Náhuatl (piloto)', 'nahuatl-pilot'], ['Zapoteco (piloto)', 'zapoteco-pilot']] as const)(
    'choosing %s saves liaLanguage and explains the pilot limits', async (label, code) => {
      const { fixture, element, button, language } = await render();
      button(label).click();
      fixture.detectChanges();
      expect(language.liaLanguage()).toBe(code);
      expect(JSON.parse(localStorage.getItem('vitalia.lia-language')!)).toMatchObject({ liaLanguage: code });
      expect(button(label).getAttribute('aria-pressed')).toBe('true');
      expect(element.textContent).toContain('Aún no las han validado hablantes nativos');
      expect(element.textContent).toContain('Reconocimiento de voz experimental');
      expect(element.textContent).toContain('no las lee con la voz española');
    });

  it('Spanish fallback speech is off until the person allows it', async () => {
    const { fixture, element, button, language } = await render();
    button('Zapoteco (piloto)').click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Sin voz en español');
    button('Leer en español').click();
    fixture.detectChanges();
    expect(language.allowSpanishFallback()).toBe(true);
    expect(element.textContent).toContain('Respaldo en español permitido');
  });
});
