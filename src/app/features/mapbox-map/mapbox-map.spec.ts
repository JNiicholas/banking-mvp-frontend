import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapboxMap } from './mapbox-map';

describe('MapboxMap', () => {
  let component: MapboxMap;
  let fixture: ComponentFixture<MapboxMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapboxMap]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapboxMap);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
