import { Routes } from '@angular/router';
import { authGuard } from './core/session/auth.guard';
import { AuthorizedEmptyPage } from './features/empty/authorized-empty.page';
import { LoginPage } from './features/login/login.page';

export const routes: Routes = [
  { path: 'login', component: LoginPage },
  { path: 'change-initial-credentials', component: LoginPage },
  { path: 'app', component: AuthorizedEmptyPage, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
];
