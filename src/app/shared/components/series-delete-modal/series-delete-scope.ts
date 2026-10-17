export const SERIES_DELETE_SCOPE = {
  thisMonth: 'thisMonth',
  thisAndFuture: 'thisAndFuture',
} as const;

export type SeriesDeleteScope = (typeof SERIES_DELETE_SCOPE)[keyof typeof SERIES_DELETE_SCOPE];
