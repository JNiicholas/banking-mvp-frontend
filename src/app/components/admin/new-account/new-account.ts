import { Component, ChangeDetectorRef, ChangeDetectionStrategy, OnInit, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

// PrimeNG
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';

// OpenAPI-generated service & models
import { CustomerAPIApiService } from '../../../api/api/customer-api.service';
import { CreateAccountRequest, AccountResponse } from '../../../api';
import { Router } from '@angular/router';

@Component({
  selector: 'app-new-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, ButtonModule, MessageModule, CardModule],
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
}
