import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';

import { CustomerAPIApiService } from '../../../api/api/customer-api.service';
import { CustomerResponse } from '../../../api';

@Component({
  selector: 'app-list-customers',
  standalone: true,
  imports: [CommonModule, TableModule],
  templateUrl: './list-customers.html',
  styleUrl: './list-customers.scss'
})
export class ListAccounts implements OnInit {
  customers: CustomerResponse[] = [];
  loading = false;
  error?: string;

  private api = inject(CustomerAPIApiService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
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

  trackById = (_: number, c: CustomerResponse) => c.id ?? _;
}
