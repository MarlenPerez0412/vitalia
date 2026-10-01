import { Type } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SENIOR_CATALOGS } from '../../../core/services/senior-mock-data';
import { SENIOR_ROUTES } from '../senior.routes';
import { FALLBACK_MESSAGE } from './entertainment.models';
import { EntertainmentService, MovieService } from './entertainment.service';
import { ActivitiesPageComponent } from './pages/activities-page.component';
import { CraftsPageComponent } from './pages/crafts-page.component';
import { MoviesPageComponent } from './pages/movies-page.component';
import { MusicPageComponent } from './pages/music-page.component';
import { NewsPageComponent } from './pages/news-page.component';
import { TheaterPageComponent } from './pages/theater-page.component';

const SECTIONS: { path: string; api?: string; component: Type<unknown> }[] = [
  { path: 'movies', api: 'movies', component: MoviesPageComponent },
  { path: 'theater', api: 'events', component: TheaterPageComponent },
  { path: 'news', api: 'news', component: NewsPageComponent },
  { path: 'music', api: 'music', component: MusicPageComponent },
  { path: 'crafts', component: CraftsPageComponent },
  { path: 'activities', component: ActivitiesPageComponent },
];

function setup() {
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  return TestBed.inject(HttpTestingController);
}

describe('Entretenimiento: rutas', () => {
  const items = SENIOR_CATALOGS['entertainment'].items;

  it('cada tarjeta navega a su pantalla', () => {
    expect(items.map((item) => item.route)).toEqual(SECTIONS.map((section) => `/senior/entertainment/${section.path}`));
  });

  it('todas las rutas de las tarjetas estan declaradas (sin rutas rotas)', () => {
    const declared = (SENIOR_ROUTES[0].children ?? []).map((route) => `/senior/${route.path}`);
    for (const item of items) expect(declared).toContain(item.route);
  });
});

describe('Entretenimiento: pantallas', () => {
  for (const section of SECTIONS) {
    describe(section.path, () => {
      async function render(failApi: boolean) {
        const http = setup();
        const fixture = TestBed.createComponent(section.component);
        fixture.autoDetectChanges();
        if (section.api) {
          const request = http.expectOne((req) => req.url.endsWith(`/api/entertainment/${section.api}`));
          if (failApi) request.error(new ProgressEvent('error'));
          else request.flush({ source: 'unconfigured', items: [] });
        }
        await fixture.whenStable();
        await vi.waitFor(() => expect(fixture.nativeElement.querySelector('.loading')).toBeNull());
        return fixture.nativeElement as HTMLElement;
      }

      it('muestra entre 4 y 8 elementos con contenido local sin API', async () => {
        const root = await render(false);
        const cards = root.querySelectorAll('app-entertainment-card');
        expect(cards.length).toBeGreaterThanOrEqual(4);
        expect(cards.length).toBeLessThanOrEqual(8);
        expect(root.querySelector('.senior-page__notice')).toBeNull();
      });

      it('si la API falla muestra el mock y un aviso amable', async () => {
        if (!section.api) return;
        const root = await render(true);
        expect(root.querySelectorAll('app-entertainment-card').length).toBeGreaterThanOrEqual(4);
        expect(root.querySelector('.senior-page__notice')?.textContent).toContain(FALLBACK_MESSAGE);
      });

      it('«Volver» navega a /senior/entertainment sin usar el historial', async () => {
        const root = await render(false);
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
        const back = root.querySelector<HTMLButtonElement>('app-senior-page > section > app-button button, .senior-page > app-button button')!;
        expect(back.textContent).toContain('Volver');
        back.click();
        expect(navigate).toHaveBeenCalledWith('/senior/entertainment');
      });
    });
  }

  it('el boton de cada tarjeta despliega y oculta los detalles', async () => {
    const http = setup();
    const fixture = TestBed.createComponent(CraftsPageComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    http.verify();
    const root = fixture.nativeElement as HTMLElement;
    await vi.waitFor(() => expect(root.querySelector('app-entertainment-card button')).toBeTruthy());
    const button = root.querySelector<HTMLButtonElement>('app-entertainment-card button')!;
    expect(root.querySelector('.card__detail')).toBeNull();
    button.click();
    await fixture.whenStable();
    expect(root.querySelector('.card__detail')?.textContent).toContain('Paso a paso');
    button.click();
    await fixture.whenStable();
    expect(root.querySelector('.card__detail')).toBeNull();
  });
});

describe('EntertainmentService', () => {
  it('usa contenido real cuando la API responde con source live', async () => {
    const http = setup();
    const result = TestBed.inject(EntertainmentService).load('movies', [{ id: 'mock' }]);
    http.expectOne((req) => req.url.endsWith('/api/entertainment/movies')).flush({ source: 'live', items: [{ id: 'real' }] });
    expect(await result).toEqual({ items: [{ id: 'real' }], fallback: false });
  });

  it('usa el mock sin aviso cuando la API no esta configurada', async () => {
    const http = setup();
    const result = TestBed.inject(MovieService).getMovies();
    http.expectOne((req) => req.url.endsWith('/api/entertainment/movies')).flush({ source: 'unconfigured', items: [] });
    const { items, fallback } = await result;
    expect(fallback).toBe(false);
    expect(items.length).toBeGreaterThanOrEqual(4);
  });

  it('usa el mock con aviso cuando la API falla', async () => {
    const http = setup();
    const result = TestBed.inject(MovieService).getMovies();
    http.expectOne((req) => req.url.endsWith('/api/entertainment/movies')).flush('error', { status: 500, statusText: 'Server Error' });
    const { items, fallback } = await result;
    expect(fallback).toBe(true);
    expect(items.length).toBeGreaterThanOrEqual(4);
  });
});
