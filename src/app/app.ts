import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeaderComponent } from './layout/app-header/app-header';
import { AppFooterComponent } from './layout/app-footer/app-footer';
import { AuthService } from './services/auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,  AppHeaderComponent, AppFooterComponent,  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('banking-frontend');

  constructor(private auth: AuthService) {}

  async ngOnInit() {
    await this.auth.refreshState();
    const loggedIn = await this.auth.isLoggedInOnce();
    if (loggedIn) {
      this.auth.startProactiveRefresh();
    }
  }
}
