import { Pipe, PipeTransform } from '@angular/core';
import { Transaction } from '../../core/models/finances.models';
import { formatBrl } from '../../core/utils/brl-format';

const LABEL_SEPARATOR = ' ';

@Pipe({ name: 'transactionActionLabel' })
export class TransactionActionLabelPipe implements PipeTransform {
  transform(transaction: Transaction, action: string, categoryName?: string): string {
    const subject = transaction.description.trim() || categoryName;
    return [action, subject, formatBrl(transaction.amount)].filter(Boolean).join(LABEL_SEPARATOR);
  }
}
