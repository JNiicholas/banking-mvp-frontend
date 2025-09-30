import { ApplicationConfig, provideBrowserGlobalErrorListeners, APP_INITIALIZER, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, withFetch } from '@angular/common/http';

import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthTokenInterceptor } from './services/auth-token/auth-token-interceptor';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import Material from '@primeng/themes/material';
import Lara from '@primeng/themes/lara';
import { definePreset } from '@primeng/themes';

import { KeycloakAngularModule, KeycloakService } from 'keycloak-angular';
import { env } from '../environments/env';
import { importProvidersFrom } from '@angular/core';
import { Configuration } from './api/configuration';
import { apiProviders } from './providers/providers';
import { AuthService } from './services/auth';
import { BaseUrlInterceptor } from './services/base-url/base-url.interceptor';


export function initializeKeycloak(keycloak: KeycloakService, auth: AuthService) {
  // During SSR there is no `window`, so skip Keycloak init on the server
  if (typeof window === 'undefined') {
    return () => Promise.resolve(true);
  }

  const silentUri = `${window.location.origin}/assets/silent-check-sso.html`;

  return () =>
    keycloak
      .init({
        config: {
          url: env.keycloak.url,
          realm: env.keycloak.realm,
          clientId: env.keycloak.clientId
        },
        initOptions: {
          onLoad: 'check-sso',           // don't force redirect on cold boot
          pkceMethod: 'S256',
          silentCheckSsoRedirectUri: silentUri
        },
        bearerExcludedUrls: ['/assets', '/favicon.ico']
      })
      .then(async (authenticated) => {
        // This runs after each page load (including the redirect back from Keycloak).
        if (authenticated) {
          try {
            // Make sure we have a fresh token and log a short prefix for debugging
            await keycloak.updateToken(30);
            const token = keycloak.getKeycloakInstance().token;
            if (token) {
              console.log('[auth] post-init token:', token.slice(0, 24), '…');
            }
          } catch (e) {
            console.warn('[auth] post-init token refresh failed:', e);
          }
        } else {
          console.log('[auth] post-init: not authenticated');
        }
      })
      .finally(async () => {
        // Always sync our app-level signals after KC init (success or not)
        try {
          await auth.refreshState();
        } catch (e) {
          console.warn('[auth] refreshState after init failed:', e);
        }
      });
}


const AuraPreset = definePreset(Aura);
const MaterialPreset = definePreset(Material);
const LaraPreset = definePreset(Lara);

const AuraBluePreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554'
    }
  }
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
     ...apiProviders,
         { provide: HTTP_INTERCEPTORS, useClass: BaseUrlInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthTokenInterceptor, multi: true },

    {
      provide: Configuration,
      useFactory: () => new Configuration({ basePath: 'http://localhost:8080' }),
    },
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
  provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideAnimations(),


    providePrimeNG({
      theme: { preset: AuraBluePreset, options: { darkModeSelector: '.banking-frontend-dark' } }
    }),
    // Always provide the Keycloak module so KeycloakService is available in both SSR and browser.
    importProvidersFrom(KeycloakAngularModule),
    // APP_INITIALIZER will run on both SSR and browser; the factory itself guards SSR by returning a resolved promise when window is undefined.
    { provide: APP_INITIALIZER, useFactory: initializeKeycloak, deps: [KeycloakService, AuthService], multi: true }
  ]
};