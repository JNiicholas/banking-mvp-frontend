import { Injectable, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { KeycloakService, KeycloakEventType } from 'keycloak-angular';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private kc = inject(KeycloakService);
  private refreshTimer?: any;

  // reactive state signals
  isLoggedIn = signal(false);
  username = signal<string | null>(null);
  isLoggedIn$ = toObservable(this.isLoggedIn);

async refreshState() {
  const loggedIn = await this.kc.isLoggedIn();
  this.isLoggedIn.set(loggedIn);
  console.log('[auth] refreshState: loggedIn=', loggedIn);

  let uname: string | null = null;

  if (loggedIn) {
    try {
      // Try to load the profile once; this resolves the "profile not loaded" issue
      const profile = await this.kc.loadUserProfile();
      uname = profile?.username ?? null;
      console.log('[auth] refreshState: profile username=', uname);
    } catch {
      // Fallback: read from the token if profile couldn’t be loaded
      const inst = this.kc.getKeycloakInstance();
      const parsed: any = inst?.tokenParsed || {};
      uname = parsed.preferred_username ?? parsed.email ?? null;
      console.log('[auth] Error refreshState: token username=', uname);
    }
  }

  this.username.set(uname);
}
  async isLoggedInOnce(): Promise<boolean> {
    console.log('[auth] isLoggedInOnce: checking login status', this.kc.isLoggedIn());
    return this.kc.isLoggedIn();
  }

  async login() {
    // Triggers a redirect; any code after this won't run until the app is reloaded.
    await this.kc.login({ redirectUri: window.location.href });
  }

  async logout() {
    await this.kc.logout(window.location.origin);
  }

  async getToken(): Promise<string | undefined> {
    return this.ensureFreshToken(30);
  }

  startProactiveRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    this.refreshTimer = setInterval(async () => {
      try {
        console.log('[auth] Proactive refresh: checking token…');
        await this.kc.updateToken(60);
        console.log('[auth] Proactive refresh: token refreshed successfully');
      } catch (error) {
        console.error('[auth] Proactive refresh: failed to refresh token', error);
        this.isLoggedIn.set(false);
      }
    }, 60000);
  }

  async ensureFreshToken(minValidity = 10): Promise<string | undefined> {
    try {
      await this.kc.updateToken(minValidity);
      return this.kc.getKeycloakInstance().token;
    } catch {
      this.isLoggedIn.set(false);
      return undefined;
    }
  }

  hasRealmRole(role: string): boolean {
    const tokenParsed: any = this.kc.getKeycloakInstance()?.tokenParsed;
    return tokenParsed?.realm_access?.roles?.includes(role) ?? false;
  }
}