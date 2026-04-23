import { Routes } from '@angular/router';
import { AppShellComponent } from './layout/app-shell/app-shell.component';
import { authGuard } from './core/guards/auth.guard';
import { loginPageGuard } from './core/guards/login-page.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    canActivate: [loginPageGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'cadastro',
    canActivate: [loginPageGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'esqueci-senha',
    canActivate: [loginPageGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent
      ),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    component: AppShellComponent,
    children: [
      { path: '', redirectTo: 'visao-geral', pathMatch: 'full' },
      {
        path: 'visao-geral',
        loadComponent: () =>
          import('./features/overview/overview.component').then((m) => m.OverviewComponent),
      },
      {
        path: 'entradas',
        loadComponent: () =>
          import('./features/incomes/incomes.component').then((m) => m.IncomesComponent),
      },
      {
        path: 'saidas',
        loadComponent: () =>
          import('./features/expenses/expenses.component').then((m) => m.ExpensesComponent),
      },
      {
        path: 'investimentos',
        loadComponent: () =>
          import('./features/investments/investments.component').then((m) => m.InvestmentsComponent),
      },
      {
        path: 'reserva-emergencia',
        loadComponent: () =>
          import('./features/emergency-fund/emergency-fund.component').then(
            (m) => m.EmergencyFundComponent
          ),
      },
      {
        path: 'configuracoes',
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
