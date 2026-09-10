import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';

import { AppointmentService } from '../../../core/services/appointment.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { Cita } from '../../../core/models/appointment.model';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { EstadoCitaBadgeComponent } from '../../../shared/ui/estado-cita-badge/estado-cita-badge.component';

/** Panel lateral con el detalle de una cita y sus acciones de cambio de estado. */
@Component({
  selector: 'app-cita-detalle-panel',
  standalone: true,
  imports: [IconComponent, EstadoCitaBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cita-detalle-panel.component.html',
  styleUrl: './cita-detalle-panel.component.css',
})
export class CitaDetallePanelComponent {
  private readonly appointmentService = inject(AppointmentService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  readonly cita = input<Cita | null>(null);
  readonly close = output<void>();
  readonly changed = output<void>();

  protected confirmar(): void {
    this.cambiarEstado('Confirmada');
  }

  protected iniciarAtencion(): void {
    this.cambiarEstado('En atencion');
  }

  protected async marcarAtendida(): Promise<void> {
    const c = this.cita();
    if (!c) return;
    const confirmed = await this.confirm.ask({ title: 'Marcar como atendida', message: '¿Confirmas que la atención de esta cita ha finalizado?', confirmLabel: 'Marcar atendida' });
    if (!confirmed) return;
    this.cambiarEstado('Atendida');
  }

  protected async cancelar(): Promise<void> {
    const c = this.cita();
    if (!c) return;
    const confirmed = await this.confirm.ask({ title: 'Cancelar cita', message: `¿Cancelar la cita de ${c.pacienteNombre}?`, tone: 'danger', confirmLabel: 'Cancelar cita' });
    if (!confirmed) return;
    this.appointmentService.cancel(c.citaId).subscribe(() => {
      this.toast.success('Cita cancelada.');
      this.changed.emit();
      this.close.emit();
    });
  }

  private cambiarEstado(estado: Cita['estado']): void {
    const c = this.cita();
    if (!c) return;
    this.appointmentService.changeStatus(c.citaId, estado).subscribe(() => {
      this.toast.success(`Cita actualizada a "${estado}".`);
      this.changed.emit();
    });
  }

  protected irAAtencion(): void {
    const c = this.cita();
    if (!c) return;
    this.router.navigate(['/clinica/atencion', c.citaId]);
  }
}
