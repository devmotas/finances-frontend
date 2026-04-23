import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { UserDto } from './auth-api.service';

export interface UserMePatchDto {
  name?: string;
  defaultRecurrenceMonths?: number;
  emergencyFundTargetMonths?: number;
}

export interface PasswordChangeDto {
  currentPassword: string;
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class UserApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/users';

  getMe(): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.base}/me`);
  }

  patchMe(body: UserMePatchDto): Observable<UserDto> {
    return this.http.patch<UserDto>(`${this.base}/me`, body);
  }

  changePassword(body: PasswordChangeDto): Observable<void> {
    return this.http.post<void>(`${this.base}/me/password`, body);
  }
}
