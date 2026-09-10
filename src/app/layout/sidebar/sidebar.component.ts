import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { NAV_ADMIN, NAV_PRINCIPAL, NavItem } from '../nav-items';

/** Barra lateral de navegación, filtrada dinámicamente por el rol del usuario. */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private readonly auth = inject(AuthService);

  readonly mobileOpen = input(false);
  readonly collapsed = input(false);
  readonly collapseToggle = output<void>();
  readonly navigate = output<void>();

  protected readonly navPrincipal: NavItem[] = NAV_PRINCIPAL;
  protected readonly navAdmin: NavItem[] = NAV_ADMIN;

  protected visible(item: NavItem): boolean {
    if (!item.roles || item.roles.length === 0) return true;
    return this.auth.hasRol(...item.roles);
  }

  protected get isAdminVisible(): boolean {
    return this.navAdmin.some((i) => this.visible(i));
  }
}
