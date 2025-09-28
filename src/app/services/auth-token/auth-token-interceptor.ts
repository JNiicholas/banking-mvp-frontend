import { Injectable, inject } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { AuthService } from '../auth';

@Injectable()
export class AuthTokenInterceptor implements HttpInterceptor {
  private auth = inject(AuthService);
  private refreshInFlight?: Promise<string | undefined>;

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip certain URLs if needed

    console.log('[auth] Intercepting request to', req.url);
    if (req.url.includes('/assets')) {
      return next.handle(req);
    }

    return from(this.auth.ensureFreshToken(60)).pipe(
      switchMap(() => from(this.auth.getToken())),
      switchMap(token => {
        let authReq = req;
        if (token) {
          console.log('[auth] Attaching token to request:', req.url);
          console.log('[auth] Token prefix:', token.slice(0, 24), '…');
          authReq = req.clone({
            setHeaders: { Authorization: `Bearer ${token}` }
          });
        } else {
          console.log('[auth] No token available for request:', req.url);
        }
        return next.handle(authReq).pipe(
          catchError((err: HttpErrorResponse) => {
            if (err.status !== 401) {
              return throwError(() => err);
            }
            console.log('[auth] 401 received, attempting token refresh and retry for:', req.url);
            if (!this.refreshInFlight) {
              this.refreshInFlight = this.auth.ensureFreshToken(60).finally(() => {
                this.refreshInFlight = undefined;
              });
            }
            return from(this.refreshInFlight).pipe(
              switchMap(() => from(this.auth.getToken())),
              switchMap(newToken => {
                if (!newToken) {
                  console.log('[auth] No token after refresh, cannot retry request:', req.url);
                  return throwError(() => err);
                }
                console.log('[auth] Retrying request with refreshed token:', req.url);
                const retryReq = req.clone({
                  setHeaders: { Authorization: `Bearer ${newToken}` }
                });
                return next.handle(retryReq);
              }),
              catchError(refreshErr => {
                console.log('[auth] Refresh or retry failed for request:', req.url);
                return throwError(() => err);
              })
            );
          })
        );
      })
    );
  }
}