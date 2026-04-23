import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  LOCALE_ID,
  importProvidersFrom,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { authInterceptor } from './core/interceptors/auth.interceptor';
import { apiBaseUrlInterceptor } from './core/interceptors/api-base-url.interceptor';

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

import { APP_LUCIDE_ICONS } from './core/icons/app-lucide-icons';
import { routes } from './app.routes';

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([apiBaseUrlInterceptor, authInterceptor])),
    provideZoneChangeDetection({ eventCoalescing: true }),
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
    provideRouter(routes),
    importProvidersFrom(LucideAngularModule.pick(APP_LUCIDE_ICONS)),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
  ],
};
