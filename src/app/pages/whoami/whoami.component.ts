import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { SummaryComponent } from './components/summary/summary.component';
import { ExperienceComponent } from './components/experience/experience.component';
import { SkillsComponent } from './components/skills/skills.component';
import { ProjectsComponent } from './components/projects/projects.component';
import { EducationComponent } from './components/education/education.component';
import { FooterComponent } from './components/footer/footer.component';

@Component({
  selector: 'app-whoami',
  imports: [
    CommonModule,
    HeaderComponent,
    SummaryComponent,
    ExperienceComponent,
    SkillsComponent,
    ProjectsComponent,
    EducationComponent,
    FooterComponent
  ],
  templateUrl: './whoami.component.html',
  styleUrl: './whoami.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhoamiComponent {}
