import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  bootstrapCloudCheck,
  bootstrapCpu,
  bootstrapEmojiSmile,
  bootstrapFileEarmarkText,
  bootstrapGraphUpArrow,
  bootstrapLightningCharge,
  bootstrapShieldLock,
} from '@ng-icons/bootstrap-icons';
import { NgIcon, provideIcons } from '@ng-icons/core';

@Component({
  selector: 'app-projects',
  imports: [NgIcon],
  templateUrl: './projects.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      bootstrapLightningCharge,
      bootstrapEmojiSmile,
      bootstrapCpu,
      bootstrapCloudCheck,
      bootstrapShieldLock,
      bootstrapFileEarmarkText,
      bootstrapGraphUpArrow,
    }),
  ],
})
export class ProjectsComponent {}
