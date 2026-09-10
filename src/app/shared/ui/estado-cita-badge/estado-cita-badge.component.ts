import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { EstadoCita, ESTADO_CITA_META } from '../../../core/models/appointment.model';

/** Badge de color consistente para el estado de una cita, en toda la app. */
@Component({
  selector: 'ui-estado-cita-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="meta().badge"><span class="badge-dot"></span>{{ meta().label }}</span>`,
})
export class EstadoCitaBadgeComponent {
  readonly estado = input.required<EstadoCita>();

  protected meta() {
    return ESTADO_CITA_META[this.estado()];
  }
}
