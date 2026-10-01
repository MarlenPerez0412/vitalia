import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

/**
 * Utilidades de llamada. Nunca inicia una llamada por si mismo: solo genera el enlace `tel:` que la persona
 * pulsa (el sistema abre el marcador y pide confirmar). En escritorio la UI muestra el numero y "Copiar numero".
 */
@Injectable({ providedIn: 'root' })
export class PhoneService {
  private readonly document = inject(DOCUMENT);

  /** `+52 55 0000 0000` -> `tel:+525500000000`. Sin prefijo se asume Mexico (+52). */
  telHref(phone: string): string {
    const digits = phone.replace(/[^\d+]/g, '');
    return `tel:${digits.startsWith('+') ? digits : `+52${digits}`}`;
  }

  /** Heuristica: telefono movil con pantalla tactil. En otros equipos el enlace puede no hacer nada. */
  canDial(): boolean {
    const view = this.document.defaultView;
    const coarse = view?.matchMedia?.('(pointer: coarse)').matches ?? false;
    return coarse && /Android|iPhone|iPod|Mobile/i.test(view?.navigator.userAgent ?? '');
  }

  async copy(phone: string): Promise<boolean> {
    try {
      await this.document.defaultView?.navigator.clipboard.writeText(phone);
      return true;
    } catch {
      return this.copyWithSelection(phone);
    }
  }

  private copyWithSelection(text: string): boolean {
    const field = this.document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    this.document.body.appendChild(field);
    field.select();
    try { return this.document.execCommand('copy'); } catch { return false; } finally { field.remove(); }
  }
}
