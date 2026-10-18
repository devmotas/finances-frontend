import { Pipe, PipeTransform } from '@angular/core';
import { descriptionWithoutInstallmentPrefix } from '../../core/utils/series-status';

@Pipe({ name: 'transactionDescription' })
export class TransactionDescriptionPipe implements PipeTransform {
  transform(description: string): string {
    return descriptionWithoutInstallmentPrefix(description);
  }
}
