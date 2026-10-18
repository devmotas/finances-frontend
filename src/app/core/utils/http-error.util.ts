import { HttpErrorResponse } from '@angular/common/http';

const NO_RESPONSE_STATUS = 0;
const CONNECTION_FAILED_MESSAGE = 'Não foi possível conectar ao servidor.';
const UNCONFIRMED_SAVE_MESSAGE =
  'Não foi possível confirmar o salvamento. Confira a lista antes de tentar de novo.';

export function isLostResponse(err: unknown): boolean {
  return err instanceof HttpErrorResponse && err.status === NO_RESPONSE_STATUS;
}

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
    if (err.status === NO_RESPONSE_STATUS) {
      return CONNECTION_FAILED_MESSAGE;
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

export function saveErrorMessage(err: unknown, fallback: string): string {
  return isLostResponse(err) ? UNCONFIRMED_SAVE_MESSAGE : httpErrorMessage(err, fallback);
}
