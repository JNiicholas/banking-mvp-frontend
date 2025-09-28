// src/app/guards/auth.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { KeycloakService } from 'keycloak-angular';

export const authGuard: CanActivateFn = async (route, state) => {
  
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const doc = inject(DOCUMENT);

    // 🔒 Only do Keycloak work in the browser
  if (!isPlatformBrowser(platformId)) {
    // Let the client re-run the guard after hydration.
    // Returning true here avoids SSR-time crashes.
    return true;
  }

  const kc = inject(KeycloakService);
  const loggedIn = await kc.isLoggedIn();
  if (!loggedIn) {
    // Preserve the originally requested URL so we deep-link back here after login.
    // Keycloak must allow this redirect in the client's "Valid redirect URIs" (e.g., http://localhost:4200/*).
    // Build redirect in an SSR-safe way (no direct `window` access on the server).
    const origin = isPlatformBrowser(platformId)
      ? window.location.origin
      : doc?.location?.origin ?? 'http://localhost:4300';
    const targetUrl = origin + state.url;
    await kc.login({ redirectUri: targetUrl });
    return false;
  }

  // Optional: role-based protection
  const required = route.data?.['roles'] as string[] | undefined;
  if (required?.length) {
    const roles = kc.getUserRoles(); // realm + client roles (depending on config)
    const ok = required.some(r => roles.includes(r));
    if (!ok) {
      // not authorized – send home or show a 403 page
      router.navigateByUrl('/');
      return false;
    }
  }

  return true;
};