import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountTransactions } from './account-transactions';

describe('AccountTransactions', () => {
  let component: AccountTransactions;
  let fixture: ComponentFixture<AccountTransactions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountTransactions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountTransactions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
