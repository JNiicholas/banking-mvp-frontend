import { Component, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { CardModule } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';


import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SliderModule } from 'primeng/slider';
import { SelectModule } from 'primeng/select';

import { DividendMetricsApiService, ApiFindByYieldApiDividendMetricsSearchGetRequestParams } from '../../../api/api/dividend-metrics.service';

import { from } from 'rxjs';

export enum DividendFrequency {
  OneTime = 0,
  Annual = 1,
  SemiAnnual = 2,
  Quarterly = 4,
  Monthly = 12,
  BiMonthly = 24,
  Weekly = 52
}

const ALLOWED_FREQUENCIES: number[] = [
  DividendFrequency.OneTime,
  DividendFrequency.Annual,
  DividendFrequency.SemiAnnual,
  DividendFrequency.Quarterly,
  DividendFrequency.Monthly,
  DividendFrequency.BiMonthly,
  DividendFrequency.Weekly
];

@Component({
  selector: 'app-dividend-screener-ttm',
  imports: [FormsModule, ButtonModule, InputTextModule, FloatLabelModule, CommonModule, CardModule, DatePickerModule, TableModule, IconFieldModule, InputIconModule, SliderModule, SelectModule],
  templateUrl: './dividend-screener-ttm.html',
  styleUrl: './dividend-screener-ttm.scss'
})
export class DividendScreenerTtm {
  value = '';
  loading = signal(false);
  error = signal<string | null>(null);
  result = signal<any | null>(null);
  totalRecords = signal(0);

  year: number = new Date().getFullYear();
  yearDate: Date = new Date(this.year, 0, 1);
  minYield: number | null = 5;
  maxYield: number | null = 10;
  freq: number | null = 4;

  searchString: string = '';

  rangeDates: Date[] | null = (() => { const to = new Date(); const from = new Date(to); from.setFullYear(to.getFullYear() - 1); return [from, to]; })();
  page: number = 1;
  pageSize: number = 10;

  // Dropdown options (include "Any" as null to omit from request)
  readonly frequencyOptions: { label: string; value: number | null }[] = [
    { label: 'Any', value: null },
    { label: 'One-time (0)', value: DividendFrequency.OneTime },
    { label: 'Annually (1)', value: DividendFrequency.Annual },
    { label: 'Bi-annually (2)', value: DividendFrequency.SemiAnnual },
    { label: 'Quarterly (4)', value: DividendFrequency.Quarterly },
    { label: 'Monthly (12)', value: DividendFrequency.Monthly },
    { label: 'Bi-monthly (24)', value: DividendFrequency.BiMonthly },
    { label: 'Weekly (52)', value: DividendFrequency.Weekly }
  ];

  private api = inject(DividendMetricsApiService);

  constructor(private svc: DividendMetricsApiService) {
    const platformId = inject(PLATFORM_ID);
    const origin = isPlatformServer(platformId) ? 'SSR' : isPlatformBrowser(platformId) ? 'BROWSER' : 'UNKNOWN';
    console.log(`[${origin}] [api] basePath =`, (svc as any)['configuration']?.basePath);
  }

  private getCurrentTicker(): string | null {
    const v = this.value?.trim();
    if (v) return v;
    const r = this.result();
    const rt = r?.ticker?.toString()?.trim();
    return rt || null;
  }

  setSearch(value: string) {
    console.log('setSearch called with', value);
    const v = (value ?? '').trim();
    const changed = v !== this.searchString;
    this.searchString = v;
    this.page = 1; // always reset to first page on explicit search
    const ticker = this.getCurrentTicker();
    if (ticker) {
      // Ensure input reflects the active ticker
      this.value = ticker;
      void this.handleClick();
    } else {
      // No ticker available; show a gentle error once
      this.error.set('Please enter a ticker before searching.');
    }
  }

  /**
   * Reset the screener inputs to their startup values and clear the table.
   */
  clearScreener(): void {
    // reset filters to startup values
    this.minYield = 5;
    this.maxYield = 10;
    this.freq = DividendFrequency.Quarterly; // default

    // keep the currently selected year, but reset the picker to Jan 1 of that year
    this.yearDate = new Date(this.year, 0, 1);

    // reset pagination and clear results
    this.page = 1;
    this.result.set(null);
    this.totalRecords.set(0);

    // clear any previous errors
    this.error.set(null);
  }

  /**
   * @deprecated Use clearScreener() instead. Kept to avoid breaking existing template bindings.
   */
  clearTicker(): void {
    this.clearScreener();
  }

  clearSearch(): void {
    if (!this.searchString.trim()) {
      return; // do nothing if already empty
    }
    this.searchString = '';
    this.page = 1;
    const ticker = this.getCurrentTicker();
    if (ticker) {
      this.value = ticker;
      void this.handleClick();
    }
  }

  onYearSelect(date: Date) {
    this.year = date.getFullYear();
    this.yearDate = date; // keep picker in sync
  }

  private toYMD(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  private updateTotalRecords(res: any) {
    const count = Array.isArray(res?.dividends) ? res.dividends.length : 0;
    const hasMore = !!res?.has_more;
    // Enable/disable Next button correctly without knowing absolute total
    const total = hasMore ? (this.page * this.pageSize + 1) : ((this.page - 1) * this.pageSize + count);
    this.totalRecords.set(total);
  }

  onPage(event: any) {
    const newPageSize = event?.rows ?? this.pageSize;
    const newPageIndex = event?.page ?? (event?.first != null ? Math.floor(event.first / newPageSize) : 0);
    const newPage = newPageIndex + 1; // PrimeNG pages are 0-based

    const changed = newPage !== this.page || newPageSize !== this.pageSize;
    this.page = newPage;
    this.pageSize = newPageSize;

    if (changed) {
      void this.handleClick();
    }
  }

  private isValidFrequency(value: number | null | undefined): boolean {
    if (value == null) return true; // null/undefined means "Any"
    return ALLOWED_FREQUENCIES.includes(value);
  }

  setFrequency(value: number | null): void {
    if (value === null) {
      this.freq = null; // Any
      return;
    }
    if (!this.isValidFrequency(value)) {
      this.error.set('Invalid frequency selected.');
      return;
    }
    this.freq = value;
  }

  private normalizeFreqForRequest(): number | undefined {
    // Convert null/invalid to undefined so it is omitted from the request
    if (this.freq == null) return undefined;
    return this.isValidFrequency(this.freq) ? this.freq : undefined;
  }

  // map the selected freq (number | null) to its label for the caption
  get freqLabel(): string {
    if (this.freq == null) return 'Any frequency';
    return this.frequencyOptions.find(o => o.value === this.freq)?.label ?? String(this.freq);
  }

  async handleClick() {
    console.log('handleClick called with', {
      minYield: this.minYield,
      maxYield: this.maxYield,
      freq: this.freq,
      page: this.page,
      pageSize: this.pageSize
    });

    this.error.set(null);

    this.loading.set(true);
    try {
      // Validate frequency
      if (!this.isValidFrequency(this.freq)) {
        console.warn('Aborting search due to invalid frequency:', this.freq);
        this.error.set('Invalid frequency value. Choose one of: 0, 1, 2, 4, 12, 24, 52 or Any.');
        this.loading.set(false);
        return;
      }

      const params: ApiFindByYieldApiDividendMetricsSearchGetRequestParams = {
        minYield: this.minYield ?? undefined,
        maxYield: this.maxYield ?? undefined,
        freq: this.normalizeFreqForRequest(),
        page: this.page,
        pageSize: this.pageSize,
      };
      const res = await this.api
        .apiFindByYieldApiDividendMetricsSearchGet(params)
        .toPromise();

      this.result.set(res);
      this.totalRecords.set(Number((res as any)?.total ?? 0));
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.loading.set(false);
    }
  }
}