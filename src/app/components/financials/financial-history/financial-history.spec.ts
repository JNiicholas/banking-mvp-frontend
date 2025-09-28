import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinancialHistory } from './financial-history';

describe('FinancialHistory', () => {
  let component: FinancialHistory;
  let fixture: ComponentFixture<FinancialHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinancialHistory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinancialHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
