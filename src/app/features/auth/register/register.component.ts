import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { matchPasswordGroupValidator } from '../../../shared/validators/match-password-group.validator';
import { httpErrorMessage } from '../../../core/utils/http-error.util';

@Component({
  selector: 'app-register',
  imports: [RouterLink, LucideAngularModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly authApi = inject(AuthApiService);
  private readonly fb = inject(FormBuilder);

  readonly passwordVisible = signal(false);
  readonly confirmPasswordVisible = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
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
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const { name, email, password } = this.form.getRawValue();
    this.authApi.register({ name: name.trim(), email: email.trim(), password }).subscribe({
      next: () => {
        this.toast.show('Cadastro realizado com sucesso. Faça login para entrar.', 'success');
        void this.router.navigateByUrl('/login');
      },
      error: (err: unknown) => {
        this.toast.show(httpErrorMessage(err, 'Não foi possível concluir o cadastro.'), 'error');
      },
    });
  }
}
