import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountTransfer } from './account-transfer';

describe('AccountTransfer', () => {
  let component: AccountTransfer;
  let fixture: ComponentFixture<AccountTransfer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountTransfer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountTransfer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
