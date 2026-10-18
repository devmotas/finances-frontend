const BRL_FORMAT = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatBrl(value: number): string {
  return BRL_FORMAT.format(value);
}
