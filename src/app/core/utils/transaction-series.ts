import { Transaction } from '../models/finances.models';

export function isSeriesTransaction(t: Transaction): boolean {
  return t.schedule === 'fixed' && t.recurrenceId != null && t.recurrenceId > 0;
}
