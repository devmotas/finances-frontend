import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RegisterRequestDto {
  name: string;
  email: string;
  password: string;
}

export interface UserDto {
  id: number;
  name: string;
  email: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  defaultRecurrenceMonths?: number;
  emergencyFundTargetMonths?: number;
}

export interface AuthResponseDto {
  token: string;
  user: UserDto;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/auth';

  login(body: LoginRequestDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.base}/login`, body);
  }

  register(body: RegisterRequestDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.base}/register`, body);
  }
}
