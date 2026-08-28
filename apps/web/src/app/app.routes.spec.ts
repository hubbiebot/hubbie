import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from './app.routes';

describe('app routes', () => {
  let location: Location;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideLocationMocks()],
    });

    location = TestBed.inject(Location);
    router = TestBed.inject(Router);
  });

  it('redirects an unauthenticated visitor from /app to /login', async () => {
    await router.navigateByUrl('/app');

    expect(location.path()).toBe('/login');
  });
});
