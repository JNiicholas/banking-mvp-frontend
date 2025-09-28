import { Component, Input, OnDestroy, OnInit, AfterViewInit, ViewChild, inject, signal, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

// OpenAPI-generated service & models
import { FinancialsSummaryApiService } from '../../../api/api/financials-summary.service';
import { FinancialsSummaryResponse } from '../../../api';

import { TickerAutocomplete, TickerOption } from '../../shared/ticker-autocomplete/ticker-autocomplete';

@Component({
  selector: 'app-financial-snapshot',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerModule, TickerAutocomplete],
  templateUrl: './financial-snapshot.html',
  styleUrl: './financial-snapshot.scss'
})
export class FinancialSnapshot implements OnInit, OnDestroy, AfterViewInit {
  // Allow parent route/component to pass a ticker directly
  @Input() ticker?: string;

  @ViewChild(TickerAutocomplete) auto?: TickerAutocomplete;

  // Also keep a local selected ticker state for autocomplete
  selectedTicker = signal<string | null>(null);

  // Raw API response (snapshot)
  summary?: FinancialsSummaryResponse;

  // Date range for summary window (PrimeNG range mode returns [start, end])
  rangeDates: Date[] | null = null;

  private formatYMD(d: Date | null | undefined): string | null {
    if (!d) return null;
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private normalizeRange(range: Date[] | null): { from: string | null, to: string | null } {
    if (!range || range.length === 0) return { from: null, to: null };
    const start = range[0];
    const end = (range.length > 1 && range[1]) ? range[1] : range[0];
    // Ensure from <= to
    const a = start <= end ? start : end;
    const b = start <= end ? end : start;
    return { from: this.formatYMD(a), to: this.formatYMD(b) };
  }

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(FinancialsSummaryApiService);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);
  private sub?: Subscription;

  ngOnInit(): void {
    // Default: last 365 days window
    const today = new Date();
    const lastYear = new Date(today);
    lastYear.setDate(today.getDate() - 365);
    this.rangeDates = [lastYear, today];

    // priority: @Input ticker > route param > none
    const inputTicker = this.ticker?.toUpperCase();
    if (inputTicker) {
      this.selectedTicker.set(inputTicker);
      this.loadSummary(inputTicker);
      return;
    }

    this.sub = this.route.paramMap.subscribe(pm => {
      const t = (pm.get('ticker') || '').toUpperCase();
      if (t) {
        this.selectedTicker.set(t);
        if (this.auto?.selected) {
          // Defer to next macrotask in case the child clears on route change
          setTimeout(() => this.auto?.selected?.set(t), 0);
        }
        this.loadSummary(t);
      }
    });
  }

  ngAfterViewInit(): void {
    const t = this.selectedTicker();
    if (t && this.auto?.selected) {
      this.auto.selected.set(t);
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  /** For the ticker autocomplete component (will be wired in template later) */
  onPick(option: TickerOption) {
    this.zone.run(() => {
      const ticker = (option?.ticker || '').toUpperCase();
      if (!ticker) return;
      const current = this.selectedTicker();
      this.selectedTicker.set(ticker);
      if (this.auto?.selected) {
        setTimeout(() => this.auto?.selected?.set(ticker), 0);
      }
      // Only navigate if different to avoid silent no-op navigations
      if (current !== ticker) {
        this.router.navigate(['/financials/snapshot', ticker]);
      }
      this.loadSummary(ticker);
      this.cdr.markForCheck();
    });
  }

  onRangeChange(): void {
    const t = this.selectedTicker();
    if (t) this.loadSummary(t);
  }

  onClear(): void {
    this.selectedTicker.set(null);
    this.auto?.handleClear?.();
    // Optional: navigate without ticker
    this.router.navigate(['/financials/snapshot']);
    // Clear snapshot
    this.summary = undefined;
  }

  private loadSummary(ticker: string) {
    const { from, to } = this.normalizeRange(this.rangeDates);
    this.svc.getFinancialSummaryApiFinancialsTickerSummaryGet({
      ticker,
      fromDate: from ?? undefined,
      toDate: to ?? undefined,
    }).subscribe({
      next: (res: FinancialsSummaryResponse) => {
        this.summary = res;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load financial summary', err);
        this.summary = undefined;
      }
    });
  }
}
