import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const apiBaseUrlInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/')) {
    return next(req);
  }

  const baseUrl = environment.apiBaseUrl.replace(/\/$/, '');
  const nextUrl = `${baseUrl}${req.url}`;

  return next(
    req.clone({
      url: nextUrl,
    })
  );
};
