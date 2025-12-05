import { Routes } from '@angular/router';
import { WhoamiPage } from './pages/whoami/whoami.page';

export const routes: Routes = [
  {
    path: '',
    component: WhoamiPage,
    title: 'Whoami | Vinicius Nunes Martins'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
