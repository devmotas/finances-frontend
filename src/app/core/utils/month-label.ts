const MONTH_YEAR_FORMAT: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
const LOCALE = 'pt-BR';

export function monthYearLabel(year: number, month: number): string {
  const raw = new Date(year, month - 1, 1).toLocaleDateString(LOCALE, MONTH_YEAR_FORMAT);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
