import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LoginPage] }).compileComponents();
    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('requires appropriately sized credentials before submit', () => {
    expect(component.form.controls.login.errors?.['required']).toBeTruthy();
    expect(component.form.controls.password.errors?.['required']).toBeTruthy();

    component.form.setValue({ login: 'ab', password: 'short' });

    expect(component.form.controls.login.errors?.['minlength']).toBeTruthy();
    expect(component.form.controls.password.errors?.['minlength']).toBeTruthy();
  });

  it('shows a pending state for a valid submit without sending credentials', () => {
    component.form.setValue({ login: 'admin', password: 'temporary-password' });

    component.submit();
    fixture.detectChanges();

    expect(component.pending()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('button')?.hasAttribute('disabled')).toBe(true);
  });
});
