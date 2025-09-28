import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

// TradingView Lightweight Charts (install: npm i lightweight-charts)
import {
  createChart,
  ISeriesApi,
  CandlestickSeriesPartialOptions,
  HistogramSeriesPartialOptions,
  // series definitions (v5)
  CandlestickSeries,
  HistogramSeries,
  // types
  Time,
  UTCTimestamp,
  CandlestickData,
  HistogramData,
  ColorType
} from 'lightweight-charts';

// OpenAPI-generated client for aggregates
import {
  AggregateTimeseriesBarsApiService,
  GetCustomBarsApiAggregatesCustomBarsGetRequestParams,
} from '../../../api/api/aggregate-timeseries-bars.service';

type Timespan =
  | 'second'
  | 'minute'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year';

interface TvBar {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface TvVol {
  time: UTCTimestamp;
  value: number;
}

function mapToLightweight(bars: any[]): { ohlc: TvBar[]; vol: TvVol[] } {
  const asc = [...(bars ?? [])].sort((a, b) => Number(a?.t) - Number(b?.t));
  const ohlc: TvBar[] = asc.map((b: any) => ({
    time: Math.floor(Number(b?.t) / 1000) as UTCTimestamp,
    open: Number(b?.o),
    high: Number(b?.h),
    low: Number(b?.l),
    close: Number(b?.c),
  }));
  const vol: TvVol[] = asc.map((b: any) => ({
    time: Math.floor(Number(b?.t) / 1000) as UTCTimestamp,
    value: Number(b?.v ?? 0),
  }));
  return { ohlc, vol };
}

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chart.html',
  styleUrl: './chart.scss',
})
export class Chart implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;

  private api = inject(AggregateTimeseriesBarsApiService);

  // -------- Inputs --------
  /** Ticker symbol, e.g., "AAPL" */
  @Input() ticker!: string;

  /** Polygon timespan unit */
  @Input() timespan: Timespan = 'day';

  /** Multiplier for timespan (e.g., 5 with timespan="minute" => 5-min bars) */
  @Input() multiplier = 1;

  /** Start date (YYYY-MM-DD). If not provided, defaults to 6 months ago. */
  @Input() from?: string;

  /** End date (YYYY-MM-DD). If not provided, defaults to today. */
  @Input() to?: string;

  /** Whether to use adjusted data (splits) */
  @Input() adjusted = true;

  /** asc | desc */
  @Input() sort: 'asc' | 'desc' = 'asc';

  /** Optional cap on items returned from backend */
  @Input() maxItems?: number;

  /** Theme for the chart look & feel */
  @Input() theme: 'light' | 'dark' = 'dark';

  // -------- Chart state --------
  private chart: ReturnType<typeof createChart> | undefined;
  private resizeObs?: ResizeObserver;
  private candleSeries: ISeriesApi<'Candlestick'> | undefined;
  private volumeSeries: ISeriesApi<'Histogram'> | undefined;

  ngAfterViewInit(): void {
    this.initChart();
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.chart) return;
    if (changes['ticker'] || changes['timespan'] || changes['multiplier'] || changes['from'] || changes['to'] || changes['adjusted'] || changes['sort']) {
      this.loadData();
    }
    if (changes['theme']) {
      this.applyTheme();
    }
  }

  ngOnDestroy(): void {
    this.resizeObs?.disconnect();
    // lightweight-charts doesn't require explicit chart disposal, GC is fine
  }

  private applyTheme(): void {
    if (!this.chart) return;
    const isDark = this.theme === 'dark';

    // Chart-level options
    this.chart.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#131722' : '#FFFFFF' },
        textColor: isDark ? '#d1d4dc' : '#222222',
      },
      grid: {
        vertLines: { color: isDark ? '#2B2B43' : '#e1e3eb' },
        horzLines: { color: isDark ? '#2B2B43' : '#e1e3eb' },
      },
      rightPriceScale: {
        borderColor: isDark ? '#2B2B43' : '#e1e3eb',
      },
      timeScale: {
        borderColor: isDark ? '#2B2B43' : '#e1e3eb',
      },
    });

    // Series options (colors) for dark/light
    this.candleSeries?.applyOptions({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    this.volumeSeries?.applyOptions({
      // Keep volume default color readable in both themes
      // For v5 histogram series, color can be set per-bar too; here we set a base
      color: isDark ? 'rgba(38, 166, 154, 0.6)' : 'rgba(38, 166, 154, 0.6)',
    });
  }

  private initChart(): void {
    const el = this.container?.nativeElement;
    if (!el) return;

    this.chart = createChart(el, {
      width: el.clientWidth,
      height: 420,
      crosshair: { mode: 0 },
    });

    const candleOpts: CandlestickSeriesPartialOptions = {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    };
    this.candleSeries = this.chart.addSeries(CandlestickSeries, candleOpts);

    const volOpts: HistogramSeriesPartialOptions = {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    };
    this.volumeSeries = this.chart.addSeries(HistogramSeries, volOpts);

    // Apply initial theme styling
    this.applyTheme();

    // Apply scale margins on the separate price scale for the histogram series
    try {
      (this.chart as any).priceScale('')?.applyOptions?.({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
    } catch {
      // no-op for older typings
    }

    // Resize handling
    this.resizeObs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        this.chart?.applyOptions({ width: Math.floor(cr.width) });
      }
    });
    this.resizeObs.observe(el);
  }

  private resolveDefaultDates(): { from: string; to: string } {
    const today = new Date();
    const to = (this.to ?? today.toISOString().slice(0, 10));
    const fromDate = this.from
      ? new Date(this.from)
      : new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
    const from = fromDate.toISOString().slice(0, 10);
    return { from, to };
  }

  private loadData(): void {
    if (!this.ticker) return;

    const { from, to } = this.resolveDefaultDates();

    const params: GetCustomBarsApiAggregatesCustomBarsGetRequestParams = {
      ticker: this.ticker,
      multiplier: this.multiplier,
      timespan: this.timespan,
      from: from,
      to: to,
      adjusted: this.adjusted,
      sort: this.sort,
      // limit: undefined, // backend default
      maxItems: this.maxItems,
    };

    this.api.getCustomBarsApiAggregatesCustomBarsGet(params).subscribe({
      next: (rows) => {
        const { ohlc, vol } = mapToLightweight(rows ?? []);
        this.candleSeries?.setData(ohlc as CandlestickData<Time>[]);
        this.volumeSeries?.setData(vol as HistogramData<Time>[]);
        // fit content when data arrives
        this.chart?.timeScale().fitContent();
      },
      error: (err) => {
        // Basic fallback: clear series if load fails
        this.candleSeries?.setData([]);
        this.volumeSeries?.setData([]);
        // eslint-disable-next-line no-console
        console.error('[Chart] failed to load bars', err);
      },
    });
  }
}
