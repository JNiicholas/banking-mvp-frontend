import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountAPIApiService, DepositRequestParams, WithdrawRequestParams } from '../../../api/api/account-api.service';
import { AccountResponse} from '../../../api';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-account-transfer',
  standalone: true,
  imports: [CommonModule, ButtonModule, PopoverModule, InputTextModule, InputNumberModule, FormsModule],
  templateUrl: './account-transfer.html',
  styleUrl: './account-transfer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountTransfer {
  /** Account id to operate on (required) */
  @Input({ required: true }) accountId!: string;

  /** Notify parent so it can refresh balances/transactions */
  @Output() completed = new EventEmitter<void>();

  /** Overlay visibility */
  visible = false;

  /** User-entered amount. Positive => deposit, Negative => withdraw */
  amount: number | null = null;

  submitting = false;
  error?: string;
  readonly isNaN = Number.isNaN;

  private api = inject(AccountAPIApiService);
  private cdr = inject(ChangeDetectorRef);

  /** True if current amount is a deposit */
  get isDeposit(): boolean {
    return (this.amount ?? 0) > 0;
  }

  /** Human-friendly action label reflecting sign */
  get actionLabel(): string {
    const a = this.amount ?? 0;
    if (a > 0) return `You are about to deposit €${a.toFixed(2)}`;
    if (a < 0) return `You are about to withdraw €${Math.abs(a).toFixed(2)}`;
    return 'Enter an amount to proceed';
  }

  open(): void {
    this.error = undefined;
    this.visible = true;
    this.cdr.markForCheck();
  }

  cancel(): void {
    this.visible = false;
    this.amount = null;
    this.submitting = false;
    this.error = undefined;
    this.cdr.markForCheck();
  }

  stop(event: Event): void {
    event.stopPropagation();
  }

  confirm(): void {
    this.error = undefined;

    if (!this.accountId) {
      this.error = 'Missing account id.';
      this.cdr.markForCheck();
      return;
    }

    const value = Number(this.amount);
    if (!isFinite(value) || value === 0) {
      this.error = 'Please enter a non-zero number (positive to deposit, negative to withdraw).';
      this.cdr.markForCheck();
      return;
    }

    this.submitting = true;
    this.cdr.markForCheck();

    if (value > 0) {
      const params: DepositRequestParams = {
        id: this.accountId,
        amountRequest: { amount: value },
      };
      this.api.deposit(params).subscribe({
        next: (_res: AccountResponse) => this.finishSuccess(),
        error: (err) => this.finishError(err),
      });
    } else {
      const params: WithdrawRequestParams = {
        id: this.accountId,
        amountRequest: { amount: Math.abs(value) },
      };
      this.api.withdraw(params).subscribe({
        next: (_res: AccountResponse) => this.finishSuccess(),
        error: (err) => this.finishError(err),
      });
    }
  }

  private finishSuccess(): void {
    this.submitting = false;
    this.visible = false;
    this.amount = null;
    this.error = undefined;
    this.cdr.markForCheck();
    this.completed.emit();
  }

  private finishError(err: unknown): void {
    console.error('Transfer failed', err);
    this.submitting = false;
    this.error = 'Transfer failed. Please try again.';
    this.cdr.markForCheck();
  }
}
