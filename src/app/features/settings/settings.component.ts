import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { UserApiService } from '../../core/services/user-api.service';
import { UserProfileService } from '../../core/services/user-profile.service';
import { ToastService } from '../../core/services/toast.service';
import { matchPasswordGroupValidator } from '../../shared/validators/match-password-group.validator';
import { httpErrorMessage } from '../../core/utils/http-error.util';

type SettingsTab = 'prefs' | 'profile';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly userApi = inject(UserApiService);
  private readonly userProfile = inject(UserProfileService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly activeTab = signal<SettingsTab>('prefs');
  readonly initialLoading = signal(true);
  readonly prefsSaving = signal(false);
  readonly profileSaving = signal(false);
  readonly passwordSaving = signal(false);
  readonly passwordVisible = signal(false);
  readonly newPasswordVisible = signal(false);
  readonly confirmPasswordVisible = signal(false);

  readonly prefsForm = this.fb.nonNullable.group({
    defaultRecurrenceMonths: [
      12,
      [Validators.required, Validators.min(1), Validators.max(120)],
    ],
    emergencyFundTargetMonths: [
      6,
      [Validators.required, Validators.min(1), Validators.max(120)],
    ],
  });

  readonly profileForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
  });

  readonly accountEmail = signal('');

  readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(120)]],
      confirmNewPassword: ['', [Validators.required]],
    },
    { validators: [matchPasswordGroupValidator('newPassword', 'confirmNewPassword')] }
  );

  constructor() {
    this.userApi.getMe().subscribe({
      next: (u) => {
        const m = u.defaultRecurrenceMonths ?? 12;
        const e = u.emergencyFundTargetMonths ?? 6;
        this.prefsForm.patchValue({
          defaultRecurrenceMonths: m,
          emergencyFundTargetMonths: e,
        });
        this.profileForm.patchValue({
          name: u.name ?? '',
        });
        this.accountEmail.set(u.email ?? '');
        this.initialLoading.set(false);
      },
      error: (err: unknown) => {
        this.initialLoading.set(false);
        this.toast.show(httpErrorMessage(err, 'Não foi possível carregar suas configurações.'), 'error');
      },
    });
  }

  setTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
  }

  savePrefs(): void {
    this.prefsForm.markAllAsTouched();
    if (this.prefsForm.invalid) {
      this.toast.show('Verifique os valores informados.', 'error');
      return;
    }
    const defaultRecurrenceMonths = this.prefsForm.controls.defaultRecurrenceMonths.getRawValue();
    const emergencyFundTargetMonths = this.prefsForm.controls.emergencyFundTargetMonths.getRawValue();
    this.prefsSaving.set(true);
    this.userApi
      .patchMe({ defaultRecurrenceMonths, emergencyFundTargetMonths })
      .subscribe({
        next: (u) => {
          this.prefsSaving.set(false);
          const m = u.defaultRecurrenceMonths ?? defaultRecurrenceMonths;
          const e = u.emergencyFundTargetMonths ?? emergencyFundTargetMonths;
          this.prefsForm.patchValue({ defaultRecurrenceMonths: m, emergencyFundTargetMonths: e });
          this.userProfile.setFromUser(u);
          this.toast.show('Preferências salvas.', 'success');
        },
        error: (err: unknown) => {
          this.prefsSaving.set(false);
          this.toast.show(httpErrorMessage(err, 'Não foi possível salvar.'), 'error');
        },
      });
  }

  saveProfile(): void {
    this.profileForm.markAllAsTouched();
    if (this.profileForm.invalid) {
      this.toast.show('Verifique o nome informado.', 'error');
      return;
    }
    const { name } = this.profileForm.getRawValue();
    this.profileSaving.set(true);
    this.userApi.patchMe({ name: name.trim() }).subscribe({
      next: (u) => {
        this.profileSaving.set(false);
        this.profileForm.patchValue({ name: u.name });
        this.accountEmail.set(u.email ?? '');
        this.userProfile.setFromUser(u);
        this.toast.show('Perfil atualizado.', 'success');
      },
      error: (err: unknown) => {
        this.profileSaving.set(false);
        this.toast.show(httpErrorMessage(err, 'Não foi possível atualizar o perfil.'), 'error');
      },
    });
  }

  savePassword(): void {
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid) {
      this.toast.show('Verifique as senhas informadas.', 'error');
      return;
    }
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.passwordSaving.set(true);
    this.userApi.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.passwordSaving.set(false);
        this.passwordForm.reset();
        this.auth.logout();
        this.toast.show('Senha alterada. Faça login novamente com a nova senha.', 'success');
        void this.router.navigateByUrl('/login');
      },
      error: (err: unknown) => {
        this.passwordSaving.set(false);
        this.toast.show(httpErrorMessage(err, 'Não foi possível alterar a senha.'), 'error');
      },
    });
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }

  toggleNewPasswordVisibility(): void {
    this.newPasswordVisible.update((v) => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible.update((v) => !v);
  }
}
