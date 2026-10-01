import { relativeTime } from './notification-time';

describe('relativeTime', () => {
  const now = new Date(2026, 9, 1, 15, 0).getTime();
  const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

  it('formats recent times without ISO dates', () => {
    expect(relativeTime(ago(0), now)).toBe('Ahora');
    expect(relativeTime(ago(5), now)).toBe('Hace 5 min');
    expect(relativeTime(ago(60), now)).toBe('Hace 1 h');
    expect(relativeTime(ago(60 * 24), now)).toBe('Ayer');
    expect(relativeTime(ago(60 * 24 * 3), now)).toBe('Hace 3 días');
  });
});
