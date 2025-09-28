import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DividendTickerHistory } from './dividend-ticker-history';

describe('DividendTickerHistory', () => {
  let component: DividendTickerHistory;
  let fixture: ComponentFixture<DividendTickerHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DividendTickerHistory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DividendTickerHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
