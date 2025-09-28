import { Component, ViewChild, OnInit, AfterViewInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { TickerAutocomplete, TickerOption } from '../../components/shared/ticker-autocomplete/ticker-autocomplete';
import { Chart } from '../../components/shared/chart/chart';
import { News } from '../../components/shared/news/news';
import { DividendTickerHistory } from '../../components/dividends/dividend-ticker-history/dividend-ticker-history';
import { DividendTickerYearlyHistory } from '../../components/dividends/dividend-ticker-yearly-history/dividend-ticker-yearly-history';

@Component({
  selector: 'app-ticker-info',
  imports: [CommonModule, FormsModule, RouterModule, TickerAutocomplete, Chart, News, DividendTickerHistory, DividendTickerYearlyHistory],
  templateUrl: './ticker-info.html',
  styleUrl: './ticker-info.scss'
})
export class TickerInfo implements OnInit, AfterViewInit {
  @ViewChild(TickerAutocomplete) auto?: TickerAutocomplete;

  private route = inject(ActivatedRoute);
  private router = inject(Router);

  currentTicker = signal<string | null>(null);
  // Chart theme (bound to <app-chart [theme]> and toggled by the button in the template)
  theme: 'light' | 'dark' = 'dark';

  ngOnInit(): void {
    const t = this.route.snapshot.paramMap.get('ticker');
    if (t && t.trim()) {
      this.currentTicker.set(t.toUpperCase());
    }
  }

  ngAfterViewInit(): void {
    // Prefill the autocomplete if we have a ticker from the route
    const t = this.currentTicker();
    if (t && this.auto) {
      // You can just set a string; your TickerAutocomplete supports string or object
      this.auto.selected.set(t);
    }
  }

  onPick(opt: TickerOption | string) {
    const ticker = typeof opt === 'string' ? opt : opt?.ticker;
    if (!ticker) return;
    this.currentTicker.set(ticker.toUpperCase());

    // Ensure the URL reflects the selected ticker
    this.router.navigate(['/ticker-info', ticker.toUpperCase()]);
  }

  onClear() {
    this.currentTicker.set(null);
    this.auto?.handleClear();
    // Optional: navigate back to the base route without a ticker
    this.router.navigate(['/ticker-info']);
  }
}
