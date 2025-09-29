import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';

import { AccountAPIApiService } from '../../api/api/account-api.service';
import { AccountSummaryResponse } from '../../api';
import { Router } from '@angular/router';
import { AccountTransfer } from '../shared/account-transfer/account-transfer';

@Component({
  selector: 'app-account-overview',
  standalone: true,
  imports: [CommonModule, DecimalPipe, CardModule, ButtonModule, PopoverModule, AccountTransfer],
  templateUrl: './account-overview.html',
  styleUrl: './account-overview.scss'
})
export class AccountOverview implements OnInit {
  accounts: AccountSummaryResponse[] = [];
  loading = false;
  error?: string;

  private api = inject(AccountAPIApiService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  ngOnInit(): void {
    this.loading = true;

    this.api.listMyAccounts().subscribe({
      next: (list) => {
        this.accounts = Array.isArray(list) ? list : [];
        this.error = undefined;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load accounts', err);
        this.error = 'Failed to load accounts.';
        this.accounts = [];
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  openAccount(id?: string): void {
    if (!id) {
      console.warn('openAccount called without an id');
      return;
    }
    this.router.navigate(['/accounts', id, 'transactions']);
  }

  stop(event: Event): void {
    event.stopPropagation();
  }

  trackById = (_: number, a: AccountSummaryResponse) => a.id ?? _;
}
