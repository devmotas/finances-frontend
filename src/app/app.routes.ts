import { Routes } from '@angular/router';
import { AppShellComponent } from './layout/app-shell/app-shell.component';

export const routes: Routes = [
  {
    path: '',
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
    ],
  },
];
