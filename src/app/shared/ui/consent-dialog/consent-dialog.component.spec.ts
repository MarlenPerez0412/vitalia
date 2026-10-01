import { TestBed } from '@angular/core/testing';
import { ConsentDialogComponent } from './consent-dialog.component';

describe('ConsentDialogComponent', () => {
  async function render(open: boolean) {
    await TestBed.configureTestingModule({ imports: [ConsentDialogComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ConsentDialogComponent);
    fixture.componentRef.setInput('heading', '¿Permites que VITALIA use tu micrófono?');
    fixture.componentRef.setInput('description', 'Descripción');
    fixture.componentRef.setInput('open', open);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  it('renders nothing while closed', async () => {
    const fixture = await render(false);
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]')).toBeNull();
  });

  it('is an accessible modal that focuses its first action', async () => {
    const fixture = await render(true);
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toContain('micrófono');
    expect(document.activeElement?.textContent).toContain('Permitir');
  });

  it('traps focus and closes with Escape', async () => {
    const fixture = await render(true);
    let dismissed = 0;
    fixture.componentInstance.dismissed.subscribe(() => dismissed += 1);
    const dialog = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[role="dialog"]')!;
    const buttons = dialog.querySelectorAll<HTMLButtonElement>('button');
    buttons[buttons.length - 1].focus();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(buttons[0]);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(dismissed).toBe(1);
  });
});
