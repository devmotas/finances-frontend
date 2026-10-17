const FLOW_HUE = {
  income: 142,
  essential: 21,
  nonEssential: 0,
  investment: 263,
} as const;

export type ChartFlow = keyof typeof FLOW_HUE;

const FLOW_SATURATION_PERCENT = 62;
const SHADE_LIGHTNESS_PERCENT = [30, 46, 38, 54, 26, 42, 34, 50] as const;
const COMPACT_FRACTION_DIGITS = 1;

export const CHART_SEGMENT_BORDER = 'rgba(255, 255, 255, 0.92)';

export function flowShade(flow: ChartFlow, index: number): string {
  const lightness = SHADE_LIGHTNESS_PERCENT[index % SHADE_LIGHTNESS_PERCENT.length];
  return `hsl(${FLOW_HUE[flow]} ${FLOW_SATURATION_PERCENT}% ${lightness}%)`;
}

export function cssToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function formatCompactBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: COMPACT_FRACTION_DIGITS,
    notation: 'compact',
  }).format(value);
}
