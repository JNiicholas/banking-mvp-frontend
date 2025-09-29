import { CommonModule, AsyncPipe, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { MegaMenuModule } from 'primeng/megamenu';
import { MegaMenuItem, MenuItem } from 'primeng/api';
import { NgIf } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { fromEvent, Subscription } from 'rxjs';

// if your login button is a standalone component:
import { LoginButtonComponent } from '../../auth/login-button/login-button';
import { AuthService } from '../../services/auth';
//  imports: [MegaMenuModule, ButtonModule, NgIf, LoginButtonComponent],
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { PopoverModule } from 'primeng/popover';
import { ChipModule } from 'primeng/chip';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MegaMenuModule, ButtonModule, AvatarModule, AvatarGroupModule, PopoverModule, ChipModule],
  templateUrl: './app-header.html',
  styleUrls: ['./app-header.scss']
})
export class AppHeaderComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private auth = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);

  isLoggedIn$ = this.auth.isLoggedIn$;
  userLoggedIn: boolean = false;

  items: MegaMenuItem[] = []; // <-- use MegaMenuItem[]

  userFirstName: string | null = null;
  userLastName: string | null = null;
  userEmail: string | null = null;
  userRoles: string[] = [];

  private subscriptions = new Subscription();

  private refreshUserFromToken(): void {
    const user = this.auth.getUser?.();
    this.userFirstName = user?.firstName ?? null;
    this.userLastName = user?.lastName ?? null;
    this.userEmail = user?.email ?? null;
    this.userRoles = user?.roles ?? [];
    // Rebuild menu in case visibility depends on roles
    this.buildMenu();
  }

  private buildMenu(): void {
    this.items = [
      {
        label: 'Customer Overview',
        icon: 'pi pi-user',
        visible: this.auth.hasRealmRole('user'),
        styleClass: 'menu-item-blue',
        items: [
          [
            {
              label: 'Account',
              items: [
                { label: 'My Accounts', icon: 'pi pi-wallet', command: () => this.router.navigate(['/customer/my-accounts'], { skipLocationChange: true, replaceUrl: true }) }
              ]
            }
          ]
        ]
      },
      {
        label: 'Admin',
        icon: 'pi pi-cog',
        visible: this.auth.hasRealmRole('admin'),
        styleClass: 'menu-item-blue',
        items: [
          [
            {
              label: 'Actions',
              items: [
                { label: 'List Customers', icon: 'pi pi-users', command: () => this.router.navigate(['/admin/list-accounts'], { skipLocationChange: true, replaceUrl: true }) },
                { label: 'Create Customer', icon: 'pi pi-user-plus', command: () => this.router.navigate(['/admin/customers/new'], { skipLocationChange: true, replaceUrl: true }) },
                { label: 'Create New Account', icon: 'pi pi-wallet', command: () => this.router.navigate(['/admin/accounts/new'], { skipLocationChange: true, replaceUrl: true }) }
              ]
            }
          ]
        ]
      }
    ];
  }

  goHome(): void {
    this.router.navigateByUrl('/');
  }

  async logout(): Promise<void> { await this.auth.logout(); }

  async login(): Promise<void> {
    await this.auth.login();
  }

  ngOnInit(): void {
    this.buildMenu();
    this.refreshUserFromToken();

    // If AuthService exposes an isLoggedIn$ or token change observable, subscribe to it
    this.subscriptions.add(
      this.isLoggedIn$.subscribe((inState) => {
        this.userLoggedIn = !!inState;
        this.refreshUserFromToken();
      })
    );
    const maybeTokenChange$ = (this.auth as any).tokenChanged$; // optional
    if (maybeTokenChange$?.subscribe) {
      this.subscriptions.add(maybeTokenChange$.subscribe(() => this.refreshUserFromToken()));
    }

    if (isPlatformBrowser(this.platformId)) {
      this.subscriptions.add(
        fromEvent(this.document, 'visibilitychange').subscribe(() => {
          if (this.document.visibilityState === 'visible') {
            this.refreshUserFromToken();
          }
        })
      );
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
