import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { RouterModule } from '@angular/router';
import { Location } from '@angular/common';

import { AccountAPIApiService } from '../../api/api/account-api.service';
import { TransactionResponse } from '../../api';

@Component({
  selector: 'app-account-transactions',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, CardModule, ButtonModule, PopoverModule, RouterModule],
  templateUrl: './account-transactions.html',
  styleUrl: './account-transactions.scss'
})

export class AccountTransactions implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private api = inject(AccountAPIApiService);
  private cdr = inject(ChangeDetectorRef);
  private destroyed$ = new Subject<void>();

  accountId?: string;

  loading = false;
  error?: string;
  transactions: TransactionResponse[] = [];
 
  constructor(private location: Location) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntil(this.destroyed$))
      .subscribe((pm: ParamMap) => {
        const id = pm.get('id');
        if (!id) {
          this.error = 'Missing account id in route.';
          this.transactions = [];
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        this.accountId = id;
        this.loading = true;
        this.error = undefined;
        this.cdr.markForCheck(); // show spinner immediately
        this.fetchLastTransactions(id, 10);
      });
  }

  private fetchLastTransactions(id: string, limit = 10): void {
    this.api.lastTransactions({ id, limit })
      .pipe(takeUntil(this.destroyed$))
      .subscribe({
        next: (list: TransactionResponse[]) => {
          this.transactions = Array.isArray(list) ? list : [];
          this.loading = false;
          this.error = undefined;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Failed to load last transactions', err);
          this.error = 'Failed to load transactions.';
          this.transactions = [];
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  goBack(): void {
    this.location.back();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}