import { Routes } from '@angular/router';
import { AppShellComponent } from './layout/app-shell/app-shell.component';
import { authGuard } from './core/guards/auth.guard';
import { loginPageGuard } from './core/guards/login-page.guard';

const APP_NAME = 'Minhas Finanças';

function pageTitle(screen: string): string {
  return `${screen} · ${APP_NAME}`;
}

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    title: pageTitle('Entrar'),
    canActivate: [loginPageGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'cadastro',
    title: pageTitle('Criar cadastro'),
    canActivate: [loginPageGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    component: AppShellComponent,
    children: [
      { path: '', redirectTo: 'visao-geral', pathMatch: 'full' },
      {
        path: 'visao-geral',
        title: pageTitle('Visão Geral'),
        loadChildren: () =>
          import('./shared/charts/chart-routes').then((m) =>
            m.chartRoutes(() =>
              import('./features/overview/overview.component').then((c) => c.OverviewComponent)
            )
          ),
      },
      {
        path: 'entradas',
        title: pageTitle('Entradas'),
        loadComponent: () =>
          import('./features/incomes/incomes.component').then((m) => m.IncomesComponent),
      },
      {
        path: 'saidas',
        title: pageTitle('Saídas'),
        loadComponent: () =>
          import('./features/expenses/expenses.component').then((m) => m.ExpensesComponent),
      },
      {
        path: 'investimentos',
        title: pageTitle('Investimentos'),
        loadChildren: () =>
          import('./shared/charts/chart-routes').then((m) =>
            m.chartRoutes(() =>
              import('./features/investments/investments.component').then((c) => c.InvestmentsComponent)
            )
          ),
      },
      {
        path: 'reserva-emergencia',
        title: pageTitle('Reserva de emergência'),
        loadComponent: () =>
          import('./features/emergency-fund/emergency-fund.component').then(
            (m) => m.EmergencyFundComponent
          ),
      },
      {
        path: 'configuracoes',
        title: pageTitle('Configurações'),
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
