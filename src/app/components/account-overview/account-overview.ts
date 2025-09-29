import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

import { AccountAPIApiService } from '../../api/api/account-api.service';
import { AccountSummaryResponse } from '../../api';

@Component({
  selector: 'app-account-overview',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './account-overview.html',
  styleUrl: './account-overview.scss'
})
export class AccountOverview implements OnInit {
  accounts: AccountSummaryResponse[] = [];
  loading = false;
  error?: string;

  private api = inject(AccountAPIApiService);
  private cdr = inject(ChangeDetectorRef);

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

  trackById = (_: number, a: AccountSummaryResponse) => a.id ?? _;
}
