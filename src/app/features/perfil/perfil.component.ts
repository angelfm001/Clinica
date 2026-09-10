import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { AuthService } from '../../core/services/auth.service';
import { StaffService } from '../../core/services/staff.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { InicialesPipe } from '../../shared/pipes/iniciales.pipe';

/** Perfil del usuario autenticado: datos de sesión y rol activo. */
@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [PageHeaderComponent, InicialesPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css',
})
export class PerfilComponent {
  protected readonly auth = inject(AuthService);
  private readonly staffService = inject(StaffService);

  protected readonly medicoVinculado = signal<string | null>(null);

  constructor() {
    const medicoId = this.auth.usuario()?.medicoId;
    if (medicoId) {
      this.staffService.getDoctor(medicoId).subscribe((m) => this.medicoVinculado.set(`Dr(a). ${m.nombres} ${m.apellidos} · ${m.especialidadNombre}`));
    }
  }
}
