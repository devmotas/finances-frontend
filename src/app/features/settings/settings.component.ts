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
import { VALIDATION_LIMITS } from '../../core/models/validation-limits';
import { trackBusy } from '../../core/utils/track-busy';
import { BusyButtonComponent } from '../../shared/components/busy-button/busy-button.component';
import { BUSY_LABEL } from '../../shared/components/busy-button/busy-labels';

const SETTINGS_FEEDBACK = {
  loadFailed: 'Não foi possível carregar suas configurações.',
  invalidPrefs: 'Verifique os valores informados.',
  prefsSaved: 'Preferências salvas.',
  prefsFailed: 'Não foi possível salvar as preferências.',
  invalidName: 'Verifique o nome informado.',
  profileSaved: 'Perfil atualizado.',
  profileFailed: 'Não foi possível atualizar o perfil.',
  invalidPasswords: 'Verifique as senhas informadas.',
  passwordChanged: 'Senha alterada. Faça login novamente com a nova senha.',
  passwordFailed: 'Não foi possível alterar a senha.',
} as const;

type SettingsTab = 'prefs' | 'profile';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule, LucideAngularModule, BusyButtonComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  private readonly fb = inject(FormBuilder);
  readonly limits = VALIDATION_LIMITS;
  private readonly userApi = inject(UserApiService);
  private readonly userProfile = inject(UserProfileService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly busyLabel = BUSY_LABEL;
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
      [Validators.required, Validators.min(VALIDATION_LIMITS.monthsMin), Validators.max(VALIDATION_LIMITS.monthsMax)],
    ],
    emergencyFundTargetMonths: [
      6,
      [Validators.required, Validators.min(VALIDATION_LIMITS.monthsMin), Validators.max(VALIDATION_LIMITS.monthsMax)],
    ],
  });

  readonly profileForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(VALIDATION_LIMITS.nameMin), Validators.maxLength(VALIDATION_LIMITS.nameMax)]],
  });

  readonly accountEmail = signal('');

  readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(VALIDATION_LIMITS.passwordMin), Validators.maxLength(VALIDATION_LIMITS.passwordMax)]],
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
        this.toast.show(httpErrorMessage(err, SETTINGS_FEEDBACK.loadFailed), 'error');
      },
    });
  }

  setTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
  }

  savePrefs(): void {
    this.prefsForm.markAllAsTouched();
    if (this.prefsForm.invalid) {
      this.toast.show(SETTINGS_FEEDBACK.invalidPrefs, 'error');
      return;
    }
    const defaultRecurrenceMonths = this.prefsForm.controls.defaultRecurrenceMonths.getRawValue();
    const emergencyFundTargetMonths = this.prefsForm.controls.emergencyFundTargetMonths.getRawValue();
    this.userApi
      .patchMe({ defaultRecurrenceMonths, emergencyFundTargetMonths })
      .pipe(trackBusy(this.prefsSaving))
      .subscribe({
        next: (u) => {
          const m = u.defaultRecurrenceMonths ?? defaultRecurrenceMonths;
          const e = u.emergencyFundTargetMonths ?? emergencyFundTargetMonths;
          this.prefsForm.patchValue({ defaultRecurrenceMonths: m, emergencyFundTargetMonths: e });
          this.userProfile.setFromUser(u);
          this.toast.show(SETTINGS_FEEDBACK.prefsSaved, 'success');
        },
        error: (err: unknown) => this.showError(err, SETTINGS_FEEDBACK.prefsFailed),
      });
  }

  saveProfile(): void {
    this.profileForm.markAllAsTouched();
    if (this.profileForm.invalid) {
      this.toast.show(SETTINGS_FEEDBACK.invalidName, 'error');
      return;
    }
    const { name } = this.profileForm.getRawValue();
    this.userApi.patchMe({ name: name.trim() }).pipe(trackBusy(this.profileSaving)).subscribe({
      next: (u) => {
        this.profileForm.patchValue({ name: u.name });
        this.accountEmail.set(u.email ?? '');
        this.userProfile.setFromUser(u);
        this.toast.show(SETTINGS_FEEDBACK.profileSaved, 'success');
      },
      error: (err: unknown) => this.showError(err, SETTINGS_FEEDBACK.profileFailed),
    });
  }

  savePassword(): void {
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid) {
      this.toast.show(SETTINGS_FEEDBACK.invalidPasswords, 'error');
      return;
    }
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.userApi
      .changePassword({ currentPassword, newPassword })
      .pipe(trackBusy(this.passwordSaving))
      .subscribe({
        next: () => {
          this.passwordForm.reset();
          this.auth.logout();
          this.toast.show(SETTINGS_FEEDBACK.passwordChanged, 'success');
          void this.router.navigateByUrl('/login');
        },
        error: (err: unknown) => this.showError(err, SETTINGS_FEEDBACK.passwordFailed),
      });
  }

  private showError(err: unknown, fallback: string): void {
    this.toast.show(httpErrorMessage(err, fallback), 'error');
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
