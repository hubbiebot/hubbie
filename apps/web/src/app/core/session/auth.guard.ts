import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionFacade } from './session.facade';

export const authGuard: CanActivateFn = () =>
  inject(SessionFacade).isAuthenticated() || inject(Router).parseUrl('/login');
