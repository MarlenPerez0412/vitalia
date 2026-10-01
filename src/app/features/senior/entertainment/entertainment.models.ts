import { VitaliaIconName } from '../../../shared/ui/icon/vitalia-icon.component';

export interface Movie { id: string; title: string; year: number; genre: string; synopsis: string; details: string; rating?: string; poster?: string; }
export interface CultureEvent { id: string; name: string; type: string; date: string; time: string; venue: string; city: string; description: string; url?: string; image?: string; }
export interface NewsItem { id: string; title: string; summary: string; details: string; source: string; date: string; category: string; url?: string; image?: string; }
export interface MusicTrack { id: string; title: string; artist: string; category: string; url: string; thumbnail?: string; }
export interface Craft { id: string; name: string; icon: VitaliaIconName; difficulty: string; duration: string; description: string; materials: string[]; steps: string[]; image?: string; }
export interface Activity { id: string; name: string; category: string; description: string; duration: string; location: string; mobility: string; image?: string; }

/** `fallback` es true cuando la API fallo y se muestran datos locales (la pantalla avisa con un mensaje amable). */
export interface ContentResult<T> { items: T[]; fallback: boolean; }

export const FALLBACK_MESSAGE = 'No fue posible actualizar el contenido. Te mostramos opciones disponibles.';
