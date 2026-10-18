import { Route, Routes } from '@angular/router';
import {
  BarController,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { provideCharts } from 'ng2-charts';

const CHART_PROVIDERS = [
  provideCharts({
    registerables: [
      BarController,
      BarElement,
      CategoryScale,
      LinearScale,
      LineController,
      LineElement,
      PointElement,
      Tooltip,
      Legend,
    ],
  }),
];

export function chartRoutes(loadComponent: NonNullable<Route['loadComponent']>): Routes {
  return [{ path: '', providers: CHART_PROVIDERS, loadComponent }];
}
