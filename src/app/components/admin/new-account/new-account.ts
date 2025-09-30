import { Component, ChangeDetectorRef, ChangeDetectionStrategy, OnInit, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { AutoCompleteModule } from 'primeng/autocomplete';

// OpenAPI-generated service & models
import { CustomerAPIApiService } from '../../../api/api/customer-api.service';
import { CreateAccountRequest, AccountResponse, CustomerResponse } from '../../../api';
import { Router } from '@angular/router';

@Component({
  selector: 'app-new-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, InputTextModule, ButtonModule, MessageModule, CardModule, AutoCompleteModule],
  templateUrl: './new-account.html',
  styleUrl: './new-account.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewAccount implements OnInit, AfterViewInit {
  private fb = inject(FormBuilder);
  private api = inject(CustomerAPIApiService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  loading = false;
  error?: string;
  created?: AccountResponse;
  createdCustomer?: CustomerResponse;

  // Autocomplete state
  customers: CustomerResponse[] = [];
  suggestions: CustomerResponse[] = [];
  selectedCustomer: CustomerResponse | null = null;

  // Accept a UUID only (simple validator; adjust if you support other id shapes)
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  form = this.fb.group({
    customerId: ['', [Validators.required, Validators.pattern(NewAccount.UUID_REGEX)]],
  });

  get f() { return this.form.controls; }

  ngOnInit(): void {
    // Ensure first render is styled when running zoneless/hydration
    this.cdr.markForCheck();
    this.loadCustomers();
  }

  ngAfterViewInit(): void {
    // One post-view CD pass avoids the "unstyled until interaction" glitch
    this.cdr.detectChanges();
  }

  submit(): void {
    this.error = undefined;
    this.created = undefined;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: CreateAccountRequest = {
      customerId: this.f.customerId.value as any, // generated types are string; backend expects UUID string
    };

    this.loading = true;
    this.api.createAccount({ createAccountRequest: payload }).subscribe({
      next: (res: AccountResponse) => {
        this.created = res;
        if (res?.customerId) {
          this.fetchCustomerDetails(res.customerId);
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to create account', err);
        this.error = 'Failed to create account';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  reset(): void {
    this.form.reset();
    this.error = undefined;
    this.created = undefined;
    this.cdr.markForCheck();
  }

  /** Cancel the form: clear errors/result and reset fields */
  cancel(): void {
    this.reset();
  }

  /** Alias for submit() to match template naming */
  create(): void {
    this.submit();
  }

  /** Navigate to the created account's transactions page */
  goToAccount(id?: string): void {
    if (!id) {
      console.warn('goToAccount called without an id');
      return;
    }
    this.router.navigate(['/accounts', id, 'transactions']);
  }


  /** Load all customers once to power the autocomplete */
  private loadCustomers(): void {
    this.api.list().subscribe({
      next: (res) => {
        this.customers = Array.isArray(res) ? res : [];
        // If a prior selection exists, keep the control in sync
        if (this.selectedCustomer?.id) {
          this.form.patchValue({ customerId: this.selectedCustomer.id });
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load customers for autocomplete', err);
        this.customers = [];
        this.cdr.markForCheck();
      },
    });
  }

  /** Fetch the created account's customer details for display (name/email). */
  private fetchCustomerDetails(id: string): void {
    this.api.getById({ id }).subscribe({
      next: (cust: CustomerResponse) => {
        this.createdCustomer = cust;
        // Keep selectedCustomer in sync so UI can reuse it
        this.selectedCustomer = cust ?? null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to fetch customer by id', err);
        // Non-fatal for the create flow; we just won’t show name/email
        this.createdCustomer = undefined;
        this.cdr.markForCheck();
      },
    });
  }

  /** PrimeNG p-autocomplete completeMethod handler */
  filterCustomers(event: { query: string }): void {
    const q = (event?.query || '').trim().toLowerCase();
    if (!q) {
      this.suggestions = [...this.customers];
    } else {
      this.suggestions = this.customers.filter((c) => {
        const first = (c.firstName || '').toLowerCase();
        const last = (c.lastName || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        return first.includes(q) || last.includes(q) || email.includes(q);
      });
    }
    this.cdr.markForCheck();
  }

  /** When a customer is picked from the autocomplete list */
  onPickCustomer(e: any): void {
    const picked: CustomerResponse | null = e?.value ?? e ?? null;
    this.selectedCustomer = picked;
    const id = picked?.id || '';
    this.form.patchValue({ customerId: id });
    this.cdr.markForCheck();
  }

  /** When the clear button is clicked in the autocomplete */
  onClearCustomer(): void {
    this.selectedCustomer = null;
    this.suggestions = [];
    this.form.patchValue({ customerId: '' });
    this.cdr.markForCheck();
  }
  }