import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { environment } from '../../../../environments/environment';

/** Configuración general: apariencia y estado de la única base Supabase. */
@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [IconComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.css',
})
export class ConfiguracionComponent {
  protected readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);

  protected readonly supabaseUrl = environment.supabase.url;
  protected readonly supabaseConfigurado = !environment.supabase.url.includes('TU-PROYECTO');
  protected readonly servicios = [
    { nombre: 'Base única Supabase', url: environment.supabase.url },
  ];

  protected clearCache(): void {
    sessionStorage.removeItem('cm.session');
    this.toast.info('Se limpió la sesión almacenada localmente.');
  }
}
