import { AfterViewInit, ChangeDetectionStrategy, Component, effect, ElementRef, input, OnDestroy, viewChild } from '@angular/core';
import * as L from 'leaflet';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-map',
  template: `<div #mapContainer class="map" role="application" [attr.aria-label]="'Mapa: ' + label()"></div>`,
  styleUrl: './map.component.scss',
})
export class MapComponent implements AfterViewInit, OnDestroy {
  readonly latitude = input.required<number>();
  readonly longitude = input.required<number>();
  readonly label = input('Ubicación de demostración');
  readonly zoom = input(15);
  /** Radio de precision en metros; si existe se dibuja un circulo alrededor del marcador. */
  readonly accuracy = input<number | null>(null);
  private readonly mapContainer = viewChild.required<ElementRef<HTMLElement>>('mapContainer');
  private map?: L.Map;
  private marker?: L.CircleMarker;
  private accuracyCircle?: L.Circle;
  private resizeObserver?: ResizeObserver;

  constructor() {
    effect(() => {
      const coordinates = L.latLng(this.latitude(), this.longitude());
      const label = this.label();
      const zoom = this.zoom();
      const accuracy = this.accuracy();
      if (!this.map || !this.marker) return;
      this.marker.setLatLng(coordinates);
      this.marker.bindPopup(label);
      this.drawAccuracy(coordinates, accuracy);
      this.map.setView(coordinates, zoom);
      this.map.invalidateSize();
    });
  }

  ngAfterViewInit(): void {
    const coordinates = L.latLng(this.latitude(), this.longitude());
    this.map = L.map(this.mapContainer().nativeElement, { scrollWheelZoom: false, zoomControl: true }).setView(coordinates, this.zoom());
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);
    this.marker = L.circleMarker(coordinates, {
      radius: 11,
      color: '#ffffff',
      weight: 4,
      fillColor: '#147d64',
      fillOpacity: 1,
    }).addTo(this.map).bindPopup(this.label());
    this.drawAccuracy(coordinates, this.accuracy());
    if (typeof ResizeObserver === 'function') {
      this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
      this.resizeObserver.observe(this.mapContainer().nativeElement);
    }
    globalThis.setTimeout(() => this.map?.invalidateSize(), 0);
  }

  private drawAccuracy(coordinates: L.LatLng, accuracy: number | null): void {
    this.accuracyCircle?.remove();
    this.accuracyCircle = undefined;
    if (!this.map || !accuracy || accuracy <= 0) return;
    this.accuracyCircle = L.circle(coordinates, { radius: accuracy, color: '#087f8c', weight: 1, fillColor: '#087f8c', fillOpacity: .12, interactive: false }).addTo(this.map);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }
}
