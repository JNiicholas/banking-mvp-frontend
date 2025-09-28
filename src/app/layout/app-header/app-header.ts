import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MegaMenuModule } from 'primeng/megamenu';
import { MegaMenuItem, MenuItem } from 'primeng/api';
import { NgIf } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';

// if your login button is a standalone component:
import { LoginButtonComponent } from '../../auth/login-button/login-button';
import { AuthService } from '../../services/auth';
//  imports: [MegaMenuModule, ButtonModule, NgIf, LoginButtonComponent],

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MegaMenuModule, ButtonModule, NgIf, LoginButtonComponent],
  templateUrl: './app-header.html',
  styleUrls: ['./app-header.scss']
})
export class AppHeaderComponent implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthService);

  items: MegaMenuItem[] = []; // <-- use MegaMenuItem[]

   goHome(): void {
    this.router.navigateByUrl('/');
  }

  ngOnInit(): void {
    this.items = [
      {
        label: 'Dividends',
        icon: 'pi pi-percentage',
        visible: this.auth.isLoggedIn(),
        styleClass: 'menu-item-blue',
        // items is MenuItem[][] → array of columns
        items: [
          [
            // Column 1 (a group)
            {
              label: 'Metrics',
              items: [
                { label: 'Yearly History', icon: 'pi pi-history', command: () => this.router.navigate(['/dividends/yearly'], { skipLocationChange: true, replaceUrl: true }) },
                { label: 'Full History', icon: 'pi pi-calendar', command: () => this.router.navigate(['/dividends/full'], { skipLocationChange: true, replaceUrl: true }) },
                { label: 'Yearly Screener (Yield)', icon: 'pi pi-percentage', command: () => this.router.navigate(['/dividends/screen-year'], { skipLocationChange: true, replaceUrl: true }) },
                { label: 'Frequency Screener (TTM-Yield)', icon: 'pi pi-filter', command: () => this.router.navigate(['/dividends/screen-ttm'], { skipLocationChange: true, replaceUrl: true }) },
                { label: 'Date Screener', icon: 'pi pi-clock', command: () => this.router.navigate(['/dividends/screen-dates'], { skipLocationChange: true, replaceUrl: true }) },
           
              ]
            },
            // Still column 1 (another group)
            {
              label: 'Tools',
              items: [
                { label: 'Ticker Lookup', icon: 'pi pi-search', command: () => this.router.navigate(['/ticker-info'], { skipLocationChange: true, replaceUrl: true }) },
                { label: 'Compare', icon: 'pi pi-sliders-h', command: () => this.router.navigate(['/dividends/compare'], { skipLocationChange: true, replaceUrl: true }) }
              ]
            }
          ]
          // Add more columns as additional arrays if needed:
          // ,[ [ { label: 'Col 2 Group', items: [...] } ] ]
        ]
      },
      {
        label: 'Financials',
        icon: 'pi pi-chart-line',
        visible: this.auth.isLoggedIn(),
        styleClass: 'menu-item-blue',
        items: [
          [
            {
              label: 'Snapshots',
              items: [
                { label: 'Snapshot', icon: 'pi pi-clock', command: () => this.router.navigate(['/financials/snapshot'], { skipLocationChange: true, replaceUrl: true }) },
                { label: 'History', icon: 'pi pi-history', command: () => this.router.navigate(['/financials/history'], { skipLocationChange: true, replaceUrl: true }) }
              ]
            },
            {
              label: 'Ratios',
              items: [
                { label: 'P/E, P/B, P/S', icon: 'pi pi-chart-bar', command: () => this.router.navigate(['/financials/ratios'], { skipLocationChange: true, replaceUrl: true }) }
              ]
            },
            {
              label: 'Analysis',
              items: [
                { label: 'AI Analysis', icon: 'fas fa-robot mr-2', command: () => this.router.navigate(['/financials/ai'], { skipLocationChange: true, replaceUrl: true }) }
              ]
            },
            {
              label: 'Screeners',
              items: [
                { label: 'Advanced Screener', icon: 'pi pi-filter', command: () => this.router.navigate(['/financials/screeners/advanced'], { skipLocationChange: true, replaceUrl: true }) }
              ]
            }
          ],
          [
            {
              label: 'Watchlists',
              items: [
                { label: 'My Watchlists', icon: 'pi pi-bookmark', command: () => this.router.navigate(['/watchlists'], { skipLocationChange: true, replaceUrl: true }) },
                { label: 'Create Watchlist', icon: 'pi pi-plus', command: () => this.router.navigate(['/watchlists/new'], { skipLocationChange: true, replaceUrl: true }) }
              ]
            }
          ]
        ]
      },
      {
        label: 'Pricing',
        icon: 'pi pi-calendar',
        styleClass: 'menu-item-blue',
        items: [
          [
            {
              label: 'Plans',
              items: [
                { label: 'Subscriptions', icon: 'pi pi-wallet', command: () => this.router.navigate(['/pricing/subscriptions'], { skipLocationChange: true, replaceUrl: true }) },
                { label: 'Memberships', icon: 'pi pi-users', command: () => this.router.navigate(['/pricing/memberships'], { skipLocationChange: true, replaceUrl: true }) }
              ]
            }
          ]
        ]
      },
      {
        label: 'Docs',
        icon: 'pi pi-external-link',
        styleClass: 'menu-item-blue',
        items: [
          [
            {
              label: 'External',
              items: [
                { label: '3N Data', icon: 'pi pi-external-link', url: 'https://3ndata.dev/', target: '_blank' },
                { label: 'PrimeNG', icon: 'pi pi-external-link', url: 'https://primeng.org', target: '_blank' }
              ]
            }
          ]
        ]
      },
      {
        label: 'Atlas',
        icon: 'pi pi-globe',
        styleClass: 'menu-item-blue',
        items: [
          [
            {
              label: 'Atlas',
              items: [
                {
                  label: 'Asset Atlas',
                  icon: 'pi pi-globe',
                  command: () => this.router.navigate(['/atlas/asset-atlas'], { skipLocationChange: true, replaceUrl: true })
                }
              ]
            }
          ]
        ]
      },
      {
        label: 'Kunde Overblik',
        icon: 'pi pi-user',
        visible: this.auth.hasRealmRole('user'),
        styleClass: 'menu-item-blue',
        items: [
          [
            {
              label: 'Account',
              items: [
                { label: 'Overview', icon: 'pi pi-list', command: () => this.router.navigate(['/customer/overview'], { skipLocationChange: true, replaceUrl: true }) }
              ]
            }
          ]
        ]
      },
      {
        label: 'Admin',
        icon: 'pi pi-cog',
        visible: this.auth.hasRealmRole('admin'),
        styleClass: 'menu-item-blue',
        items: [
          [
            {
              label: 'Actions',
              items: [
                { label: 'Backfill (Status)', icon: 'pi pi-list-check', command: () => this.router.navigate(['/pricing/backfill-status'], { skipLocationChange: true, replaceUrl: true }) },
                { label: 'Trigger Backfill', icon: 'pi pi-play', command: () => this.router.navigate(['/pricing/backfill'], { skipLocationChange: true, replaceUrl: true }) }
              ]
            }
          ]
        ]
      }
    ];
  }
  }
