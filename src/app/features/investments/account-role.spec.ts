import { ACCOUNT_ROLE, MOVEMENT_DIRECTION } from '../../core/models/investment-accounts.models';
import {
  directionActionLabel,
  directionBadgeLabel,
  directionItemLabel,
  isShortTermReserve,
  isWallet,
} from './account-role';

describe('account-role', () => {
  it('usa Aporte e Resgate nas contas comuns e de reserva', () => {
    expect(directionActionLabel(ACCOUNT_ROLE.investment, MOVEMENT_DIRECTION.contribution)).toBe('Aporte');
    expect(directionActionLabel(ACCOUNT_ROLE.reserve, MOVEMENT_DIRECTION.withdrawal)).toBe('Resgate');
  });

  it('usa Devolver e Pegar emprestado na reserva de curto prazo', () => {
    const role = ACCOUNT_ROLE.shortTermReserve;
    expect(directionActionLabel(role, MOVEMENT_DIRECTION.contribution)).toBe('Devolver');
    expect(directionActionLabel(role, MOVEMENT_DIRECTION.withdrawal)).toBe('Pegar emprestado');
    expect(directionBadgeLabel(role, MOVEMENT_DIRECTION.withdrawal)).toBe('Pego emprestado');
  });

  it('reconhece só a reserva de curto prazo', () => {
    expect(isShortTermReserve(ACCOUNT_ROLE.shortTermReserve)).toBeTrue();
    expect(isShortTermReserve(ACCOUNT_ROLE.reserve)).toBeFalse();
    expect(isShortTermReserve(undefined)).toBeFalse();
  });

  it('usa os textos de transferência na carteira', () => {
    const role = ACCOUNT_ROLE.wallet;
    expect(directionActionLabel(role, MOVEMENT_DIRECTION.contribution)).toBe('Entra na carteira');
    expect(directionActionLabel(role, MOVEMENT_DIRECTION.withdrawal)).toBe('Volta para o caixa');
    expect(directionBadgeLabel(role, MOVEMENT_DIRECTION.contribution)).toBe('Entrou na carteira');
    expect(directionBadgeLabel(role, MOVEMENT_DIRECTION.withdrawal)).toBe('Voltou para o caixa');
    expect(directionItemLabel(role, MOVEMENT_DIRECTION.withdrawal)).toBe('esta transferência');
  });

  it('reconhece só a carteira', () => {
    expect(isWallet(ACCOUNT_ROLE.wallet)).toBeTrue();
    expect(isWallet(ACCOUNT_ROLE.investment)).toBeFalse();
    expect(isWallet(undefined)).toBeFalse();
  });
});
