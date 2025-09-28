import { Component, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SliderModule } from 'primeng/slider';
import { SelectModule } from 'primeng/select';
import { AccordionModule } from 'primeng/accordion';
import { InputNumberModule } from 'primeng/inputnumber';
import { MultiSelectModule } from 'primeng/multiselect';

import {
  FinancialsApiService,
  ApiFinancialsSearchApiFinancialsSearchGetRequestParams
} from '../../../api/api/financials.service';

type SectorType = ApiFinancialsSearchApiFinancialsSearchGetRequestParams['sector'];

import { SectorSelector } from '../../shared/sector-selector/sector-selector';
import { RouterModule } from '@angular/router';

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
  selector: 'app-financials-advanced-screener',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    ButtonModule,
    InputTextModule,
    FloatLabelModule,
    CardModule,
    TableModule,
    IconFieldModule,
    InputIconModule,
    SliderModule,
    SelectModule,
    AccordionModule,
    InputNumberModule,
    SectorSelector,
    MultiSelectModule,
    RouterModule,
  ],
  templateUrl: './advanced-screener.html',
  styleUrls: ['./advanced-screener.scss']
})
export class FinancialsAdvancedScreenerComponent {
  // UI state
  loading = signal(false);
  error = signal<string | null>(null);
  result = signal<any | null>(null);
  totalRecords = signal(0);

  // Debounced auto-search
  private searchTimer: any;
  private readonly DEBOUNCE_MS = 500;
  private scheduleSearch(resetPage = true) {
    if (resetPage) this.page = 1;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      void this.handleClick();
    }, this.DEBOUNCE_MS);
  }

  // ---------------- Table Columns (configurable via MultiSelect in caption) ----------------
  // Definition for selectable/renderable columns
  // width and pipe are optional hints for the template (pipe can be 'number' | 'percent' | etc.)
public cols = [
  { field: 'ticker', header: 'Ticker', width: '8rem' },
  { field: 'name', header: 'Name', width: '22rem' },
  { field: 'gics_sector', header: 'Sector', width: '14rem' },
  { field: 'sec_division', header: 'SEC Division', width: '14rem' },
  // valuation / size
  { field: 'market_cap', header: 'Market Cap', pipe: 'number' },
  { field: 'last_close', header: 'Last Close', pipe: 'number' },
  // dividends
  { field: 'dividends_ttm', header: 'Dividends TTM', pipe: 'number' },
  { field: 'dividend_yield', header: 'Dividend Yield %', pipe: 'number' },
  { field: 'dividend_metrics_updated_at', header: 'Div Metrics Updated' },
    // misc
  { field: 'homepage_url', header: 'Homepage' },
  { field: 'description', header: 'Description', width: '36rem' },
  // ratios
  { field: 'pe', header: 'P/E', pipe: 'number' },
  { field: 'pb', header: 'P/B', pipe: 'number' },
  { field: 'ps', header: 'P/S', pipe: 'number' },
  { field: 'operating_margin', header: 'Op Margin', pipe: 'percent' },
  { field: 'net_margin', header: 'Net Margin', pipe: 'percent' },
  // flows & income
  { field: 'revenue_ttm', header: 'Revenue TTM', pipe: 'number' },
  { field: 'net_income_ttm', header: 'Net Income TTM', pipe: 'number' },
  { field: 'fcf_ttm', header: 'FCF TTM', pipe: 'number' },
  { field: 'ebitda_ttm', header: 'EBITDA TTM', pipe: 'number' },
  // shares
  { field: 'shares_out_latest', header: 'Shares Out (Latest)', pipe: 'number' },
  { field: 'shares_diluted_latest', header: 'Diluted Shares (Latest)', pipe: 'number' },
  { field: 'shares_diluted_ttm_sum', header: 'Diluted Shares (TTM Sum)', pipe: 'number' },
  // quality flags
  { field: 'is_profitable_ttm', header: 'Profitable TTM' },
  { field: 'is_cashflow_positive_ttm', header: 'Cashflow + TTM' },
  { field: 'is_dividend_covered_by_eps', header: 'Div Covered by EPS' },
  { field: 'is_dividend_covered_by_fcf', header: 'Div Covered by FCF' },
  // cadence
  { field: 'freq_payments', header: 'Payments/Year' },
  { field: 'freq_confidence', header: 'Freq Confidence', pipe: 'number' },
  // dates
  { field: 'last_ex_date', header: 'Last Ex-Date' },  // your template formats dates
  { field: 'as_of', header: 'As of' },
  { field: 'updated_at', header: 'Updated' },

];

  // The set of columns currently selected for display in the table.
  // Template will bind [columns]="selectedColumns" and the MultiSelect will bind [(ngModel)]="selectedColumns".
  public selectedColumns: { field: string; header: string; width?: string; pipe?: string }[] =
    this.cols.filter(c =>
      ['ticker', 'name', 'gics_sector', 'market_cap', 'dividend_yield', 'pe'].includes(c.field)
    );

  // Row expansion state keyed by dataKey (ticker)
  public expandedRows: { [key: string]: boolean } = {};

  // Whether the Description column is currently selected
  hasDescriptionColumn(): boolean {
    return this.selectedColumns?.some(c => c.field === 'description') ?? false;
  }

  // Optional expansion handlers (no-ops; useful for debugging)
  onRowExpand(_e: any) {}
  onRowCollapse(_e: any) {}

  selectedSector: SectorType = null;
  sectorSelectorComponent?: SectorSelector;

  // ---------------- Market Cap (USD) + Log-like slider (0..100 → $1M..$1T) ----------------
  minMcap: number | null = null;      // exact USD (InputNumber)
  maxMcap: number | null = null;      // exact USD (InputNumber)

  // slider positions (0..100); null means “unset”
  minMcapPos: number | null = null;
  maxMcapPos: number | null = null;

  // slider bounds
  private readonly POS_MIN = 0;
  private readonly POS_MAX = 100;

  // mapping bounds: 1,000,000 (1M) → 1,000,000,000,000 (1T)
  private readonly USD_MIN = 1_000_000;
  private readonly USD_MAX = 1_000_000_000_000;

  private clampPos(v: number | null): number | null {
    if (v == null || Number.isNaN(v)) return null;
    if (v < this.POS_MIN) return this.POS_MIN;
    if (v > this.POS_MAX) return this.POS_MAX;
    return Math.round(v); // whole-number positions feel better
  }

  // Map slider→USD (exponential interpolation)
  private sliderToUsd(pos: number | null): number | null {
    if (pos == null || Number.isNaN(pos)) return null;
    const r = pos / this.POS_MAX;
    const usd = this.USD_MIN * Math.pow(this.USD_MAX / this.USD_MIN, r);
    // round to nearest $1,000 for nicer numbers
    return Math.max(this.USD_MIN, Math.round(usd / 1_000) * 1_000);
  }

  // Map USD→slider position
  private usdToSlider(usd: number | null): number | null {
    if (usd == null || usd <= 0) return null;
    const clamped = Math.min(Math.max(usd, this.USD_MIN), this.USD_MAX);
    const r = Math.log(clamped / this.USD_MIN) / Math.log(this.USD_MAX / this.USD_MIN);
    return this.clampPos(r * this.POS_MAX);
  }

  // InputNumber -> Slider
  onMinMcapInputChange(v: number | null) {
    this.minMcap = v ?? null;
    this.minMcapPos = this.usdToSlider(this.minMcap);
    this.scheduleSearch();
  }
  onMaxMcapInputChange(v: number | null) {
    this.maxMcap = v ?? null;
    this.maxMcapPos = this.usdToSlider(this.maxMcap);
    this.scheduleSearch();
  }

  // Slider -> InputNumber
  onMinMcapSliderChange(pos: number | null) {
    this.minMcapPos = this.clampPos(pos);
    this.minMcap = this.sliderToUsd(this.minMcapPos);
    this.scheduleSearch();
  }
  onMaxMcapSliderChange(pos: number | null) {
    this.maxMcapPos = this.clampPos(pos);
    this.maxMcap = this.sliderToUsd(this.maxMcapPos);
    this.scheduleSearch();
  }

  // Backwards-compatible wrappers (used in template)
  syncMinMcapFromInput(value: number | null) { this.onMinMcapInputChange(value); }
  syncMaxMcapFromInput(value: number | null) { this.onMaxMcapInputChange(value); }
  syncMinMcapFromSlider(value: number | null) { this.onMinMcapSliderChange(value); }
  syncMaxMcapFromSlider(value: number | null) { this.onMaxMcapSliderChange(value); }

  // Initialize slider positions from current USD values
  private syncMcapSlidersFromInputs() {
    this.minMcapPos = this.usdToSlider(this.minMcap);
    this.maxMcapPos = this.usdToSlider(this.maxMcap);
  }

  // ---------------- Other filters ----------------
  private _minPe: number | null = null;
  get minPe(): number | null { return this._minPe; }
  set minPe(v: number | null) { this._minPe = v ?? null; this.scheduleSearch(); }

  private _maxPe: number | null = null;
  get maxPe(): number | null { return this._maxPe; }
  set maxPe(v: number | null) { this._maxPe = v ?? null; this.scheduleSearch(); }

  private _minPb: number | null = null;
  get minPb(): number | null { return this._minPb; }
  set minPb(v: number | null) { this._minPb = v ?? null; this.scheduleSearch(); }

  private _maxPb: number | null = null;
  get maxPb(): number | null { return this._maxPb; }
  set maxPb(v: number | null) { this._maxPb = v ?? null; this.scheduleSearch(); }

  private _minPs: number | null = null;
  get minPs(): number | null { return this._minPs; }
  set minPs(v: number | null) { this._minPs = v ?? null; this.scheduleSearch(); }

  private _maxPs: number | null = null;
  get maxPs(): number | null { return this._maxPs; }
  set maxPs(v: number | null) { this._maxPs = v ?? null; this.scheduleSearch(); }

  private _minYield: number | null = 5;
  get minYield(): number | null { return this._minYield; }
  set minYield(v: number | null) { this._minYield = v ?? null; this.scheduleSearch(); }

  private _maxYield: number | null = 10;
  get maxYield(): number | null { return this._maxYield; }
  set maxYield(v: number | null) { this._maxYield = v ?? null; this.scheduleSearch(); }

  private _maxPayoutRatio: number | null = null;
  get maxPayoutRatio(): number | null { return this._maxPayoutRatio; }
  set maxPayoutRatio(v: number | null) { this._maxPayoutRatio = v ?? null; this.scheduleSearch(); }

  // Frequency (UI)
  private _freq: number | null = null;
  get freq(): number | null { return this._freq; }
  set freq(v: number | null) { this._freq = v ?? null; this.scheduleSearch(); }

  // Frequency options and label
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
  get freqLabel(): string {
    if (this.freq == null) return 'Any frequency';
    return this.frequencyOptions.find(o => o.value === this.freq)?.label ?? String(this.freq);
  }
  private isValidFrequency(value: number | null | undefined): boolean {
    if (value == null) return true;
    return ALLOWED_FREQUENCIES.includes(value);
  }
  setFrequency(value: number | null): void {
    if (value === null) { this.freq = null; return; }
    if (!this.isValidFrequency(value)) { this.error.set('Invalid frequency selected.'); return; }
    this.freq = value;
  }

  onSectorPicked(sector: string) {
    this.selectedSector = (sector as unknown) as SectorType;
    this.scheduleSearch();
  }

  // Pagination
  page = 1;
  pageSize = 10;

  // Service
  private api = inject(FinancialsApiService);

  constructor(private svc: FinancialsApiService) {
    const platformId = inject(PLATFORM_ID);
    const origin = isPlatformServer(platformId) ? 'SSR' : isPlatformBrowser(platformId) ? 'BROWSER' : 'UNKNOWN';
    console.log(`[${origin}] [financials api] basePath =`, (svc as any)['configuration']?.basePath);
    this.syncMcapSlidersFromInputs();
  }

  onSectorCleared() {
    this.selectedSector = null;
    this.scheduleSearch();
  }

  clearScreener(): void {
    this.minMcap = null;
    this.maxMcap = null;
    this.minMcapPos = null;
    this.maxMcapPos = null;

    this.minPe = null; this.maxPe = null;
    this.minPb = null; this.maxPb = null;
    this.minPs = null; this.maxPs = null;

    this.minYield = 5; this.maxYield = 10;
    this.maxPayoutRatio = null;

    this.freq = null;

    this.selectedSector = null;
    if (this.sectorSelectorComponent) {
      this.sectorSelectorComponent.handleClear();
    }

    this.page = 1;
    this.result.set(null);
    this.totalRecords.set(0);
    this.error.set(null);
    this.scheduleSearch();
  }

  onPage(event: any) {
    const newPageSize = event?.rows ?? this.pageSize;
    const newPageIndex = event?.page ?? (event?.first != null ? Math.floor(event.first / newPageSize) : 0);
    const newPage = newPageIndex + 1;

    const changed = newPage !== this.page || newPageSize !== this.pageSize;
    this.page = newPage;
    this.pageSize = newPageSize;
    if (changed) void this.handleClick();
  }

  async handleClick() {
    this.error.set(null);
    this.loading.set(true);
    try {
      if (!this.isValidFrequency(this.freq)) {
        this.error.set('Invalid frequency value. Choose one of: 0, 1, 2, 4, 12, 24, 52 or Any.');
        this.loading.set(false);
        return;
      }

      const params: ApiFinancialsSearchApiFinancialsSearchGetRequestParams = {
        // Market cap (send exact USD values)
        minMcap: this.minMcap ?? undefined,
        maxMcap: this.maxMcap ?? undefined,

        // Multiples
        minPe: this.minPe ?? undefined,
        maxPe: this.maxPe ?? undefined,
        minPb: this.minPb ?? undefined,
        maxPb: this.maxPb ?? undefined,
        minPs: this.minPs ?? undefined,
        maxPs: this.maxPs ?? undefined,

        // Dividend yield (%)
        minDividendYield: this.minYield ?? undefined,
        maxDividendYield: this.maxYield ?? undefined,

        // Payout ratio (EPS-based)
        maxPayoutRatio: this.maxPayoutRatio ?? undefined,

        // Frequency
        frequency: this.freq ?? undefined,

        sector: this.selectedSector ?? undefined,

        // Paging
        page: this.page,
        pageSize: this.pageSize
      };

      const res = await this.api.apiFinancialsSearchApiFinancialsSearchGet(params).toPromise();
      this.result.set(res);
      this.totalRecords.set(Number((res as any)?.total ?? 0));
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.loading.set(false);
    }
  }
}