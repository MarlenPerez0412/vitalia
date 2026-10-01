import { TestBed } from '@angular/core/testing';
import { AppButtonComponent } from './app-button.component';

describe('AppButtonComponent', () => {
  it('applies the requested visual variant', async () => {
    await TestBed.configureTestingModule({ imports: [AppButtonComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AppButtonComponent);
    fixture.componentRef.setInput('variant', 'emergency');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('button')?.classList).toContain('button--emergency');
  });

  it('is disabled and announces loading state while processing', async () => {
    await TestBed.configureTestingModule({ imports: [AppButtonComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AppButtonComponent);
    fixture.componentRef.setInput('loading', true);
    fixture.componentRef.setInput('loadingLabel', 'Guardando');
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button');

    expect(button?.disabled).toBe(true);
    expect(button?.getAttribute('aria-busy')).toBe('true');
    expect(button?.textContent).toContain('Guardando');
  });

  it('emits its action when activated', async () => {
    await TestBed.configureTestingModule({ imports: [AppButtonComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AppButtonComponent);
    let activations = 0;
    fixture.componentInstance.pressed.subscribe(() => activations += 1);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector('button')?.click();
    expect(activations).toBe(1);
  });
});
