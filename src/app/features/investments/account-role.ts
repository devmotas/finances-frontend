import {
  ACCOUNT_ROLE,
  AccountRole,
  MOVEMENT_DIRECTION,
  MovementDirection,
} from '../../core/models/investment-accounts.models';

type DirectionTexts = Record<MovementDirection, string>;

export const ACCOUNT_ROLE_LABEL: Record<AccountRole, string> = {
  [ACCOUNT_ROLE.investment]: 'Investimento',
  [ACCOUNT_ROLE.reserve]: 'Reserva',
  [ACCOUNT_ROLE.shortTermReserve]: 'Reserva de curto prazo',
};

export const ACCOUNT_ROLE_HINT: Record<AccountRole, string> = {
  [ACCOUNT_ROLE.investment]: 'Fica fora da reserva de emergência.',
  [ACCOUNT_ROLE.reserve]: 'Entra na reserva de emergência e quase não é mexida.',
  [ACCOUNT_ROLE.shortTermReserve]:
    'Entra na reserva de emergência. Você pega emprestado num mês apertado e depois devolve.',
};

export const ACCOUNT_ROLES: readonly AccountRole[] = [
  ACCOUNT_ROLE.investment,
  ACCOUNT_ROLE.reserve,
  ACCOUNT_ROLE.shortTermReserve,
];

export const DIRECTIONS: readonly MovementDirection[] = [
  MOVEMENT_DIRECTION.contribution,
  MOVEMENT_DIRECTION.withdrawal,
];

const INVESTMENT_ACTION: DirectionTexts = {
  [MOVEMENT_DIRECTION.contribution]: 'Aporte',
  [MOVEMENT_DIRECTION.withdrawal]: 'Resgate',
};

const SHORT_TERM_ACTION: DirectionTexts = {
  [MOVEMENT_DIRECTION.contribution]: 'Devolver',
  [MOVEMENT_DIRECTION.withdrawal]: 'Pegar emprestado',
};

const INVESTMENT_DONE: DirectionTexts = {
  [MOVEMENT_DIRECTION.contribution]: 'Aporte',
  [MOVEMENT_DIRECTION.withdrawal]: 'Resgate',
};

const SHORT_TERM_DONE: DirectionTexts = {
  [MOVEMENT_DIRECTION.contribution]: 'Devolvido',
  [MOVEMENT_DIRECTION.withdrawal]: 'Pego emprestado',
};

const INVESTMENT_ITEM: DirectionTexts = {
  [MOVEMENT_DIRECTION.contribution]: 'este aporte',
  [MOVEMENT_DIRECTION.withdrawal]: 'este resgate',
};

const SHORT_TERM_ITEM: DirectionTexts = {
  [MOVEMENT_DIRECTION.contribution]: 'esta devolução',
  [MOVEMENT_DIRECTION.withdrawal]: 'este empréstimo da reserva',
};

export function isShortTermReserve(role: AccountRole | undefined): boolean {
  return role === ACCOUNT_ROLE.shortTermReserve;
}

export function directionActionLabel(role: AccountRole | undefined, direction: MovementDirection): string {
  return (isShortTermReserve(role) ? SHORT_TERM_ACTION : INVESTMENT_ACTION)[direction];
}

export function directionBadgeLabel(role: AccountRole | undefined, direction: MovementDirection): string {
  return (isShortTermReserve(role) ? SHORT_TERM_DONE : INVESTMENT_DONE)[direction];
}

export function directionItemLabel(role: AccountRole | undefined, direction: MovementDirection): string {
  return (isShortTermReserve(role) ? SHORT_TERM_ITEM : INVESTMENT_ITEM)[direction];
}

export function isWithdrawal(direction: MovementDirection): boolean {
  return direction === MOVEMENT_DIRECTION.withdrawal;
}
