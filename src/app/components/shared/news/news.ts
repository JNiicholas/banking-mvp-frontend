import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

// OpenAPI-generated client for news
import {
  NewsApiService,
  GetTickerNewsApiNewsTickerGetRequestParams,
} from '../../../api/api/news.service';

// Generated model type
import { NewsItem } from '../../../api';


@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './news.html',
  styleUrl: './news.scss',
})
export class News implements OnInit, OnChanges, OnDestroy {
  private api = inject(NewsApiService);

  // -------- Inputs --------
  /** Optional ticker to filter news by (e.g., "AAPL") */
  @Input() ticker: string | null = null;

  /** ISO 8601 string: e.g., "2025-09-01" or "2025-09-01T00:00:00Z" */
  @Input() publishedUtcGte: string | null = null;

  /** ISO 8601 string: e.g., "2025-09-22" */
  @Input() publishedUtcLte: string | null = null;

  /** "asc" or "desc" by published_utc; defaults to "desc" (latest first) */
  @Input() order: 'asc' | 'desc' | null = 'desc';

  /** Sort field, defaults to "published_utc" */
  @Input() sort: string | null = 'published_utc';

  /** Page size per Polygon page (server may further limit); we also pass as maxItems to cap total */
  @Input() limit: number | null = 20;

  /** Optional hard cap client-side (if not set, we’ll use `limit`) */
  @Input() maxItems: number | null = null;

  // -------- State (signals) --------
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  items = signal<NewsItem[]>([]);

  ngOnInit(): void {
    // Initial load on mount
    this.loadNews();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Reload when any input changes (ticker, date bounds, sort, limits)
    if (
      'ticker' in changes ||
      'publishedUtcGte' in changes ||
      'publishedUtcLte' in changes ||
      'order' in changes ||
      'sort' in changes ||
      'limit' in changes ||
      'maxItems' in changes
    ) {
      this.loadNews();
    }
  }

  ngOnDestroy(): void {
    // No subscriptions held; HTTP calls are single-shot via subscribe()
  }

  /** Public method so parent can refresh on demand */
  refresh(): void {
    this.loadNews();
  }

  private loadNews(): void {
    this.loading.set(true);
    this.error.set(null);

    // Build request params; default maxItems to limit if not explicitly provided
    const params: GetTickerNewsApiNewsTickerGetRequestParams = {
      ticker: this.ticker ?? undefined,
      publishedUtcGte: this.publishedUtcGte ?? undefined,
      publishedUtcLte: this.publishedUtcLte ?? undefined,
      order: this.order ?? undefined,
      sort: this.sort ?? undefined,
      limit: this.limit ?? undefined,
      // server/service enforces a total cap when maxItems is provided
      maxItems: (this.maxItems ?? this.limit) ?? undefined,
      // Note: `source` exists in client type but isn’t supported by the current Polygon SDK method signature.
    };

    this.api.getTickerNewsApiNewsTickerGet(params).subscribe({
      next: (rows: NewsItem[]) => {
        // Defensive: ensure array
        const list = Array.isArray(rows) ? rows : [];
        this.items.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[News] failed to load news', err);
        this.error.set('Failed to load news.');
        this.items.set([]);
        this.loading.set(false);
      },
    });
  }
}
