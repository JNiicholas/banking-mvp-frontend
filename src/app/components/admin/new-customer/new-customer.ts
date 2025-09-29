import { Component, ChangeDetectionStrategy, inject, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';

import { CustomerAPIApiService } from '../../../api/api/customer-api.service';
import { CustomerResponse, CreateCustomerRequest } from '../../../api';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-new-customer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, InputTextModule, ButtonModule, FloatLabelModule],
  templateUrl: './new-customer.html',
  styleUrl: './new-customer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewCustomer {
  private fb = inject(FormBuilder);
  private api = inject(CustomerAPIApiService);
  private cdr = inject(ChangeDetectorRef);

  @Input() showCancelButton = false;

  loading = false;
  error?: string;

  @Output('created') createdOut = new EventEmitter<CustomerResponse>();
  @Output('cancelled') cancelledOut = new EventEmitter<void>();

  createdCustomer?: CustomerResponse;

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
  });

  get firstName() { return this.form.get('firstName'); }
  get lastName() { return this.form.get('lastName'); }
  get email() { return this.form.get('email'); }

  create(): void {
    this.error = undefined;
    this.createdCustomer = undefined;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload: CreateCustomerRequest = {
      firstName: this.firstName?.value?.trim() || '',
      lastName: this.lastName?.value?.trim() || '',
      email: this.email?.value?.trim() || '',
    };

    this.loading = true;
    this.api.create({ createCustomerRequest: payload }).subscribe({
      next: (res: CustomerResponse) => {
        this.createdCustomer = res;
        this.createdOut.emit(res);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to create customer', err);
        this.error = 'Failed to create customer.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  cancel(): void {
    this.form.reset();
    this.error = undefined;
    this.createdCustomer = undefined;
    this.cancelledOut.emit();
    this.cdr.markForCheck();
  }
}
