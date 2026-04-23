import { computed, Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthApiService, AuthResponseDto } from './auth-api.service';
import { AuthTokenService } from './auth-token.service';
import { UserProfileService } from './user-profile.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authApi = inject(AuthApiService);
  private readonly tokens = inject(AuthTokenService);
  private readonly userProfile = inject(UserProfileService);

  readonly isAuthenticated = computed(() => this.tokens.hasToken());

  getToken(): string | null {
    return this.tokens.token();
  }

  login(email: string, password: string): Observable<AuthResponseDto> {
    return this.authApi.login({ email, password }).pipe(
      tap((res) => {
        this.tokens.setToken(res.token);
        this.userProfile.setFromUser(res.user);
      })
    );
  }

  logout(): void {
    this.tokens.clear();
    this.userProfile.clear();
  }
}
