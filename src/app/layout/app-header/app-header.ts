import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MegaMenuModule } from 'primeng/megamenu';
import { MegaMenuItem, MenuItem } from 'primeng/api';
import { NgIf } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';

// if your login button is a standalone component:
import { LoginButtonComponent } from '../../auth/login-button/login-button';
import { AuthService } from '../../services/auth';
//  imports: [MegaMenuModule, ButtonModule, NgIf, LoginButtonComponent],
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { PopoverModule } from 'primeng/popover';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MegaMenuModule, ButtonModule, NgIf, LoginButtonComponent, AvatarModule, AvatarGroupModule, PopoverModule],
  templateUrl: './app-header.html',
  styleUrls: ['./app-header.scss']
})
export class AppHeaderComponent implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthService);

  items: MegaMenuItem[] = []; // <-- use MegaMenuItem[]

  userFirstName: string | null = null;
  userLastName: string | null = null;
  userEmail: string | null = null;
  userRoles: string[] = [];

   goHome(): void {
    this.router.navigateByUrl('/');
  }

  ngOnInit(): void {
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
                { label: 'Overview', icon: 'pi pi-list', command: () => this.router.navigate(['/customer/overview'], { skipLocationChange: true, replaceUrl: true }) }
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
                { label: 'Backfill (Status)', icon: 'pi pi-list-check', command: () => this.router.navigate(['/pricing/backfill-status'], { skipLocationChange: true, replaceUrl: true }) },
                { label: 'Trigger Backfill', icon: 'pi pi-play', command: () => this.router.navigate(['/pricing/backfill'], { skipLocationChange: true, replaceUrl: true }) }
              ]
            }
          ]
        ]
      }
    ];

    const user = this.auth.getUser?.();
    if (user) {
      this.userFirstName = user.firstName || null;
      this.userLastName = user.lastName || null;
      this.userEmail = user.email || null;
      this.userRoles = user.roles || [];
    }
  }
  }
