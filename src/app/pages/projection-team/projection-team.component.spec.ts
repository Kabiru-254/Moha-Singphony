import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectionTeamComponent } from './projection-team.component';

describe('ProjectionTeamComponent', () => {
  let component: ProjectionTeamComponent;
  let fixture: ComponentFixture<ProjectionTeamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectionTeamComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectionTeamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
