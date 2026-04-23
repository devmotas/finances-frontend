import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

export type ReportFormat = 'csv' | 'pdf';
export type ReportPeriod = 'month' | 'quarter' | 'year';

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(header);
  return m?.[1]?.trim() ?? null;
}

@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/reports';

  download(
    format: ReportFormat,
    year: number,
    period: ReportPeriod,
    month: number
  ): Observable<{ blob: Blob; filename: string }> {
    const params = new HttpParams()
      .set('format', format)
      .set('year', String(year))
      .set('month', String(month))
      .set('period', period);
    return this.http
      .get(`${this.base}/export`, {
        params,
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map((resp) => {
          const fromHeader = filenameFromContentDisposition(resp.headers.get('content-disposition'));
          const ext = format === 'pdf' ? 'pdf' : 'csv';
          const fallback = `transacoes-${year}-${String(month).padStart(2, '0')}.${ext}`;
          return { blob: resp.body as Blob, filename: fromHeader ?? fallback };
        })
      );
  }
}
