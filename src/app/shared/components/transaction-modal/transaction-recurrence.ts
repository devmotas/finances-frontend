import { Flow, SERIES_KIND } from '../../../core/models/finances.models';
import { RecurrenceCreateDto } from '../../../core/services/recurrence-api.service';

export const RECURRENCE = {
  single: 'single',
  fixed: SERIES_KIND.fixed,
  installment: SERIES_KIND.installment,
} as const;

export type RecurrenceChoice = (typeof RECURRENCE)[keyof typeof RECURRENCE];

export const INSTALLMENTS_MIN = 2;

export interface RecurrenceOption {
  readonly value: RecurrenceChoice;
  readonly label: string;
  readonly hint: string;
}

const SINGLE_OPTION: RecurrenceOption = {
  value: RECURRENCE.single,
  label: 'Só neste mês',
  hint: 'Avulso: vale só para o mês desta data.',
};

const FIXED_OPTION: RecurrenceOption = {
  value: RECURRENCE.fixed,
  label: 'Fixo — todo mês, sem data para acabar',
  hint: 'Repete todo mês até você encerrar a série (excluir “Este e os próximos”).',
};

const INSTALLMENT_OPTION: RecurrenceOption = {
  value: RECURRENCE.installment,
  label: 'Compra parcelada',
  hint: 'Lança todas as parcelas de uma vez; a série termina sozinha na última.',
};

const EXPENSE_FLOW: Flow = 'expense';

export function recurrenceOptionsFor(flow: Flow): readonly RecurrenceOption[] {
  return flow === EXPENSE_FLOW
    ? [SINGLE_OPTION, FIXED_OPTION, INSTALLMENT_OPTION]
    : [SINGLE_OPTION, FIXED_OPTION];
}

export interface SeriesFormValue {
  readonly choice: RecurrenceChoice;
  readonly categoryId: number;
  readonly description: string | null;
  readonly startDate: string;
  readonly amount: number;
  readonly installments: number;
  readonly amountIsTotal: boolean;
}

export function seriesRequest(v: SeriesFormValue): RecurrenceCreateDto | null {
  const base = { categoryId: v.categoryId, description: v.description, startDate: v.startDate };
  if (v.choice === RECURRENCE.fixed) return { ...base, kind: SERIES_KIND.fixed, amount: v.amount };
  if (v.choice !== RECURRENCE.installment) return null;
  const value = v.amountIsTotal ? { totalAmount: v.amount } : { amount: v.amount };
  return { ...base, kind: SERIES_KIND.installment, installments: v.installments, ...value };
}
