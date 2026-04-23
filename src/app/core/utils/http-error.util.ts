import { HttpErrorResponse } from '@angular/common/http';

function validationFieldsMessage(body: Record<string, unknown>): string | null {
  const raw = body['fields'];
  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }
  const parts: string[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const row = item as Record<string, unknown>;
    const field = typeof row['field'] === 'string' ? row['field'] : '';
    const msg = typeof row['message'] === 'string' ? row['message'] : '';
    if (field && msg) {
      parts.push(`${field}: ${msg}`);
    } else if (msg) {
      parts.push(msg);
    }
  }
  if (parts.length === 0) {
    return null;
  }
  const header =
    typeof body['message'] === 'string' && body['message'].trim().length > 0
      ? (body['message'] as string).trim()
      : 'Erro de validação';
  return `${header}: ${parts.join(' · ')}`;
}

export function httpErrorMessage(err: unknown, fallback = 'Algo deu errado.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'Não foi possível conectar ao servidor.';
    }

    const body = err.error as Record<string, unknown> | string | null;
    if (body && typeof body === 'object') {
      const fromFields = validationFieldsMessage(body);
      if (fromFields) {
        return fromFields;
      }
      if (typeof body['message'] === 'string' && body['message'].trim().length > 0) {
        return body['message'] as string;
      }
    }
    if (typeof body === 'string' && body.length > 0) {
      return body;
    }
  }
  return fallback;
}
