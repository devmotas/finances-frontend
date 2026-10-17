export const BUSY_LABEL = {
  saving: 'Salvando…',
  deleting: 'Excluindo…',
  exporting: 'Exportando…',
  signingIn: 'Entrando…',
  registering: 'Criando conta…',
  changingPassword: 'Alterando…',
} as const;

export type BusyLabel = (typeof BUSY_LABEL)[keyof typeof BUSY_LABEL];
