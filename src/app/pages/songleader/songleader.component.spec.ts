import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SongleaderComponent } from './songleader.component';

describe('SongleaderComponent', () => {
  let component: SongleaderComponent;
  let fixture: ComponentFixture<SongleaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SongleaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SongleaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
