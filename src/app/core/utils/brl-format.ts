const BRL_FORMAT = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const SIGN = { in: '+', out: '−' } as const;

export type LedgerSide = keyof typeof SIGN;

export function formatBrl(value: number): string {
  return BRL_FORMAT.format(value);
}

/** Linha de extrato: o lado diz se o valor soma ou subtrai; um valor negativo inverte o sinal. */
export function formatLedgerBrl(value: number, side: LedgerSide): string {
  const flipped = value < 0 ? (side === 'in' ? SIGN.out : SIGN.in) : SIGN[side];
  return `${flipped} ${formatBrl(Math.abs(value))}`;
}
