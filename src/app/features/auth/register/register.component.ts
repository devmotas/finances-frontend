import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-register',
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly passwordVisible = signal(false);
  readonly confirmPasswordVisible = signal(false);

  togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible.update((v) => !v);
  }

  onSubmit(
    event: Event,
    name: string,
    email: string,
    password: string,
    confirmPassword: string
  ): void {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      this.toast.show('Preencha todos os campos para continuar.', 'info');
      return;
    }

    if (password !== confirmPassword) {
      this.toast.show('As senhas não conferem.', 'info');
      return;
    }

    this.toast.show('Cadastro realizado com sucesso. Faça login para entrar.', 'success');
    this.router.navigateByUrl('/login');
  }
}
