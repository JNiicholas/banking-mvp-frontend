import { Component, inject, signal, PLATFORM_ID, Input, OnInit, OnChanges, SimpleChanges, ViewChild, AfterViewInit } from '@angular/core';
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
import { ToggleButtonModule } from 'primeng/togglebutton';

import { ChartModule } from 'primeng/chart';

import { TickerAutocomplete } from '../../shared/ticker-autocomplete/ticker-autocomplete';
import type { TickerOption } from '../../shared/ticker-autocomplete/ticker-autocomplete';

// Generated API service (path may be ../../api/api/ depending on your folder)
import { DividendSearchApiService, DividendsEndpointApiDividendsTickerGetRequestParams } from '../../../api/api/dividend-search.service';
import { from } from 'rxjs';

@Component({
  selector: 'app-dividend-ticker-history',
  imports: [FormsModule, ButtonModule, InputTextModule, FloatLabelModule, CommonModule, CardModule, DatePickerModule, TableModule, IconFieldModule, InputIconModule, TickerAutocomplete, ChartModule, ToggleButtonModule],
  templateUrl: './dividend-ticker-history.html',
  styleUrl: './dividend-ticker-history.scss'
})
export class DividendTickerHistory implements OnInit, OnChanges, AfterViewInit {
  value = '';
  loading = signal(false);
  error = signal<string | null>(null);
  result = signal<any | null>(null);
  totalRecords = signal(0);

  // View toggle and chart state
  viewMode = signal<'table' | 'chart'>('table');

  // Two-way bound toggle in the template; maps to viewMode signal
  private _viewModeToggle = false; // false=table, true=chart
  get viewModeToggle() { return this._viewModeToggle; }
  set viewModeToggle(v: boolean) {
    this._viewModeToggle = !!v;
    const next = v ? 'chart' : 'table';
    if (this.viewMode() !== next) this.viewMode.set(next);
    // If switching to chart, ensure we have full data for the chart
    if (next === 'chart') {
      void this.ensureChartHasAllData();
    }
  }

  chartData = signal<any | null>(null);
  chartOptions = signal<any | null>(null);

  // Hold chart meta/points for tooltip/meta lookups
  private _chartPoints: any[] = [];

  searchString: string = '';

  rangeDates: Date[] | null = (() => { const to = new Date(); const from = new Date(to); from.setFullYear(to.getFullYear() - 1); return [from, to]; })();
  page: number = 1;
  pageSize: number = 10;

  // Autocomplete state
  loadingTickers = false;
  selectedTicker: TickerOption | null = null;

  // Reference to the child autocomplete to programmatically set its value
  @ViewChild(TickerAutocomplete, { static: false }) ac?: TickerAutocomplete;

  /** Optional: if provided, component will prefill and auto-load this ticker */
  @Input() ticker: string | null = null;

  /** Apply incoming ticker to input/autocomplete and optionally trigger a load */
  private applyTickerInput(t: string | null, autoLoad: boolean = true) {
    const v = (t ?? '').trim();
    if (!v) return;

    // Sync the free-text input and selected ticker (minimal TickerOption)
    this.value = v;
    this.selectedTicker = { ticker: v } as TickerOption;

    // Also reflect into the child autocomplete UI so it shows the ticker
    try {
      const ac = this.ac as any;
      // Preferred: set the component's selected signal if available
      if (ac?.selected?.set) {
        ac.selected.set({ ticker: v } as TickerOption);
      }
      // Best-effort: clear and set underlying input field across PrimeNG versions
      const el: HTMLInputElement | undefined = ac?.inputEL?.nativeElement ?? ac?.inputField?.nativeElement;
      if (el) el.value = v;
    } catch {
      // no-op if structure differs; internal state above is sufficient
    }

    this.chartData.set(null);

    // Reset paging when ticker changes
    this.page = 1;

    if (autoLoad) {
      void this.handleClick();
    }
  }

  private api = inject(DividendSearchApiService);

  constructor(private svc: DividendSearchApiService) {
    const platformId = inject(PLATFORM_ID);
    const origin = isPlatformServer(platformId) ? 'SSR' : isPlatformBrowser(platformId) ? 'BROWSER' : 'UNKNOWN';
    console.log(`[${origin}] [api] basePath =`, (svc as any)['configuration']?.basePath);
  }

  ngOnInit(): void {
    if (this.ticker) {
      this.applyTickerInput(this.ticker, true);
    }
  }

  ngAfterViewInit(): void {
    // After the child view is initialized, ensure the autocomplete reflects the incoming ticker
    if (this.ticker) {
      // Avoid triggering a second fetch if ngOnInit already loaded data
      this.applyTickerInput(this.ticker, false);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('ticker' in changes) {
      const next = changes['ticker']?.currentValue as string | null;
      if (next && typeof next === 'string') {
        this.applyTickerInput(next, true);
      }
    }
  }

  private getCurrentTicker(): string | null {
    // Prefer selected ticker from autocomplete if present
    const picked = this.selectedTicker?.ticker?.toString()?.trim();
    if (picked) return picked;

    const v = this.value?.trim();
    if (v) return v;

    const r = this.result();
    const rt = r?.ticker?.toString()?.trim();
    return rt || null;
  }

  onTickerPicked(option: TickerOption) {
    this.selectedTicker = option;
    // sync the text input
    this.value = option?.ticker ?? '';
    this.page = 1;
    // Auto-load on pick (standalone and embedded)
    void this.handleClick();
  }

  onQueryChanged(query: string) {
    // Optional: hook for analytics or live hints
    console.log('TickerAutocomplete typed:', query);
  }

  /** Auto-refresh when the user changes the date range */
  onRangeChange(range: Date[] | null) {
    this.rangeDates = range;

    // If we have a ticker and at least one date, refresh automatically
    const hasRange = Array.isArray(this.rangeDates) && this.rangeDates.length > 0;
    const ticker = this.getCurrentTicker();
    if (ticker && hasRange) {
      // Reset paging when filters change
      this.page = 1;
      void this.handleClick();
    }
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

  clearTicker() {
    if (!this.value) return;        // no reload if already empty
    this.value = '';
    this.selectedTicker = null;
    this.page = 1;
    this.result.set(null); // clear the table content without reloading
    this.chartData.set(null);
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

  private toYMD(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  private resolveDateFilters() {
    let exDividendDateGte: string | undefined;
    let exDividendDateLte: string | undefined;
    if (this.rangeDates && this.rangeDates.length) {
      const [a, b] = this.rangeDates as Date[];
      if (a && b) {
        const d1 = a < b ? a : b;
        const d2 = a < b ? b : a;
        exDividendDateGte = this.toYMD(d1);
        exDividendDateLte = this.toYMD(d2);
      } else if (a) {
        exDividendDateGte = this.toYMD(a);
      }
    }
    return { exDividendDateGte, exDividendDateLte };
  }

  private updateTotalRecords(res: any) {
    const count = Array.isArray(res?.dividends) ? res.dividends.length : 0;
    const hasMore = !!res?.has_more;
    // Enable/disable Next button correctly without knowing absolute total
    const total = hasMore ? (this.page * this.pageSize + 1) : ((this.page - 1) * this.pageSize + count);
    this.totalRecords.set(total);
  }

  private fmtCurrency(n: number | null | undefined, cur?: string) {
    if (n == null || isNaN(Number(n))) return '';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: (cur || 'USD') as any, maximumFractionDigits: 4 }).format(Number(n));
    } catch {
      return `${Number(n).toFixed(4)} ${cur ?? ''}`.trim();
    }
  }

  private buildChart() {
    const res = this.result();
    const rows: any[] = Array.isArray(res?.dividends) ? res.dividends.slice() : [];
    this.buildChartFromRows(rows);
  }

  private buildChartFromRows(rows: any[]) {
    if (!rows || !rows.length) {
      this.chartData.set(null);
      return;
    }

    // Sort by ex_dividend_date ascending for x-axis
    rows.sort((a, b) => {
      const da = (a.ex_dividend_date || a.exDate || a.exdate || '').toString();
      const db = (b.ex_dividend_date || b.exDate || b.exdate || '').toString();
      return da.localeCompare(db);
    });

    const points = rows.map((d) => {
      const ex = (d.ex_dividend_date || d.exDate || d.exdate || '').toString();
      const y = Number(d.amount ?? d.cash_amount ?? d.cashAmount ?? d.dividend ?? 0);
      return {
        x: ex,
        y,
        pay: (d.pay_date || d.payDate || '').toString(),
        record: (d.record_date || d.recordDate || '').toString(),
        decl: (d.declaration_date || d.declare_date || d.declarationDate || '').toString(),
        cur: (d.currency || d.currency_name || d.curr || 'USD').toString(),
      };
    });

    // Keep a copy for tooltip/meta lookups
    this._chartPoints = points;

    const labels = points.map(p => (typeof p.x === 'string' ? p.x.split('T')[0] : p.x));
    const values = points.map(p => p.y);

    // Resolve theme-aware colors
    let textColor = '#e5e7eb';
    let gridColor = 'rgba(255,255,255,0.1)';
    try {
      const cs = getComputedStyle(document.documentElement);
      textColor = cs.getPropertyValue('--p-text-color')?.trim() || textColor;
      gridColor = cs.getPropertyValue('--p-content-border-color')?.trim() || gridColor;
    } catch {}

    const data = {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Dividend Amount',
          data: values,
        },
      ],
    };

    const options = {
      maintainAspectRatio: false,
      aspectRatio: 0.8,
      // parsing: false, // Removed so Chart.js uses category labels for dataset values
      scales: {
        x: {
          ticks: {
            color: textColor,
            callback: function(val: any) {
              // Chart.js supplies the value index; get formatted label back and strip time
              const raw = (this as any).getLabelForValue ? (this as any).getLabelForValue(val) : val;
              const s = typeof raw === 'string' ? raw : String(raw ?? '');
              return s.includes('T') ? s.split('T')[0] : s;
            },
          },
          grid: { color: gridColor, drawBorder: false },
        },
        y: {
          ticks: {
            color: textColor,
            callback: (val: any) => this.fmtCurrency(Number(val), this._chartPoints[0]?.cur),
          },
          grid: { color: gridColor, drawBorder: false },
        },
      },
      plugins: {
        legend: { labels: { color: textColor } },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (ctx: any) => {
              const p = this._chartPoints?.[ctx?.dataIndex] ?? {};
              const amt = this.fmtCurrency(p?.y, p?.cur);
              return `Amount: ${amt}`;
            },
            afterLabel: (ctx: any) => {
              const p = this._chartPoints?.[ctx?.dataIndex] ?? {};
              const lines: string[] = [];
              if (p.pay) lines.push(`Pay: ${p.pay}`);
              if (p.record) lines.push(`Record: ${p.record}`);
              if (p.decl) lines.push(`Declared: ${p.decl}`);
              return lines;
            },
            title: (items: any[]) => {
              const idx = items?.[0]?.dataIndex ?? 0;
              const p = this._chartPoints?.[idx] ?? {};
              return `Ex-Date: ${p.x ?? items?.[0]?.label ?? ''}`;
            },
          },
        },
      },
    };

    this.chartData.set(data);
    this.chartOptions.set(options);
  }

  onPage(event: any) {
    const newPageSize = event?.rows ?? this.pageSize;
    const newPageIndex = event?.page ?? (event?.first != null ? Math.floor(event.first / newPageSize) : 0);
    const newPage = newPageIndex + 1; // PrimeNG pages are 0-based

    const changed = newPage !== this.page || newPageSize !== this.pageSize;
    this.page = newPage;
    this.pageSize = newPageSize;

    const ticker = this.getCurrentTicker();
    if (!ticker) return; // no known ticker yet → don't fetch
    if (changed) void this.handleClick();
  }

  async handleClick() {
    this.error.set(null);

    const ticker = this.getCurrentTicker();
    if (!ticker) {
      this.error.set('Please enter a ticker.');
      return;
    }

    if (this.page < 1) this.page = 1;

    // Date range and pagination params
    const { exDividendDateGte, exDividendDateLte } = this.resolveDateFilters();

    this.loading.set(true);
    try {
      const params: DividendsEndpointApiDividendsTickerGetRequestParams = {
        ticker,
        page: this.page,
        pageSize: this.pageSize,
        order: 'desc',
        sort: 'ex_dividend_date',
        exDividendDateGte,
        exDividendDateLte,
        searchString: this.searchString,
      };
      const res = await this.api
        .dividendsEndpointApiDividendsTickerGet(params)
        .toPromise();

      this.result.set(res);
      this.searchString = (res as any)?.search ?? this.searchString;
      this.updateTotalRecords(res);
      this.buildChart();

      if (this.viewMode() === 'chart') {
        // If user is viewing chart, attempt to fill entire dataset
        await this.ensureChartHasAllData();
      }
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.loading.set(false);
    }
  }

  /** Ensure chart has the full dataset for the current filters by paginating all results. */
  private async ensureChartHasAllData() {
    const ticker = this.getCurrentTicker();
    if (!ticker) return;

    const res = this.result();
    const current = Array.isArray(res?.dividends) ? res!.dividends : [];
    const hasMore = !!res?.has_more;

    // If we already have a large set or no more data, just (re)build and exit
    if (!hasMore) {
      this.buildChartFromRows(current);
      return;
    }

    const { exDividendDateGte, exDividendDateLte } = this.resolveDateFilters();

    // Paginate to gather all rows for chart; cap total rows to avoid huge payloads
    const MAX_ROWS = 5000;
    const PAGE_SIZE = 200;
    let page = 1;
    let all: any[] = [];
    let more = true;

    this.loading.set(true);
    try {
      while (more && all.length < MAX_ROWS) {
        const params: DividendsEndpointApiDividendsTickerGetRequestParams = {
          ticker,
          page,
          pageSize: PAGE_SIZE,
          order: 'desc',
          sort: 'ex_dividend_date',
          exDividendDateGte,
          exDividendDateLte,
          searchString: this.searchString,
        };
        const pageRes = await this.api.dividendsEndpointApiDividendsTickerGet(params).toPromise();
        const rows = Array.isArray((pageRes as any)?.dividends) ? (pageRes as any).dividends : [];
        all.push(...rows);
        more = !!(pageRes as any)?.has_more;
        page += 1;
        if (!rows.length) break;
      }
    } catch (e) {
      // If the full fetch fails, fall back to current page chart
      this.buildChartFromRows(current);
      this.loading.set(false);
      return;
    }
    this.loading.set(false);

    if (!all.length) {
      this.buildChartFromRows(current);
      return;
    }

    // Build chart from all rows fetched
    this.buildChartFromRows(all);
  }
}