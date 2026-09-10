import { ChangeDetectionStrategy, Component, HostListener, inject, output, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { InicialesPipe } from '../../shared/pipes/iniciales.pipe';

interface Recordatorio {
  icon: string;
  texto: string;
  hace: string;
}

/** Header superior: menú móvil, búsqueda global, tema, notificaciones y perfil. */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [IconComponent, InicialesPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  readonly menuClick = output<void>();

  protected readonly profileOpen = signal(false);
  protected readonly notifOpen = signal(false);

  protected readonly recordatorios: Recordatorio[] = [
    { icon: 'calendar', texto: '3 citas por confirmar para mañana', hace: 'Hace 10 min' },
    { icon: 'pill', texto: 'Stock bajo de Amoxicilina en catálogo', hace: 'Hace 1 h' },
    { icon: 'userPlus', texto: '2 pacientes nuevos registrados hoy', hace: 'Hace 3 h' },
  ];

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      document.getElementById('global-search')?.focus();
    }
    if (e.key === 'Escape') {
      this.profileOpen.set(false);
      this.notifOpen.set(false);
    }
  }

  protected toggleProfile(): void {
    this.notifOpen.set(false);
    this.profileOpen.update((v) => !v);
  }

  protected toggleNotif(): void {
    this.profileOpen.set(false);
    this.notifOpen.update((v) => !v);
  }

  protected goProfile(): void {
    this.profileOpen.set(false);
    this.router.navigateByUrl('/perfil');
  }

  protected logout(): void {
    this.profileOpen.set(false);
    this.auth.logout();
  }
}
