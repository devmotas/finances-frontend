import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuthTokenService } from '../services/auth-token.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(AuthTokenService);
  const router = inject(Router);
  const injector = inject(Injector);

  const token = tokens.token();
  const isAuthRoute =
    req.url.includes('/auth/login') || req.url.includes('/auth/register');

  let outgoing = req;
  if (token && !isAuthRoute) {
    outgoing = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(outgoing).pipe(
    catchError((err: unknown) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        !isAuthRoute &&
        token
      ) {
        injector.get(AuthService).logout();
        void router.navigateByUrl('/login');
      }
      return throwError(() => err);
    })
  );
};
