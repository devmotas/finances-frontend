import { Injectable, signal } from '@angular/core';
import { VALIDATION_LIMITS } from '../models/validation-limits';
import { UserDto } from './auth-api.service';

const DEFAULT_RECURRENCE_MONTHS = 12;
const DEFAULT_EMERGENCY_FUND_TARGET_MONTHS = 6;

function clampMonths(months: number): number {
  return Math.min(VALIDATION_LIMITS.monthsMax, Math.max(VALIDATION_LIMITS.monthsMin, months));
}

function monthsOrDefault(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? clampMonths(value) : fallback;
}

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly _name = signal('');
  private readonly _email = signal('');
  private readonly _defaultRecurrenceMonths = signal(DEFAULT_RECURRENCE_MONTHS);
  private readonly _emergencyFundTargetMonths = signal(DEFAULT_EMERGENCY_FUND_TARGET_MONTHS);

  readonly name = this._name.asReadonly();
  readonly email = this._email.asReadonly();
  readonly defaultRecurrenceMonths = this._defaultRecurrenceMonths.asReadonly();
  readonly emergencyFundTargetMonths = this._emergencyFundTargetMonths.asReadonly();

  setFromUser(user: UserDto): void {
    this._name.set(typeof user.name === 'string' ? user.name : '');
    this._email.set(typeof user.email === 'string' ? user.email : '');
    this._defaultRecurrenceMonths.set(
      monthsOrDefault(user.defaultRecurrenceMonths, DEFAULT_RECURRENCE_MONTHS)
    );
    this._emergencyFundTargetMonths.set(
      monthsOrDefault(user.emergencyFundTargetMonths, DEFAULT_EMERGENCY_FUND_TARGET_MONTHS)
    );
  }

  patchLocal(months: number): void {
    this._defaultRecurrenceMonths.set(clampMonths(months));
  }

  patchEmergencyMonthsLocal(months: number): void {
    this._emergencyFundTargetMonths.set(clampMonths(months));
  }

  clear(): void {
    this._name.set('');
    this._email.set('');
    this._defaultRecurrenceMonths.set(DEFAULT_RECURRENCE_MONTHS);
    this._emergencyFundTargetMonths.set(DEFAULT_EMERGENCY_FUND_TARGET_MONTHS);
  }
}
