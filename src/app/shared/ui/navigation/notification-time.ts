/** Tiempo relativo legible para la UI (nunca fechas ISO): Ahora, Hace 5 min, Hace 1 h, Ayer, Hace 3 días. */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const created = new Date(iso);
  const minutes = Math.floor((now - created.getTime()) / 60_000);
  if (Number.isNaN(minutes) || minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (created.getTime() >= startOfToday || hours < 6) return `Hace ${hours} h`;
  const days = Math.round((startOfToday - new Date(created.getFullYear(), created.getMonth(), created.getDate()).getTime()) / 86_400_000);
  if (days <= 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return created.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}
