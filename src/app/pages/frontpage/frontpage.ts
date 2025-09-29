import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimateOnScrollModule } from 'primeng/animateonscroll';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { RouterLink } from '@angular/router'
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-frontpage',
  standalone: true,
  imports: [CommonModule, AnimateOnScrollModule, ButtonModule, AvatarModule, DividerModule, RouterLink],
  templateUrl: './frontpage.html',
  styleUrls: ['./frontpage.scss']
})
export class Frontpage {
  public auth = inject(AuthService);
}