import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';

/** Contenedor con sub-navegación por pestañas para el módulo de Personal (Staff). */
@Component({
  selector: 'app-staff-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, IconComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header icon="clipboard" title="Personal" subtitle="Médicos, especialidades y consultorios de la clínica." />
    <div class="card">
      <div class="tabs no-print">
        <a class="tab" routerLink="medicos" routerLinkActive="active"><ui-icon name="stethoscope" [size]="15" /> Médicos</a>
        <a class="tab" routerLink="especialidades" routerLinkActive="active"><ui-icon name="layers" [size]="15" /> Especialidades</a>
        <a class="tab" routerLink="consultorios" routerLinkActive="active"><ui-icon name="building" [size]="15" /> Consultorios</a>
      </div>
      <router-outlet />
    </div>
  `,
})
export class StaffShellComponent {}
