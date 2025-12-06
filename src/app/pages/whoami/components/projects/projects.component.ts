import { Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  bootstrapLightningCharge,
  bootstrapEmojiSmile,
  bootstrapCpu,
} from '@ng-icons/bootstrap-icons';

@Component({
  selector: 'app-projects',
  imports: [NgIcon],
  templateUrl: './projects.component.html',
  host: { class: 'block' },
  viewProviders: [
    provideIcons({
      bootstrapLightningCharge,
      bootstrapEmojiSmile,
      bootstrapCpu,
    }),
  ],
})
export class ProjectsComponent {

}
