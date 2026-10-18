export const ACCOUNT_ROLE = {
  investment: 'investment',
  reserve: 'reserve',
  shortTermReserve: 'short_term_reserve',
} as const;

export type AccountRole = (typeof ACCOUNT_ROLE)[keyof typeof ACCOUNT_ROLE];

export const MOVEMENT_DIRECTION = {
  contribution: 'contribution',
  withdrawal: 'withdrawal',
} as const;

export type MovementDirection = (typeof MOVEMENT_DIRECTION)[keyof typeof MOVEMENT_DIRECTION];

export interface InvestmentAccountRecord {
  id: number;
  name: string;
  role: AccountRole;
  initialBalance: number;
  initialBalanceDate: string;
  targetBalance: number | null;
}

export interface InvestmentAccountSaveDto {
  name: string;
  role: AccountRole;
  initialBalance: number;
  initialBalanceDate: string;
  targetBalance: number | null;
}

export interface LastBalanceUpdate {
  date: string;
  balance: number;
}

export interface InvestmentAccountPosition extends InvestmentAccountRecord {
  contributions: number;
  withdrawals: number;
  yield: number;
  balance: number;
  missingToTarget: number | null;
  lastBalanceUpdate: LastBalanceUpdate | null;
}

export interface InvestmentMonthAccount extends InvestmentAccountPosition {
  monthContributions: number;
  monthWithdrawals: number;
  monthYield: number;
}

export interface BalanceUpdateCreateDto {
  date: string;
  balance: number;
}

export interface BalanceUpdateDto {
  id: number;
  investmentAccountId: number;
  date: string;
  balance: number;
  yield: number;
}

export interface InvestmentMovement {
  id: number;
  investmentAccountId: number;
  direction: MovementDirection;
  description: string | null;
  amount: number;
  date: string;
}

export interface InvestmentMovementSaveDto {
  investmentAccountId: number;
  direction: MovementDirection;
  amount: number;
  date: string;
  description: string | null;
}

export interface InvestmentMonthSummary {
  monthTotal: number;
  monthContributions: number;
  monthWithdrawals: number;
  positionBeforeMonth: number;
  positionThroughMonthEnd: number;
  monthYield: number;
  yieldThroughMonthEnd: number;
}

export interface InvestmentMonthPoint {
  year: number;
  month: number;
  invested: number;
  cumulativeWealth: number;
  yield: number;
  displayLabel: string | null;
  accountPositions: number[];
}

export interface InvestmentStackAccount {
  id: number;
  name: string;
  role: AccountRole;
}

export interface InvestmentMonthView {
  summary: InvestmentMonthSummary;
  accounts: InvestmentMonthAccount[];
  transactions: InvestmentMovement[];
  monthlySeries: InvestmentMonthPoint[];
  stackAccounts: InvestmentStackAccount[];
}

export interface EmergencyReserve {
  amount: number;
  referenceExpense: number | null;
  coverageMonths: number | null;
  targetMonths: number;
  shortTermBalance: number;
  shortTermTarget: number | null;
  shortTermMissing: number | null;
}
