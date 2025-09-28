// src/app/services/base-url/base-url.interceptor.ts
import { Injectable, inject } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BASE_PATH } from '../../api/variables';
import { Configuration } from '../../api/configuration';

@Injectable()
export class BaseUrlInterceptor implements HttpInterceptor {
  private readonly cfg = inject(Configuration);
  private readonly diBase = inject(BASE_PATH, { optional: true });

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Prefer Configuration.basePath; fall back to DI BASE_PATH; finally location.origin (browser)
    console.info('[api] BaseUrlInterceptor engaged for', req.url);
    const base =
      this.cfg.basePath ||
      this.diBase ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080');

    // Already absolute to our target host? pass-through
    if (req.url.startsWith(base)) {
      return next.handle(req);
    }

    // If generator default is present (http://localhost), normalize it to our base
    const normalized = req.url.startsWith('http://localhost/')
      ? base + req.url.substring('http://localhost'.length)
      // Or if it’s a relative URL, prefix our base
      : req.url.startsWith('/') ? base + req.url : `${base.replace(/\/+$/, '')}/${req.url}`;

    return next.handle(req.clone({ url: normalized }));
  }
}