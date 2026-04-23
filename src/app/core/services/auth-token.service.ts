import { Injectable, computed, signal } from '@angular/core';

const TOKEN_KEY = 'finances.jwt';

@Injectable({ providedIn: 'root' })
export class AuthTokenService {
  private readonly _token = signal<string | null>(this.readSession());

  readonly token = this._token.asReadonly();

  readonly hasToken = computed(() => !!this._token());

  private readSession(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  setToken(token: string): void {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
    }
    this._token.set(token);
  }

  clear(): void {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
    }
    this._token.set(null);
  }
}
