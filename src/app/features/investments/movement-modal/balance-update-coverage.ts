import { LastBalanceUpdate } from '../../../core/models/investment-accounts.models';

export function coveredByBalanceUpdate(date: string, update: LastBalanceUpdate | null): boolean {
  return update != null && date !== '' && date < update.date;
}
