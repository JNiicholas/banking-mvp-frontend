import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DividendScreenerDates } from './dividend-screener-dates';

describe('DividendScreenerDates', () => {
  let component: DividendScreenerDates;
  let fixture: ComponentFixture<DividendScreenerDates>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DividendScreenerDates]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DividendScreenerDates);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
