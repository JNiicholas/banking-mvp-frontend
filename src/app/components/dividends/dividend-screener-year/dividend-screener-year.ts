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

// Generated API service (path may be ../../api/api/ depending on your folder)
//import { DividendsApiService, DividendsEndpointDividendsTickerGetRequestParams } from '../../api/api/dividends.service';
import { DividendMetricsYearlyApiService, ApiFindYearlyByYearApiDividendMetricsYearlyYearYearGetRequestParams } from '../../../api/api/dividend-metrics-yearly.service';

import { from } from 'rxjs';

@Component({
  selector: 'app-dividend-screener-year',
  imports: [FormsModule, ButtonModule, InputTextModule, FloatLabelModule, CommonModule, CardModule, DatePickerModule, TableModule, IconFieldModule, InputIconModule,SliderModule],
  templateUrl: './dividend-screener-year.html',
  styleUrl: './dividend-screener-year.scss'
})
export class DividendScreenerYear {
  value = '';
  loading = signal(false);
  error = signal<string | null>(null);
  result = signal<any | null>(null);
  totalRecords = signal(0);

  year: number = new Date().getFullYear();
  yearDate: Date = new Date(this.year, 0, 1);
  minYield: number | null = 5;
  maxYield: number | null = 10;

  searchString: string = '';

  rangeDates: Date[] | null = (() => { const to = new Date(); const from = new Date(to); from.setFullYear(to.getFullYear() - 1); return [from, to]; })();
  page: number = 1;
  pageSize: number = 10;

  private api = inject(DividendMetricsYearlyApiService);

  constructor(private svc: DividendMetricsYearlyApiService) {
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

  async handleClick() {
    this.error.set(null);

    this.loading.set(true);
    try {
      const params: ApiFindYearlyByYearApiDividendMetricsYearlyYearYearGetRequestParams = {
        year: this.year,
        minYield: this.minYield ?? undefined,
        maxYield: this.maxYield ?? undefined,
        page: this.page,
        pageSize: this.pageSize,
      };
      const res = await this.api
        .apiFindYearlyByYearApiDividendMetricsYearlyYearYearGet(params)
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