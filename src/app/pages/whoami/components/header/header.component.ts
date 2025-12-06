import { Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  bootstrapGeoAlt,
  bootstrapEnvelope,
  bootstrapTelephone,
  bootstrapLinkedin,
  bootstrapGithub,
} from '@ng-icons/bootstrap-icons';

@Component({
  selector: 'app-header',
  imports: [NgIcon],
  templateUrl: './header.component.html',
  host: { class: 'block' },
  viewProviders: [
    provideIcons({
      bootstrapGeoAlt,
      bootstrapEnvelope,
      bootstrapTelephone,
      bootstrapLinkedin,
      bootstrapGithub,
    }),
  ],
})
export class HeaderComponent {

}
