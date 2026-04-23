import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { httpErrorMessage } from '../../../core/utils/http-error.util';

@Component({
  selector: 'app-login',
  imports: [RouterLink, LucideAngularModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly passwordVisible = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.auth.login(email.trim(), password).subscribe({
      next: () => {
        this.toast.show('Login realizado com sucesso.', 'success');
        void this.router.navigateByUrl('/app/visao-geral');
      },
      error: (err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 401) {
          this.toast.show('E-mail ou senha inválidos.', 'error');
          return;
        }
        this.toast.show(httpErrorMessage(err, 'Não foi possível entrar.'), 'error');
      },
    });
  }
}
