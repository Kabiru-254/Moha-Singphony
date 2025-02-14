import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SonglistCreationComponent } from './songlist-creation.component';

describe('SonglistCreationComponent', () => {
  let component: SonglistCreationComponent;
  let fixture: ComponentFixture<SonglistCreationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SonglistCreationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SonglistCreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
