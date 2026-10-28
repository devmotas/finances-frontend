export const CLOSING_TOLERANCE = 50;

export type ClosingTone = 'even' | 'surplus' | 'short';

export interface ClosingStatus {
  tone: ClosingTone;
  amount: number;
}

export interface WalletPlanStatus extends ClosingStatus {
  maxTransfer: number;
}

function toneOf(balance: number): ClosingTone {
  if (balance < 0) return 'short';
  return balance > CLOSING_TOLERANCE ? 'surplus' : 'even';
}

export function closingStatus(balance: number): ClosingStatus {
  return { tone: toneOf(balance), amount: Math.abs(balance) };
}

export function walletPlanStatus(availableForWallet: number, plannedWalletTransfer: number): WalletPlanStatus {
  const projected = availableForWallet - plannedWalletTransfer;
  return { ...closingStatus(projected), maxTransfer: Math.max(0, availableForWallet) };
}

export interface MeterWidths {
  available: number;
  planned: number;
}

export function meterWidths(availableForWallet: number, plannedWalletTransfer: number): MeterWidths {
  const available = Math.max(0, availableForWallet);
  const planned = Math.max(0, plannedWalletTransfer);
  const scale = Math.max(available, planned);
  if (scale === 0) return { available: 0, planned: 0 };
  return { available: (available / scale) * 100, planned: (planned / scale) * 100 };
}
