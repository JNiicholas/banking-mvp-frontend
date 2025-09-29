import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { RippleModule } from 'primeng/ripple';
import { TagModule } from 'primeng/tag';

import { CustomerAPIApiService } from '../../../api/api/customer-api.service';
import { CustomerResponse } from '../../../api';
import { NewCustomer } from '../new-customer/new-customer';

@Component({
  selector: 'app-list-customers',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, DialogModule, NewCustomer, RippleModule, TagModule],
  templateUrl: './list-customers.html',
  styleUrl: './list-customers.scss'
})
export class ListCustomers implements OnInit {
  customers: CustomerResponse[] = [];
  loading = false;
  error?: string;
  showCreate = false;

  private api = inject(CustomerAPIApiService);
  private cdr = inject(ChangeDetectorRef);

  private reload(): void {
    this.loading = true;
    this.api.list().subscribe({
      next: (res) => {
        this.customers = Array.isArray(res) ? res : [];
        this.error = undefined;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load customers', err);
        this.customers = [];
        this.error = 'Failed to load customers';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  ngOnInit(): void {
    this.reload();
  }

  openCreate(): void {
    this.showCreate = true;
  }

  onCreateCancelled(): void {
    this.showCreate = false;
  }

  onCustomerCreated(c?: CustomerResponse): void {
    // Close dialog and refresh table
    console.log('Customer created, refreshing list', c);
    this.showCreate = false;
    this.reload();
  }

  trackById = (_: number, c: CustomerResponse) => c.id ?? _;
}
