import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../../core/services/toast.service';
import { matchPasswordGroupValidator } from '../../../shared/validators/match-password-group.validator';

const RECOVERY_STORAGE_KEY = 'finances.recovery';

interface RecoveryPayload {
  readonly email: string;
  readonly code: string;
}

@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink, LucideAngularModule, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly step = signal<1 | 2 | 3 | 4>(1);
  readonly emailForRecovery = signal('');
  readonly passwordVisible = signal(false);
  readonly confirmPasswordVisible = signal(false);

  readonly emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly codeForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  readonly newPasswordForm = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [matchPasswordGroupValidator('newPassword', 'confirmPassword')] }
  );

  togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible.update((v) => !v);
  }

  sendCode(): void {
    this.emailForm.markAllAsTouched();
    if (this.emailForm.invalid) {
      return;
    }

    const trimmed = this.emailForm.controls.email.value.trim();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.persistRecovery({ email: trimmed, code });
    this.emailForRecovery.set(trimmed);
    this.toast.show('Enviamos um código de 6 dígitos para o seu e-mail.', 'success');
    this.codeForm.reset();
    this.step.set(2);
  }

  resendCode(): void {
    const email = this.emailForRecovery();
    if (!email) {
      this.toast.show('Informe o e-mail novamente.', 'info');
      this.step.set(1);
      return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.persistRecovery({ email, code });
    this.toast.show('Reenviamos o código para o seu e-mail.', 'success');
  }

  verifyCode(): void {
    this.codeForm.markAllAsTouched();
    if (this.codeForm.invalid) {
      return;
    }

    const raw = sessionStorage.getItem(RECOVERY_STORAGE_KEY);
    if (!raw) {
      this.toast.show('Sessão expirada. Solicite o código novamente.', 'info');
      this.step.set(1);
      return;
    }

    let payload: RecoveryPayload;
    try {
      payload = JSON.parse(raw) as RecoveryPayload;
    } catch {
      sessionStorage.removeItem(RECOVERY_STORAGE_KEY);
      this.toast.show('Sessão inválida. Solicite o código novamente.', 'info');
      this.step.set(1);
      return;
    }

    const entered = this.codeForm.controls.code.value.replace(/\D/g, '');
    if (entered.length !== 6) {
      this.toast.show('Digite o código de 6 dígitos.', 'info');
      return;
    }

    if (entered !== payload.code) {
      this.toast.show('Código incorreto.', 'info');
      return;
    }

    this.newPasswordForm.reset();
    this.step.set(3);
  }

  resetPassword(): void {
    this.newPasswordForm.markAllAsTouched();
    if (this.newPasswordForm.invalid) {
      return;
    }

    sessionStorage.removeItem(RECOVERY_STORAGE_KEY);
    this.toast.show('Senha redefinida com sucesso.', 'success');
    this.step.set(4);
  }

  goToLogin(): void {
    this.router.navigateByUrl('/login');
  }

  backFromCode(): void {
    sessionStorage.removeItem(RECOVERY_STORAGE_KEY);
    this.emailForRecovery.set('');
    this.emailForm.reset();
    this.codeForm.reset();
    this.step.set(1);
  }

  backFromPassword(): void {
    this.newPasswordForm.reset();
    this.step.set(2);
  }

  private persistRecovery(payload: RecoveryPayload): void {
    try {
      sessionStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }
}
