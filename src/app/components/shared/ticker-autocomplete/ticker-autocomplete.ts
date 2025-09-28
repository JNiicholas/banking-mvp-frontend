
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';

// Generated service from your OpenAPI client (you said this exists)
import { TickersApiService, SearchTickersEndpointApiTickersSearchGetRequestParams } from '../../../api/api/tickers.service';

// If your client export name differs, adjust the import and the method name below.
// Typical method name for GET /api/tickers/search is something like:
//   searchTickersApiTickersSearchGet({ q, limit })

export interface TickerOption {
  ticker: string;
  name?: string;
  primary_exchange?: string;
  market?: string;
  locale?: string;
  type?: string;    
  currency_name?: string;
}

@Component({
   selector: 'app-ticker-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule, AutoCompleteModule],
  templateUrl: './ticker-autocomplete.html',
  styleUrl: './ticker-autocomplete.scss',
})
export class TickerAutocomplete {
  private api = inject(TickersApiService);

  /** Placeholder text */
  @Input() placeholder = 'Search ticker or company…';
  /** Minimum chars before search */
  @Input() minLength = 1;
  /** Backend result limit */
  @Input() limit = 10;
  /** Bind an explicit input id if you want */
  @Input() inputId?: string;
  /** Disable control */
  @Input() disabled = false;

  /** Emits the picked TickerOption */
  @Output() picked = new EventEmitter<TickerOption>();
  /** Emits the raw query string every time we search (optional) */
  @Output() queryChange = new EventEmitter<string>();
  /** Emits when the clear button is clicked */
  @Output() cleared = new EventEmitter<void>();

  @Output() enter = new EventEmitter<string>();

  onEnterKey(ev: Event) {
    const input = ev.target as HTMLInputElement | null;
    const raw = input?.value?.trim() ?? '';

    // Prefer selected ticker if user picked from the list; otherwise emit raw text
    const picked = this.selected();
    const value =
      (picked && typeof picked === 'object' && 'ticker' in picked)
        ? picked.ticker
        : (typeof picked === 'string' ? picked : raw);

    if (value) this.enter.emit(value);
  }

  // Using signals to keep it simple & reactive
  selected = signal<TickerOption | string | null>(null);
  suggestions = signal<TickerOption[]>([]);

  filter(e: { query: string }) {
    const q = (e?.query ?? '').trim();
    this.queryChange.emit(q);

    if (!q || q.length < this.minLength) {
      this.suggestions.set([]);
      return;
    }

    const params: SearchTickersEndpointApiTickersSearchGetRequestParams = {
      q,
      limit: this.limit,
    };

    this.api
      .searchTickersEndpointApiTickersSearchGet(params)
      .subscribe({
        next: (rows: any) => {
          const list = Array.isArray(rows) ? rows : [];
          this.suggestions.set(list);
        },
        error: () => this.suggestions.set([]),
      });
  }

  handleClear() {
    this.selected.set(null);
    this.suggestions.set([]);
    this.cleared.emit();
  }

  emitSelect(e: any) {
    // PrimeNG passes the picked item as `e` or `e.originalEvent/item` depending on version.
    const item: TickerOption = e?.value ?? e?.item ?? e;
    if (item && item.ticker) this.picked.emit(item);
  }
}