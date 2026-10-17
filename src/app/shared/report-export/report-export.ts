import { signal } from '@angular/core';
import { MonthContextService } from '../../core/services/month-context.service';
import { ReportFormat, ReportPeriod, ReportsApiService } from '../../core/services/reports-api.service';
import { ToastService } from '../../core/services/toast.service';
import { httpErrorMessage } from '../../core/utils/http-error.util';
import { trackBusy } from '../../core/utils/track-busy';

const EXPORT_DONE_MESSAGE = 'Relatório exportado.';
const EXPORT_FAILED_MESSAGE = 'Não foi possível exportar o relatório.';
const DEFAULT_PERIOD: ReportPeriod = 'month';

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.click();
  URL.revokeObjectURL(url);
}

export class ReportExport {
  readonly period = signal<ReportPeriod>(DEFAULT_PERIOD);
  readonly isMenuOpen = signal(false);
  readonly isExporting = signal(false);

  constructor(
    private readonly reportsApi: ReportsApiService,
    private readonly monthCtx: MonthContextService,
    private readonly toast: ToastService
  ) {}

  toggleMenu(e: MouseEvent): void {
    e.stopPropagation();
    this.isMenuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  onPeriodChange(e: Event): void {
    this.period.set((e.target as HTMLSelectElement).value as ReportPeriod);
  }

  export(format: ReportFormat): void {
    this.closeMenu();
    const { year, month } = this.monthCtx.selectedMonth();
    this.reportsApi
      .download(format, year, this.period(), month)
      .pipe(trackBusy(this.isExporting))
      .subscribe({
        next: ({ blob, filename }) => {
          saveBlob(blob, filename);
          this.toast.show(EXPORT_DONE_MESSAGE, 'success');
        },
        error: (err: unknown) => this.toast.show(httpErrorMessage(err, EXPORT_FAILED_MESSAGE), 'error'),
      });
  }
}
