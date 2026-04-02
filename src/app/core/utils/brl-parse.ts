/** Parse pt-BR currency string to number. Accepts "1.234,56" or "1234,56" or "1234". */
export function parseBrlToNumber(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, '');
  if (!s) return null;
  const normalized = s.replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

export function formatNumberToBrlInput(n: number): string {
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
