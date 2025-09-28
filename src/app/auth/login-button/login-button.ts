// src/app/auth/login-button/login-button.ts
import { Component, inject, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { AsyncPipe, NgIf } from '@angular/common';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login-button',
  standalone: true,
  imports: [ButtonModule, AsyncPipe, NgIf], // <-- AsyncPipe imported here
  templateUrl: './login-button.html'
})
export class LoginButtonComponent implements OnInit {
  private auth = inject(AuthService);

  // expose the observable for the template
  isLoggedIn$ = this.auth.isLoggedIn$;

  ngOnInit(): void {
    // Ensure state is up-to-date on first render (browser will flip to true)
    this.auth.refreshState().catch(() => void 0);
  }

async handleLogin(): Promise<void> {
  const isIn = await this.auth.isLoggedInOnce();
  if (isIn) {
    await this.auth.logout(); // logout stops refresh naturally
  } else {
    await this.auth.login();  // redirects to Keycloak
  }
}
}