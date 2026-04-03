import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'finances.auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authenticated = signal(this.readStored());

  readonly isAuthenticated = this.authenticated.asReadonly();

  login(email: string): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ email: email.trim(), at: Date.now() })
      );
    } catch {
      /* ignore quota / private mode */
    }
    this.authenticated.set(true);
  }

  logout(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    this.authenticated.set(false);
  }

  private readStored(): boolean {
    try {
      return !!localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  }
}
