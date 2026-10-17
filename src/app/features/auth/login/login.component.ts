import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { httpErrorMessage } from '../../../core/utils/http-error.util';
import { trackBusy } from '../../../core/utils/track-busy';
import { BusyButtonComponent } from '../../../shared/components/busy-button/busy-button.component';
import { BUSY_LABEL } from '../../../shared/components/busy-button/busy-labels';

const HTTP_UNAUTHORIZED = 401;

const LOGIN_FEEDBACK = {
  success: 'Login realizado com sucesso.',
  invalidCredentials: 'E-mail ou senha inválidos.',
  failed: 'Não foi possível entrar.',
} as const;

@Component({
  selector: 'app-login',
  imports: [RouterLink, LucideAngularModule, ReactiveFormsModule, BusyButtonComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly passwordVisible = signal(false);
  readonly isSubmitting = signal(false);
  readonly submittingLabel = BUSY_LABEL.signingIn;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }

  onSubmit(): void {
    if (this.isSubmitting()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.auth
      .login(email.trim(), password)
      .pipe(trackBusy(this.isSubmitting))
      .subscribe({
        next: () => {
          this.toast.show(LOGIN_FEEDBACK.success, 'success');
          void this.router.navigateByUrl('/app/visao-geral');
        },
        error: (err: unknown) => this.toast.show(this.loginErrorMessage(err), 'error'),
      });
  }

  private loginErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.status === HTTP_UNAUTHORIZED) {
      return LOGIN_FEEDBACK.invalidCredentials;
    }
    return httpErrorMessage(err, LOGIN_FEEDBACK.failed);
  }
}
