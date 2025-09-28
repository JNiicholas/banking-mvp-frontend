import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DividendTickerYearlyHistory } from './dividend-ticker-yearly-history';

describe('DividendTickerYearlyHistory', () => {
  let component: DividendTickerYearlyHistory;
  let fixture: ComponentFixture<DividendTickerYearlyHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DividendTickerYearlyHistory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DividendTickerYearlyHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
