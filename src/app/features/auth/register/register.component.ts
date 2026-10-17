import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { matchPasswordGroupValidator } from '../../../shared/validators/match-password-group.validator';
import { httpErrorMessage } from '../../../core/utils/http-error.util';
import { VALIDATION_LIMITS } from '../../../core/models/validation-limits';
import { trackBusy } from '../../../core/utils/track-busy';
import { BusyButtonComponent } from '../../../shared/components/busy-button/busy-button.component';
import { BUSY_LABEL } from '../../../shared/components/busy-button/busy-labels';

const REGISTER_FEEDBACK = {
  success: 'Cadastro realizado com sucesso. Faça login para entrar.',
  failed: 'Não foi possível concluir o cadastro.',
} as const;

@Component({
  selector: 'app-register',
  imports: [RouterLink, LucideAngularModule, ReactiveFormsModule, BusyButtonComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly authApi = inject(AuthApiService);
  private readonly fb = inject(FormBuilder);
  readonly limits = VALIDATION_LIMITS;

  readonly passwordVisible = signal(false);
  readonly confirmPasswordVisible = signal(false);
  readonly isSubmitting = signal(false);
  readonly submittingLabel = BUSY_LABEL.registering;

  readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(VALIDATION_LIMITS.nameMin), Validators.maxLength(VALIDATION_LIMITS.nameMax)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(VALIDATION_LIMITS.passwordMin)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [matchPasswordGroupValidator('password', 'confirmPassword')] }
  );

  togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible.update((v) => !v);
  }

  onSubmit(): void {
    if (this.isSubmitting()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const { name, email, password } = this.form.getRawValue();
    this.authApi
      .register({ name: name.trim(), email: email.trim(), password })
      .pipe(trackBusy(this.isSubmitting))
      .subscribe({
        next: () => {
          this.toast.show(REGISTER_FEEDBACK.success, 'success');
          void this.router.navigateByUrl('/login');
        },
        error: (err: unknown) =>
          this.toast.show(httpErrorMessage(err, REGISTER_FEEDBACK.failed), 'error'),
      });
  }
}
