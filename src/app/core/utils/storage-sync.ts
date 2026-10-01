/** Utilidades de localStorage para estado mock compartido entre pestañas. Nunca lanzan si el almacenamiento no esta disponible. */

export function readStored<T>(key: string, isValid: (value: unknown) => value is T): T | null {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* almacenamiento no disponible */ }
}

export function removeStored(key: string): void {
  try { localStorage.removeItem(key); } catch { /* almacenamiento no disponible */ }
}

/**
 * Avisa cuando OTRA pestana cambia (o borra) la clave. El evento `storage` no se dispara en la pestana que escribe,
 * por eso cada servicio actualiza su propio estado al escribir y usa esto solo para reflejar a las demas.
 */
export function watchStorage(key: string, onChange: () => void): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('storage', (event) => {
    if (event.key === key || event.key === null) onChange();
  });
}
