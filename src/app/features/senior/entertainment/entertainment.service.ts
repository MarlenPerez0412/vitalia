import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import activitiesMock from '../../../core/mock/entertainment/activities.json';
import craftsMock from '../../../core/mock/entertainment/crafts.json';
import eventsMock from '../../../core/mock/entertainment/events.json';
import moviesMock from '../../../core/mock/entertainment/movies.json';
import musicMock from '../../../core/mock/entertainment/music.json';
import newsMock from '../../../core/mock/entertainment/news.json';
import { Activity, ContentResult, Craft, CultureEvent, Movie, MusicTrack, NewsItem } from './entertainment.models';

/** Backend FastAPI. Las claves de TMDB, Ticketmaster, NewsAPI y YouTube viven solo en `backend/.env`. */
export const ENTERTAINMENT_API_BASE_URL = new InjectionToken<string>('ENTERTAINMENT_API_BASE_URL', { providedIn: 'root', factory: () => 'http://localhost:8000' });

const REQUEST_TIMEOUT_MS = 4000;

interface ApiResponse<T> { source: 'live' | 'unconfigured'; items: T[]; }

/**
 * Flujo comun: API disponible -> contenido real; API sin configurar -> mock sin avisos;
 * API con error -> mock con `fallback: true`. Nunca lanza ni deja la lista vacia.
 */
@Injectable({ providedIn: 'root' })
export class EntertainmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(ENTERTAINMENT_API_BASE_URL);

  async load<T>(path: string, mock: readonly T[]): Promise<ContentResult<T>> {
    try {
      const response = await firstValueFrom(this.http.get<ApiResponse<T>>(`${this.baseUrl}/api/entertainment/${path}`).pipe(timeout(REQUEST_TIMEOUT_MS)));
      if (response?.source === 'live' && Array.isArray(response.items) && response.items.length) return { items: response.items, fallback: false };
      return { items: [...mock], fallback: false };
    } catch {
      return { items: [...mock], fallback: true };
    }
  }
}

@Injectable({ providedIn: 'root' })
export class MovieService {
  private readonly content = inject(EntertainmentService);
  getMovies(): Promise<ContentResult<Movie>> { return this.content.load('movies', moviesMock as Movie[]); }
}

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly content = inject(EntertainmentService);
  getEvents(): Promise<ContentResult<CultureEvent>> { return this.content.load('events', eventsMock as CultureEvent[]); }
}

@Injectable({ providedIn: 'root' })
export class NewsService {
  private readonly content = inject(EntertainmentService);
  getNews(): Promise<ContentResult<NewsItem>> { return this.content.load('news', newsMock as NewsItem[]); }
}

@Injectable({ providedIn: 'root' })
export class MusicService {
  private readonly content = inject(EntertainmentService);
  getTracks(): Promise<ContentResult<MusicTrack>> { return this.content.load('music', musicMock as MusicTrack[]); }
}

/** Manualidades y actividades funcionan solo con el catalogo local (sin API externa). */
@Injectable({ providedIn: 'root' })
export class CraftsService {
  getCrafts(): Promise<ContentResult<Craft>> { return Promise.resolve({ items: craftsMock as Craft[], fallback: false }); }
}

@Injectable({ providedIn: 'root' })
export class ActivitiesService {
  getActivities(): Promise<ContentResult<Activity>> { return Promise.resolve({ items: activitiesMock as Activity[], fallback: false }); }
}
