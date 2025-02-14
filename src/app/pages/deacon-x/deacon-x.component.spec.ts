import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeaconXComponent } from './deacon-x.component';

describe('DeaconXComponent', () => {
  let component: DeaconXComponent;
  let fixture: ComponentFixture<DeaconXComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeaconXComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeaconXComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
