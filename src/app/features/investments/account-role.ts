import {
  ACCOUNT_ROLE,
  AccountRole,
  MOVEMENT_DIRECTION,
  MovementDirection,
} from '../../core/models/investment-accounts.models';

type DirectionTexts = Record<MovementDirection, string>;

interface RoleTexts {
  action: DirectionTexts;
  done: DirectionTexts;
  item: DirectionTexts;
}

export const ACCOUNT_ROLE_LABEL: Record<AccountRole, string> = {
  [ACCOUNT_ROLE.investment]: 'Investimento',
  [ACCOUNT_ROLE.reserve]: 'Reserva',
  [ACCOUNT_ROLE.shortTermReserve]: 'Reserva de curto prazo',
  [ACCOUNT_ROLE.wallet]: 'Carteira',
};

export const ACCOUNT_ROLE_HINT: Record<AccountRole, string> = {
  [ACCOUNT_ROLE.investment]: 'Fica fora da reserva de emergência.',
  [ACCOUNT_ROLE.reserve]: 'Entra na reserva de emergência e quase não é mexida.',
  [ACCOUNT_ROLE.shortTermReserve]:
    'Entra na reserva de emergência. Você pega emprestado num mês apertado e depois devolve.',
  [ACCOUNT_ROLE.wallet]: 'Dinheiro do dia a dia (entra no saldo em caixa, não é investimento)',
};

export const ACCOUNT_ROLES: readonly AccountRole[] = [
  ACCOUNT_ROLE.investment,
  ACCOUNT_ROLE.reserve,
  ACCOUNT_ROLE.shortTermReserve,
  ACCOUNT_ROLE.wallet,
];

export const DIRECTIONS: readonly MovementDirection[] = [
  MOVEMENT_DIRECTION.contribution,
  MOVEMENT_DIRECTION.withdrawal,
];

const INVESTMENT_TEXTS: RoleTexts = {
  action: {
    [MOVEMENT_DIRECTION.contribution]: 'Aporte',
    [MOVEMENT_DIRECTION.withdrawal]: 'Resgate',
  },
  done: {
    [MOVEMENT_DIRECTION.contribution]: 'Aporte',
    [MOVEMENT_DIRECTION.withdrawal]: 'Resgate',
  },
  item: {
    [MOVEMENT_DIRECTION.contribution]: 'este aporte',
    [MOVEMENT_DIRECTION.withdrawal]: 'este resgate',
  },
};

const SHORT_TERM_TEXTS: RoleTexts = {
  action: {
    [MOVEMENT_DIRECTION.contribution]: 'Devolver',
    [MOVEMENT_DIRECTION.withdrawal]: 'Pegar emprestado',
  },
  done: {
    [MOVEMENT_DIRECTION.contribution]: 'Devolvido',
    [MOVEMENT_DIRECTION.withdrawal]: 'Pego emprestado',
  },
  item: {
    [MOVEMENT_DIRECTION.contribution]: 'esta devolução',
    [MOVEMENT_DIRECTION.withdrawal]: 'este empréstimo da reserva',
  },
};

const WALLET_TEXTS: RoleTexts = {
  action: {
    [MOVEMENT_DIRECTION.contribution]: 'Entra na carteira',
    [MOVEMENT_DIRECTION.withdrawal]: 'Volta para o caixa',
  },
  done: {
    [MOVEMENT_DIRECTION.contribution]: 'Entrou na carteira',
    [MOVEMENT_DIRECTION.withdrawal]: 'Voltou para o caixa',
  },
  item: {
    [MOVEMENT_DIRECTION.contribution]: 'esta transferência',
    [MOVEMENT_DIRECTION.withdrawal]: 'esta transferência',
  },
};

export function isShortTermReserve(role: AccountRole | undefined): boolean {
  return role === ACCOUNT_ROLE.shortTermReserve;
}

export function isWallet(role: AccountRole | undefined): boolean {
  return role === ACCOUNT_ROLE.wallet;
}

function textsFor(role: AccountRole | undefined): RoleTexts {
  if (isShortTermReserve(role)) return SHORT_TERM_TEXTS;
  if (isWallet(role)) return WALLET_TEXTS;
  return INVESTMENT_TEXTS;
}

export function directionActionLabel(role: AccountRole | undefined, direction: MovementDirection): string {
  return textsFor(role).action[direction];
}

export function directionBadgeLabel(role: AccountRole | undefined, direction: MovementDirection): string {
  return textsFor(role).done[direction];
}

export function directionItemLabel(role: AccountRole | undefined, direction: MovementDirection): string {
  return textsFor(role).item[direction];
}

export function isWithdrawal(direction: MovementDirection): boolean {
  return direction === MOVEMENT_DIRECTION.withdrawal;
}
