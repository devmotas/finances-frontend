import { Injectable, signal } from '@angular/core';
import { UserDto } from './auth-api.service';

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly _name = signal('');
  private readonly _email = signal('');
  private readonly _defaultRecurrenceMonths = signal(12);
  private readonly _emergencyFundTargetMonths = signal(6);

  readonly name = this._name.asReadonly();
  readonly email = this._email.asReadonly();
  readonly defaultRecurrenceMonths = this._defaultRecurrenceMonths.asReadonly();
  readonly emergencyFundTargetMonths = this._emergencyFundTargetMonths.asReadonly();

  setFromUser(user: UserDto): void {
    this._name.set(typeof user.name === 'string' ? user.name : '');
    this._email.set(typeof user.email === 'string' ? user.email : '');
    const v = user.defaultRecurrenceMonths;
    this._defaultRecurrenceMonths.set(
      typeof v === 'number' && Number.isFinite(v) ? Math.min(120, Math.max(1, v)) : 12
    );
    const e = user.emergencyFundTargetMonths;
    this._emergencyFundTargetMonths.set(
      typeof e === 'number' && Number.isFinite(e) ? Math.min(120, Math.max(1, e)) : 6
    );
  }

  patchLocal(months: number): void {
    this._defaultRecurrenceMonths.set(Math.min(120, Math.max(1, months)));
  }

  patchEmergencyMonthsLocal(months: number): void {
    this._emergencyFundTargetMonths.set(Math.min(120, Math.max(1, months)));
  }

  clear(): void {
    this._name.set('');
    this._email.set('');
    this._defaultRecurrenceMonths.set(12);
    this._emergencyFundTargetMonths.set(6);
  }
}
