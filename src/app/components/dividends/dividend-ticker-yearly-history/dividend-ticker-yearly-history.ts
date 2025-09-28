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
import { ChartModule } from 'primeng/chart';
import { ToggleButtonModule } from 'primeng/togglebutton';

import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { DividendMetricsYearlyApiService, ApiGetYearlyHistoryApiDividendMetricsYearlyHistoryTickerGetRequestParams } from '../../../api/api/dividend-metrics-yearly.service';

import { TickerAutocomplete } from '../../shared/ticker-autocomplete/ticker-autocomplete';
import type { TickerOption } from '../../shared/ticker-autocomplete/ticker-autocomplete';

import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-dividend-ticker-yearly-history',
  imports: [FormsModule, ButtonModule, InputTextModule, FloatLabelModule, CommonModule, CardModule, DatePickerModule, TableModule, ChartModule, ToggleButtonModule, IconFieldModule, InputIconModule, TickerAutocomplete],
  templateUrl: './dividend-ticker-yearly-history.html',
  styleUrl: './dividend-ticker-yearly-history.scss',
  standalone: true,
})
export class DividendTickerYearlyHistory implements OnInit, OnChanges, AfterViewInit {
  value = '';
  loading = signal(false);
  error = signal<string | null>(null);
  result = signal<any | null>(null);
  loadingTickers = false;
  selectedTicker: TickerOption | null = null;
  page = 1;

  // View state: table or chart
  viewMode = signal<'table' | 'chart'>('table');
  chartData = signal<any | null>(null);
  chartOptions = signal<any | null>(null);

  // Reference to child autocomplete to programmatically prefill its UI
  @ViewChild(TickerAutocomplete, { static: false }) ac?: TickerAutocomplete;

  /** Optional: prefill and auto-load when provided */
  @Input() ticker: string | null = null;

  private api = inject(DividendMetricsYearlyApiService);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    const origin = isPlatformServer(this.platformId) ? 'SSR' : isPlatformBrowser(this.platformId) ? 'BROWSER' : 'UNKNOWN';
    console.log(`[${origin}] [api] basePath =`, (this.api as any)['configuration']?.basePath);
  }

  /** Apply an incoming ticker to internal state and (optionally) load */
  private applyTickerInput(t: string | null, autoLoad: boolean = true) {
    const v = (t ?? '').trim();
    if (!v) return;

    // Sync internal state
    this.value = v;
    this.selectedTicker = { ticker: v } as TickerOption;
    this.page = 1;

    // Reflect into child autocomplete so the UI shows the value
    try {
      const ac = this.ac as any;
      if (ac?.selected?.set) {
        ac.selected.set({ ticker: v } as TickerOption);
      }
      const el: HTMLInputElement | undefined = ac?.inputEL?.nativeElement ?? ac?.inputField?.nativeElement;
      if (el) el.value = v;
    } catch {
      // no-op if structure differs; internal state is sufficient
    }

    if (autoLoad) {
      void this.handleClick();
    }
  }

  ngOnInit(): void {
    if (this.ticker) {
      this.applyTickerInput(this.ticker, true);
    }
  }

  ngAfterViewInit(): void {
    if (this.ticker) {
      this.applyTickerInput(this.ticker, false);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('ticker' in changes) {
      const next = changes['ticker']?.currentValue as string | null;
      if (typeof next === 'string' && next?.trim()) {
        this.applyTickerInput(next, true);
      }
    }
  }

  private getCurrentTicker(): string | null {
    const v = this.value?.trim();
    if (v) return v;
    const r = this.result();
    const rt = r?.ticker?.toString()?.trim();
    return rt || null;
  }

  /** Build chart data/options from current result */
  private rebuildChart(): void {
    const r = this.result();
    if (!r) {
      this.chartData.set(null);
      this.chartOptions.set(null);
      return;
    }

    // Normalize rows from API (support several shapes)
    const rows: any[] = Array.isArray((r as any).history)
      ? (r as any).history
      : Array.isArray((r as any).items)
      ? (r as any).items
      : Array.isArray((r as any).rows)
      ? (r as any).rows
      : Array.isArray(r)
      ? (r as any)
      : [];

    // Build labels (years), numeric data, and per-point meta for tooltips
    const labels: string[] = [];
    const data: number[] = [];
    const meta: any[] = [];

    for (const row of rows) {
      const year = (row.year ?? row.Year ?? '').toString();
      // Accept multiple possible sum keys including the backend's `year_div_sum`
      const sum = Number(
        row.year_div_sum ??
        row.year_dividend_sum ??
        row.yearDividendSum ??
        row.dividends_sum ??
        row.sum ??
        0
      );

      labels.push(year);
      data.push(Number.isFinite(sum) ? sum : 0);

      const pbdRaw = row.price_basis_date ?? row.priceBasisDate ?? null;
      const pbd = typeof pbdRaw === 'string' ? (pbdRaw.split('T')[0] || pbdRaw) : pbdRaw;

      meta.push({
        year_div_sum: Number.isFinite(sum) ? sum : 0,
        payments_count: row.payments_count ?? row.payments ?? row.Payments ?? null,
        ticker: row.ticker ?? null,
        year: row.year ?? row.Year ?? null,
        is_ytd: row.is_ytd ?? row.ytd ?? row.YTD ?? null,
        price_basis: row.price_basis ?? row.priceBasis ?? null,
        price_basis_date: pbd,
        year_yield: row.year_yield ?? row.yield_pct ?? row.yield ?? row['Yield %'] ?? null,
      });
    }

    // Choose colors that are visible in dark mode; fall back if CSS vars missing
    let text = '#e5e7eb', muted = '#9ca3af', grid = '#374151', bar = '#3b82f6';
    if (isPlatformBrowser(this.platformId)) {
      const cs = getComputedStyle(document.documentElement);
      text = cs.getPropertyValue('--p-text-color') || text;
      muted = cs.getPropertyValue('--p-text-muted-color') || muted;
      grid = cs.getPropertyValue('--p-content-border-color') || grid;
      // A primary-ish color for bars if available, otherwise a blue
      bar = cs.getPropertyValue('--p-primary-500') || bar;
    }

    // Attach meta on the dataset so tooltip callbacks can read it
    const dataset: any = {
      label: 'Yearly Dividend Sum',
      data,
      meta,
    };

    this.chartData.set({
      labels,
      datasets: [dataset],
    });
    console.log('[YearlyHistory chart] labels=', labels, 'data=', data);

    this.chartOptions.set({
      maintainAspectRatio: false,
      aspectRatio: 0.8,
      plugins: {
        tooltip: {
          callbacks: {
            title: (ctx: any) => (ctx?.[0]?.label ?? ''),
            label: (ctx: any) => {
              const idx = ctx?.dataIndex ?? 0;
              const ds: any = ctx?.dataset ?? {};
              const m = Array.isArray(ds.meta) ? ds.meta[idx] : {};
              const lines: string[] = [];
              // Always show the yearly dividend sum from data/meta
              const sumVal = typeof ctx?.parsed?.y === 'number' ? ctx.parsed.y : (m?.year_div_sum ?? null);
              if (sumVal != null) lines.push(`Dividend sum: ${Number(sumVal).toFixed(2)}`);
              if (m?.payments_count != null) lines.push(`Payments: ${m.payments_count}`);
              if (m?.year_yield != null) lines.push(`Yield: ${Number(m.year_yield).toFixed(2)}%`);
              if (m?.price_basis != null) lines.push(`Price basis: ${Number(m.price_basis).toFixed(2)}`);
              if (m?.price_basis_date) lines.push(`Price basis date: ${m.price_basis_date}`);
              if (m?.is_ytd != null) lines.push(`YTD: ${m.is_ytd ? 'true' : 'false'}`);
              if (m?.ticker) lines.push(`Ticker: ${m.ticker}`);
              if (m?.year != null) lines.push(`Year: ${m.year}`);
              return lines;
            },
          },
          mode: 'index',
          intersect: false,
        },
        legend: { labels: { color: text } },
      },
      scales: {
        x: {
          ticks: { color: muted },
          grid: { color: grid, drawBorder: false },
        },
        y: {
          ticks: { color: muted },
          grid: { color: grid, drawBorder: false },
        },
      },
    });
  }

  setSearch(value: string) {
    const v = (value ?? '').trim();
    this.value = v;
    const ticker = this.getCurrentTicker();
    if (ticker) {
      void this.handleClick();
    }
  }

  clearTicker() {
    if (!this.value && !this.selectedTicker) return; // nothing to clear
    this.selectedTicker = null;
    this.value = '';
    this.page = 1;
    this.result.set(null);
  }

  clearSearch(): void {
    return;
  }

  async handleClick() {
    this.error.set(null);

    const target = (this.ticker && this.ticker.trim()) ? this.ticker.trim() : (this.value?.trim() ?? '');
    if (!target) {
      this.error.set('Please enter a ticker.');
      return;
    }

    this.loading.set(true);
    try {
      const params: ApiGetYearlyHistoryApiDividendMetricsYearlyHistoryTickerGetRequestParams = { ticker: target };
      const res = await firstValueFrom(this.api.apiGetYearlyHistoryApiDividendMetricsYearlyHistoryTickerGet(params));
      this.result.set(res);
      this.rebuildChart();
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.loading.set(false);
    }
  }

  onTickerPicked(option: TickerOption) {
    this.selectedTicker = option;
    this.value = option?.ticker ?? '';
    this.page = 1;
    void this.handleClick();
  }

  onQueryChanged(query: string) {
    // Optional: hook for analytics or live hints
    console.log('TickerAutocomplete typed:', query);
  }

  toggleView(v: boolean) {
    this.viewMode.set(v ? 'chart' : 'table');
    if (v && !this.chartData()) {
      this.rebuildChart();
    }
  }
}