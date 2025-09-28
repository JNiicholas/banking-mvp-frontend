import 'zone.js'; // <-- must be first for zoned mode

import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { provideHttpClient } from '@angular/common/http';
import { APP_INITIALIZER, importProvidersFrom } from '@angular/core';
import { KeycloakAngularModule, KeycloakService } from 'keycloak-angular';
import { initializeKeycloak } from './app/app.config';
import { AuthService } from './app/services/auth';

import { appConfig } from './app/app.config';
bootstrapApplication(App, appConfig).catch(err => console.error(err));


/*
bootstrapApplication(App, {
  providers: [
    provideHttpClient(),
    importProvidersFrom(KeycloakAngularModule),
    { provide: APP_INITIALIZER, useFactory: initializeKeycloak, deps: [KeycloakService], multi: true },
  ],
}).then((appRef) => {
  // run post-bootstrap behavior; won’t block theming
  const auth = appRef.injector.get(AuthService);
  auth.refreshState().catch(console.warn);
}).catch((err) => console.error(err));
*/