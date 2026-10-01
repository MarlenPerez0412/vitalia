import { signal } from '@angular/core';
import { ContentResult } from './entertainment.models';

/** Carga una lista al crear la pantalla y expone `loading` y `result` como signals. */
export function loadContent<T>(loader: () => Promise<ContentResult<T>>) {
  const loading = signal(true);
  const result = signal<ContentResult<T>>({ items: [], fallback: false });
  void loader().then((value) => { result.set(value); loading.set(false); });
  return { loading, result };
}

/** «2026-11-07» -> «7 de noviembre de 2026». Acepta tambien fechas ISO completas. */
export function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day));
}

/** Abre un enlace externo en otra pestana sin exponer `window.opener`. */
export function openExternal(url: string): void {
  globalThis.open(url, '_blank', 'noopener,noreferrer');
}
