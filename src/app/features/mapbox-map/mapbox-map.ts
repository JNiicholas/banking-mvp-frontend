import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  Input
} from '@angular/core';
import { Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { MAPBOX_TOKEN } from '../../providers/mapbox-token';


@Component({
  selector: 'app-mapbox-map',
  templateUrl: './mapbox-map.html',
  styleUrl: './mapbox-map.scss',
  standalone: true // keep as a standalone component
})
export class MapboxMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  /** Optional inputs mimicking your Vue defaults */
  @Input() lat = 55.6761;         // Copenhagen default
  @Input() lng = 12.5683;
  @Input() zoom = 12;
  @Input() styleUrl = 'mapbox://styles/mapbox/dark-v11';

  constructor(@Inject(MAPBOX_TOKEN) private token: string) { }

  private platformId = inject(PLATFORM_ID);
  private map: import('mapbox-gl').Map | null = null;
  private resizeObserver?: ResizeObserver;

  async ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) {
      // SSR: do nothing
      return;
    }

    const token = this.token;
    if (!token) {
      console.warn('[mapbox] Missing MAPBOX access token. Provide MAPBOX_TOKEN in app.config.ts.');
      return;
    }

    const mapboxgl = await import('mapbox-gl');

    this.map = new mapboxgl.Map({
      accessToken: token,          // ✅ no type error
      container: this.mapContainer.nativeElement,
      style: this.styleUrl,
      center: [this.lng, this.lat],
      zoom: this.zoom,
      attributionControl: true
    });

    // Controls similar to a typical Nuxt implementation
    this.map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');
    this.map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    this.map.addControl(new mapboxgl.ScaleControl(), 'bottom-right');

    // Geolocate control (optional; remove if you don't want browser prompt)
    this.map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'top-right'
    );

    // Example: add a starter marker at provided coords
    this.map.on('load', () => {
      new mapboxgl.Marker({ color: '#4cafef' })
        .setLngLat([this.lng, this.lat])
        .addTo(this.map!);
    });

    // Keep map sized with container
    this.resizeObserver = new ResizeObserver(() => this.map?.resize());
    this.resizeObserver.observe(this.mapContainer.nativeElement);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.map?.remove();
    this.map = null;
  }
}