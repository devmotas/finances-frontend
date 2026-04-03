import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly passwordVisible = signal(false);

  togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }

  onSubmit(event: Event, email: string, password: string): void {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      this.toast.show('Preencha e-mail e senha para continuar.', 'info');
      return;
    }

    this.auth.login(email.trim());
    this.toast.show('Login realizado com sucesso.', 'success');
    this.router.navigateByUrl('/app/visao-geral');
  }
}
