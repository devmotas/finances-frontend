export const LOAD_STATE = {
  loading: 'loading',
  ok: 'ok',
  error: 'error',
} as const;

export type LoadState = (typeof LOAD_STATE)[keyof typeof LOAD_STATE];
