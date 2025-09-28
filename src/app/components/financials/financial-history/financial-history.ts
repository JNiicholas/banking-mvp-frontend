import { Component, Input, OnDestroy, OnInit, AfterViewInit, ViewChild, inject, signal, ChangeDetectorRef, NgZone } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

// OpenAPI-generated service & models
import { FinancialsSummaryApiService } from '../../../api/api/financials-summary.service';
import { FinancialsTimeseriesResponse } from '../../../api';
import { Periodicity } from '../../../api';

import { TickerAutocomplete, TickerOption } from '../../shared/ticker-autocomplete/ticker-autocomplete';

@Component({
  selector: 'app-financial-history',
  standalone: true,
  imports: [CommonModule, FormsModule, ChartModule, ToggleButtonModule, TickerAutocomplete],
  templateUrl: './financial-history.html',
  styleUrl: './financial-history.scss'
})
export class FinancialHistory implements OnInit, OnDestroy, AfterViewInit {
  // Allow parent route/component to pass a ticker directly
  @Input() ticker?: string;

  @ViewChild(TickerAutocomplete) auto?: TickerAutocomplete;

  // Also keep a local selected ticker state for autocomplete
  selectedTicker = signal<string | null>(null);

  revenueChartData: any;
  netIncomeChartData: any;
  dividendChartData: any;
  chartOptions: any;
  /**
   * A registry of all chart datasets keyed by a canonical name, e.g.:
   *  - "income.revenues"
   *  - "income.net_income_loss"
   *  - "balance.assets"
   *  - "cashflow.net_cash_flow_from_operating_activities"
   *  - "ratios.gross_margin" ... etc.
   */
  allCharts: Record<string, any> = {};
  // Toggle state: false => quarterly (default), true => annual
  checked = false;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(FinancialsSummaryApiService);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);
  private sub?: Subscription;

  constructor() {
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#495057' }
        }
      },
      scales: {
        x: { ticks: { color: '#495057' }, grid: { color: '#ebedef' } },
        y: { type: 'linear', display: true, position: 'left', ticks: { color: '#495057' }, grid: { color: '#ebedef' } },
        y1: { type: 'linear', display: true, position: 'right', ticks: { color: '#495057' }, grid: { drawOnChartArea: false } }
      }
    };
  }

  ngOnInit(): void {
    // priority: @Input ticker > route param > none
    const inputTicker = this.ticker?.toUpperCase();
    if (inputTicker) {
      this.selectedTicker.set(inputTicker);
      this.loadTimeseries(inputTicker);
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
        this.loadTimeseries(t);
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
        this.router.navigate(['/financials/history', ticker]);
      }
      this.loadTimeseries(ticker);
      this.cdr.markForCheck();
    });
  }

  onClear(): void {
    this.selectedTicker.set(null);
    this.auto?.handleClear?.();
    // Optional: navigate without ticker
    this.router.navigate(['/financials/history']);
    // Clear charts
    this.revenueChartData = undefined;
    this.netIncomeChartData = undefined;
    this.dividendChartData = undefined;
  }

  private getSelectedPeriodicity(): Periodicity {
    return this.checked ? Periodicity.annual : Periodicity.quarter;
  }

  onPeriodicityChanged(): void {
    const t = this.selectedTicker();
    if (t) {
      this.loadTimeseries(t);
    }
  }

  private loadTimeseries(ticker: string) {
    this.svc.getFinancialTimeseriesApiFinancialsTickerTimeseriesGet({
      ticker,
      periodicity: this.getSelectedPeriodicity(),
    }).subscribe({
      next: (res: FinancialsTimeseriesResponse) => this.applyTimeseries(res),
      error: (err) => {
        console.error('Failed to load financial timeseries', err);
        this.revenueChartData = undefined;
        this.netIncomeChartData = undefined;
        this.dividendChartData = undefined;
      }
    });
  }

  private applyTimeseries(res: FinancialsTimeseriesResponse) {
    const periods = res?.periods ?? [];

    // Build labels like "2025 Q3" or "2024 FY"
    const labels = periods.map(p => {
      const fy = p.fiscal_year;
      const fp = p.fiscal_period || 'FY';
      return `${fy} ${fp}`;
    });

    const revenue = periods.map(p => p.income?.revenues ?? null);
    const netIncome = periods.map(p => p.income?.net_income_loss ?? null);
    const eps = periods.map(p => p.income?.diluted_earnings_per_share ?? null);

    this.revenueChartData = {
      labels,
      datasets: [
        {
          label: 'Revenue (USD)',
          data: revenue,
          borderColor: '#42A5F5',
          backgroundColor: 'rgba(66,165,245,0.2)',
          fill: true,
          tension: 0.4,
        },
      ],
    };

    this.netIncomeChartData = {
      labels,
      datasets: [
        {
          label: 'Net Income (USD)',
          data: netIncome,
          borderColor: '#66BB6A',
          backgroundColor: 'rgba(102,187,106,0.2)',
          fill: true,
          tension: 0.4,
        },
      ],
    };

    this.dividendChartData = {
      labels,
      datasets: [
        {
          label: 'EPS',
          data: eps,
          borderColor: '#FFA726',
          yAxisID: 'y',
          tension: 0.3,
          fill: false,
        }
        // Later we can add Dividend per Share as a second dataset on y1 when available
      ],
    };

    // ---------- Build full chart registry (all series we have) ----------
    this.allCharts = {};

    const makeLine = (label: string, data: (number | null)[], color: string, fill = false) => ({
      labels,
      datasets: [
        {
          label,
          data,
          borderColor: color,
          backgroundColor: fill ? 'rgba(0,0,0,0.08)' : undefined,
          fill,
          tension: 0.35,
        },
      ],
    });

    const pushIfAny = (key: string, label: string, arr: (number | null)[], color: string, fill = false) => {
      const hasAny = arr.some(v => v !== null);
      if (hasAny) this.allCharts[key] = makeLine(label, arr, color, fill);
    };

    // Income statement series
    pushIfAny('income.revenues', 'Revenue', periods.map(p => p.income?.revenues ?? null), '#1f77b4');
    pushIfAny('income.cost_of_revenue', 'Cost of Revenue', periods.map(p => p.income?.cost_of_revenue ?? null), '#aec7e8');
    pushIfAny('income.gross_profit', 'Gross Profit', periods.map(p => p.income?.gross_profit ?? null), '#ff7f0e');
    pushIfAny('income.operating_expenses', 'Operating Expenses', periods.map(p => p.income?.operating_expenses ?? null), '#ffbb78');
    pushIfAny('income.sga', 'SG&A', periods.map(p => p.income?.selling_general_and_administrative_expenses ?? null), '#2ca02c');
    pushIfAny('income.r_and_d', 'R&D', periods.map(p => p.income?.research_and_development ?? null), '#98df8a');
    pushIfAny('income.operating_income_loss', 'Operating Income (EBIT)', periods.map(p => p.income?.operating_income_loss ?? null), '#d62728');
    pushIfAny('income.nonoperating_income_loss', 'Non-operating Income/Loss', periods.map(p => p.income?.nonoperating_income_loss ?? null), '#ff9896');
    pushIfAny('income.income_tax_expense_benefit', 'Income Tax Expense/Benefit', periods.map(p => p.income?.income_tax_expense_benefit ?? null), '#9467bd');
    pushIfAny('income.net_income_loss', 'Net Income', periods.map(p => p.income?.net_income_loss ?? null), '#8c564b');
    pushIfAny('income.basic_eps', 'Basic EPS', periods.map(p => p.income?.basic_earnings_per_share ?? null), '#e377c2');
    pushIfAny('income.diluted_eps', 'Diluted EPS', periods.map(p => p.income?.diluted_earnings_per_share ?? null), '#7f7f7f');
    pushIfAny('income.basic_shares', 'Basic Avg Shares', periods.map(p => p.income?.basic_average_shares ?? null), '#bcbd22');
    pushIfAny('income.diluted_shares', 'Diluted Avg Shares', periods.map(p => p.income?.diluted_average_shares ?? null), '#17becf');

    // Balance sheet series
    pushIfAny('balance.assets', 'Total Assets', periods.map(p => p.balance?.assets ?? null), '#1f77b4');
    pushIfAny('balance.current_assets', 'Current Assets', periods.map(p => p.balance?.current_assets ?? null), '#aec7e8');
    pushIfAny('balance.inventory', 'Inventory', periods.map(p => p.balance?.inventory ?? null), '#ff7f0e');
    pushIfAny('balance.other_current_assets', 'Other Current Assets', periods.map(p => p.balance?.other_current_assets ?? null), '#ffbb78');
    pushIfAny('balance.noncurrent_assets', 'Noncurrent Assets', periods.map(p => p.balance?.noncurrent_assets ?? null), '#2ca02c');
    pushIfAny('balance.fixed_assets', 'Fixed Assets', periods.map(p => p.balance?.fixed_assets ?? null), '#98df8a');
    pushIfAny('balance.other_noncurrent_assets', 'Other Noncurrent Assets', periods.map(p => p.balance?.other_noncurrent_assets ?? null), '#d62728');
    pushIfAny('balance.liabilities', 'Total Liabilities', periods.map(p => p.balance?.liabilities ?? null), '#ff9896');
    pushIfAny('balance.current_liabilities', 'Current Liabilities', periods.map(p => p.balance?.current_liabilities ?? null), '#9467bd');
    pushIfAny('balance.accounts_payable', 'Accounts Payable', periods.map(p => p.balance?.accounts_payable ?? null), '#8c564b');
    pushIfAny('balance.other_current_liabilities', 'Other Current Liabilities', periods.map(p => p.balance?.other_current_liabilities ?? null), '#e377c2');
    pushIfAny('balance.noncurrent_liabilities', 'Noncurrent Liabilities', periods.map(p => p.balance?.noncurrent_liabilities ?? null), '#7f7f7f');
    pushIfAny('balance.long_term_debt', 'Long-term Debt', periods.map(p => p.balance?.long_term_debt ?? null), '#bcbd22');
    pushIfAny('balance.equity', 'Shareholders’ Equity', periods.map(p => p.balance?.equity ?? null), '#17becf');

    // Cash flow series
    pushIfAny('cashflow.ocf', 'Operating Cash Flow', periods.map(p => p.cashflow?.net_cash_flow_from_operating_activities ?? null), '#1f77b4');
    pushIfAny('cashflow.icf', 'Investing Cash Flow', periods.map(p => p.cashflow?.net_cash_flow_from_investing_activities ?? null), '#ff7f0e');
    pushIfAny('cashflow.fcf', 'Financing Cash Flow', periods.map(p => p.cashflow?.net_cash_flow_from_financing_activities ?? null), '#2ca02c');
    pushIfAny('cashflow.net_cash_flow', 'Net Cash Flow', periods.map(p => p.cashflow?.net_cash_flow ?? null), '#d62728');

    // Comprehensive income
    pushIfAny('comprehensive.comprehensive_income_loss', 'Comprehensive Income/Loss', periods.map(p => p.comprehensive?.comprehensive_income_loss ?? null), '#9467bd');
    pushIfAny('comprehensive.oci_parent', 'Other Comprehensive Income (Parent)', periods.map(p => p.comprehensive?.other_comprehensive_income_loss_attributable_to_parent ?? null), '#8c564b');

    // Ratios (if present)
    pushIfAny('ratios.gross_margin', 'Gross Margin', periods.map(p => p.ratios?.gross_margin ?? null), '#1f77b4');
    pushIfAny('ratios.operating_margin', 'Operating Margin', periods.map(p => p.ratios?.operating_margin ?? null), '#ff7f0e');
    pushIfAny('ratios.net_margin', 'Net Margin', periods.map(p => p.ratios?.net_margin ?? null), '#2ca02c');
    pushIfAny('ratios.current_ratio', 'Current Ratio', periods.map(p => p.ratios?.current_ratio ?? null), '#d62728');
    pushIfAny('ratios.quick_ratio', 'Quick Ratio', periods.map(p => p.ratios?.quick_ratio ?? null), '#9467bd');
    pushIfAny('ratios.debt_to_equity', 'Debt to Equity', periods.map(p => p.ratios?.debt_to_equity ?? null), '#8c564b');
    pushIfAny('ratios.return_on_assets', 'Return on Assets', periods.map(p => p.ratios?.return_on_assets ?? null), '#e377c2');
    pushIfAny('ratios.return_on_equity', 'Return on Equity', periods.map(p => p.ratios?.return_on_equity ?? null), '#7f7f7f');
    pushIfAny('ratios.revenue_yoy', 'Revenue YoY', periods.map(p => p.ratios?.revenue_yoy ?? null), '#bcbd22');
    pushIfAny('ratios.eps_yoy', 'EPS YoY', periods.map(p => p.ratios?.eps_yoy ?? null), '#17becf');
    pushIfAny('ratios.ocf_margin', 'OCF Margin', periods.map(p => p.ratios?.ocf_margin ?? null), '#aec7e8');
    pushIfAny('ratios.free_cash_flow', 'Free Cash Flow', periods.map(p => p.ratios?.free_cash_flow ?? null), '#ffbb78');
    this.cdr.detectChanges();
  }
}