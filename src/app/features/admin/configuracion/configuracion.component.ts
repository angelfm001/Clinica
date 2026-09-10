import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { environment } from '../../../../environments/environment';

/** Configuración general de la aplicación: apariencia y estado de integración con microservicios. */
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

  protected readonly useMock = environment.useMock;
  protected readonly servicios = [
    { nombre: 'Security', url: environment.api.security },
    { nombre: 'Patient', url: environment.api.patient },
    { nombre: 'Staff', url: environment.api.staff },
    { nombre: 'Appointment', url: environment.api.appointment },
    { nombre: 'ClinicalCare', url: environment.api.clinicalCare },
  ];

  protected clearCache(): void {
    sessionStorage.removeItem('cm.session');
    this.toast.info('Se limpió la sesión almacenada localmente.');
  }
}
