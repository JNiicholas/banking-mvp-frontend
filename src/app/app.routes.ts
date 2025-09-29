import { Routes } from '@angular/router';
import { Example } from './components/example/example';

/*
import { DividendTickerHistory } from './components/dividends/dividend-ticker-history/dividend-ticker-history';
import { DividendTickerYearlyHistory } from './components/dividends/dividend-ticker-yearly-history/dividend-ticker-yearly-history';
import { DividendScreenerYear } from './components/dividends/dividend-screener-year/dividend-screener-year';
import { DividendScreenerTtm } from './components/dividends/dividend-screener-ttm/dividend-screener-ttm';
import { DividendScreenerDates } from './components/dividends/dividend-screener-dates/dividend-screener-dates'; 
import { FinancialsAdvancedScreenerComponent } from './components/financials/advanced-screener/advanced-screener'; 
import { FinancialHistory } from './components/financials/financial-history/financial-history'; 
import { FinancialSnapshot } from './components/financials/financial-snapshot/financial-snapshot';
import { FinancialRatio } from './components/financials/financial-ratio/financial-ratio';
import { McpAgent } from './features/mcp-agent/mcp-agent';

import { TickerInfo } from './pages/ticker-info/ticker-info';
import { Watchlists } from './components/watchlists/watchlists/watchlists';
*/

import { Frontpage } from './pages/frontpage/frontpage';
import { AccountOverview } from './components/account-overview/account-overview';
import { MapboxMapComponent } from './features/mapbox-map/mapbox-map';
import { authGuard } from './guards/auth.guard';
import { AccountTransactions } from './components/account-transactions/account-transactions';

import { ListAccounts } from './components/admin/list-customers/list-customers';
import { NewAccount } from './components/admin/new-account/new-account';



export const routes: Routes = [
//  { path: '', pathMatch: 'full', children: [] },
  { path: '', component: Frontpage },

/*
  { path: 'dividends/full', component: DividendTickerHistory, canActivate: [authGuard] },
  { path: 'dividends/yearly', component: DividendTickerYearlyHistory, canActivate: [authGuard] },
  { path: 'dividends/screen-year', component: DividendScreenerYear, canActivate: [authGuard] },
  { path: 'dividends/screen-ttm', component: DividendScreenerTtm, canActivate: [authGuard] },
  { path: 'dividends/screen-dates', component: DividendScreenerDates, canActivate: [authGuard] },
  { path: 'financials/screeners/advanced', component: FinancialsAdvancedScreenerComponent, canActivate: [authGuard] },
  { path: 'financials/history', component: FinancialHistory, canActivate: [authGuard] },
  { path: 'financials/history/:ticker', component: FinancialHistory, canActivate: [authGuard] },
  { path: 'financials/ai', component: McpAgent, canActivate: [authGuard] },
  { path: 'ticker-info', component: TickerInfo, canActivate: [authGuard] },
  { path: 'ticker-info/:ticker', component: TickerInfo, canActivate: [authGuard] },
  { path: 'financials/snapshot', component: FinancialSnapshot, canActivate: [authGuard] },
  { path: 'financials/snapshot/:ticker', component: FinancialSnapshot, canActivate: [authGuard] },
  { path: 'financials/ratios', component: FinancialRatio, canActivate: [authGuard] },
  { path: 'financials/ratios/:ticker', component: FinancialRatio, canActivate: [authGuard] },
  { path: 'watchlists', component: Watchlists, canActivate: [authGuard] },
  { path: 'watchlists/new', component: Watchlists, canActivate: [authGuard] },
*/

  { path: 'customer/my-accounts', component: AccountOverview, canActivate: [authGuard] },
  { path: 'admin/list-accounts', component: ListAccounts, canActivate: [authGuard] },
  { path: 'admin/accounts/new', component: NewAccount, canActivate: [authGuard] },
  { path: 'accounts/:id/transactions', component: AccountTransactions, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];

///financials/screeners/advanced

///financials/snaphot