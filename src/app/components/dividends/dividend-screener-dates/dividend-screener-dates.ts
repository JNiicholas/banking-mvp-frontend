import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { FloatLabelModule } from 'primeng/floatlabel';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { MultiSelectModule } from 'primeng/multiselect';
import { AccordionModule } from 'primeng/accordion';
// Generated API types/services
import { DividendSearchRequest, DividendSearchRequestDividendTypeEnum } from '../../../api';

import { DividendSearchApiService, SearchDividendsApiDividendsSearchPostRequestParams,  } from '../../../api/api/dividend-search.service';

import { TickerAutocomplete } from '../../shared/ticker-autocomplete/ticker-autocomplete';
import type { TickerOption } from '../../shared/ticker-autocomplete/ticker-autocomplete';

@Component({
  selector: 'app-dividend-screener-dates',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    FloatLabelModule,
    DatePickerModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    SelectModule,
    InputNumberModule,
    MultiSelectModule,
    AccordionModule,
    TickerAutocomplete,
  ],
  templateUrl: './dividend-screener-dates.html',
  styleUrls: ['./dividend-screener-dates.scss']
})
export class DividendScreenerDates {
  private api = inject(DividendSearchApiService);

  // UI state
  loading = signal(false);
  error = signal<string | null>(null);
  searchString: string = '';

  // Filters
  ticker: string = '';
  // PrimeNG range mode expects an array of 2 dates or null
  exRange: Date[] | null = null;

  // Optional additional date ranges (wired in later template updates)
  recordRange: Date[] | null = null;
  declarationRange: Date[] | null = null;
  payRange: Date[] | null = null;

  // Cash amount filters
  cashMin: number | null = null;
  cashMax: number | null = null;

  // Dividend types dropdown options + selection
  dividendTypeOptions = [
    { label: 'Cash Dividend (CD)', value: DividendSearchRequestDividendTypeEnum.CD },
    { label: 'Special Cash (SC)', value: DividendSearchRequestDividendTypeEnum.SC },
    { label: 'Long-Term Cap Gain (LT)', value: DividendSearchRequestDividendTypeEnum.LT },
    { label: 'Short-Term Cap Gain (ST)', value: DividendSearchRequestDividendTypeEnum.ST }
  ];
  dividendTypes: DividendSearchRequestDividendTypeEnum[] | null = null;

  // frequency dropdown (kept consistent with other screeners)
  frequencyOptions = [
    { label: 'Any', value: null },
    { label: 'One-time (0)', value: 0 },
    { label: 'Annually (1)', value: 1 },
    { label: 'Bi-annually (2)', value: 2 },
    { label: 'Quarterly (4)', value: 4 },
    { label: 'Monthly (12)', value: 12 },
    { label: 'Bi-monthly (24)', value: 24 },
    { label: 'Weekly (52)', value: 52 }
  ];
  freq: number | null = null;

  // Table data
  rows: any[] = [];
  totalRecords = signal(0);
  company_name: string | null = null;

  // --- Autocomplete integration ---
  loadingTickers = false;
  selectedTicker: TickerOption | null = null;

  clearTicker() {
    // If already empty, do nothing (avoid unnecessary UI churn)
    if (!this.ticker) return;
    this.ticker = '';
    this.page = 1;
    // Clear current table without calling backend
    this.rows = [];
    this.totalRecords.set(0);
  }

  onTickerPicked(option: TickerOption) {
    this.selectedTicker = option;
    // Sync input with picked ticker symbol; don't auto-trigger search to avoid surprises
    this.ticker = option?.ticker ?? '';
    this.page = 1;
    // If you prefer auto-search on pick, uncomment:
    // void this.handleSearch();
  }

  onQueryChanged(query: string) {
    // Hook for analytics / telemetry / live hints
    // console.debug('TickerAutocomplete typed:', query);
  }

  // Optional: if the child emits a "cleared" event, map it here
  onAutocompleteCleared() {
    this.clearTicker();
  }

  // Paging
  page = 1;
  pageSize = 10;

  // Page-size options (used by paginator/dropdown in the template)
  pageSizeOptions: number[] = [10, 25, 50, 100];
  // Alias for PrimeNG paginator binding if desired
  rowsPerPageOptions: number[] = this.pageSizeOptions;

  // Allow manual page-size changes (e.g., from a dropdown)
  setPageSize(size: number | null) {
    const newSize = Number(size ?? this.pageSize);
    if (!newSize || newSize === this.pageSize) return;
    this.pageSize = newSize;
    this.page = 1;
    void this.handleSearch();
  }

  async handleSearch() {
    this.error.set(null);
    this.loading.set(true);
    try {
      // Convert date ranges to YYYY-MM-DD strings
      const [exFrom, exTo] = (this.exRange ?? []) as (Date | undefined)[];
      const [recFrom, recTo] = (this.recordRange ?? []) as (Date | undefined)[];
      const [decFrom, decTo] = (this.declarationRange ?? []) as (Date | undefined)[];
      const [payFrom, payTo] = (this.payRange ?? []) as (Date | undefined)[];

      const req: DividendSearchRequest = {
        tickers: this.ticker?.trim() ? [this.ticker.trim().toUpperCase()] : undefined,
        dividend_type: this.dividendTypes && this.dividendTypes.length ? this.dividendTypes : undefined,
        frequency: this.freq ?? null,
        ex_dividend_date_from: exFrom ? this.toYMD(exFrom) : null,
        ex_dividend_date_to: exTo ? this.toYMD(exTo) : null,
        record_date_from: recFrom ? this.toYMD(recFrom) : null,
        record_date_to: recTo ? this.toYMD(recTo) : null,
        declaration_date_from: decFrom ? this.toYMD(decFrom) : null,
        declaration_date_to: decTo ? this.toYMD(decTo) : null,
        pay_date_from: payFrom ? this.toYMD(payFrom) : null,
        pay_date_to: payTo ? this.toYMD(payTo) : null,
        cash_amount_min: this.cashMin ?? null,
        cash_amount_max: this.cashMax ?? null,
        // NOTE: Backend does not yet support free-text search on this endpoint.
        // When available, uncomment the line below and ensure the API accepts it.
        // search_string: this.searchString || null,
        page: this.page,
        page_size: this.pageSize
      };

      const params: SearchDividendsApiDividendsSearchPostRequestParams = {
        dividendSearchRequest: req
      };

      const res = await this.api.searchDividendsApiDividendsSearchPost(params).toPromise();

      // Backend returns { total, page, page_size, results: [...] } (older clients may use items)
      const items = (res as any)?.results ?? (res as any)?.items ?? [];
      const total = Number((res as any)?.total ?? (res as any)?.count ?? items.length);
      this.company_name = (res as any)?.company_name ?? null;

      this.rows = items;
      this.totalRecords.set(total);
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.loading.set(false);
    }
  }

  onPage(event: any) {
    const newPageSize = event?.rows ?? this.pageSize;
    const newPageIndex = event?.page ?? (event?.first != null ? Math.floor(event.first / newPageSize) : 0);
    const newPage = newPageIndex + 1;
    const changed = newPage !== this.page || newPageSize !== this.pageSize;

    this.page = newPage;
    this.pageSize = newPageSize;
    if (changed) void this.handleSearch();
  }

  setSearch(value: string) {
    const v = (value ?? '').trim();
    const changed = v !== this.searchString;
    this.searchString = v;
    if (!changed) return;
    this.page = 1;
    void this.handleSearch();
  }

  clearSearch() {
    if (!this.searchString) return;
    this.searchString = '';
    this.page = 1;
    void this.handleSearch();
  }

  clear() {
    this.ticker = '';
    this.exRange = null;
    this.freq = null;
    this.page = 1;
    this.rows = [];
    this.totalRecords.set(0);
    this.error.set(null);

    this.recordRange = null;
    this.declarationRange = null;
    this.payRange = null;
    this.cashMin = null;
    this.cashMax = null;
    this.dividendTypes = null;
  }

  private toYMD(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}