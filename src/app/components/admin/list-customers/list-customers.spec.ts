import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListAccounts } from './list-customers';

describe('ListAccounts', () => {
  let component: ListAccounts;
  let fixture: ComponentFixture<ListAccounts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListAccounts]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListAccounts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
