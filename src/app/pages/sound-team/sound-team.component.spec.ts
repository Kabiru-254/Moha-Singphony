import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SoundTeamComponent } from './sound-team.component';

describe('SoundTeamComponent', () => {
  let component: SoundTeamComponent;
  let fixture: ComponentFixture<SoundTeamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SoundTeamComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SoundTeamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
