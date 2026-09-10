import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { PatientService } from '../../core/services/patient.service';
import { AppointmentService } from '../../core/services/appointment.service';
import { Cita } from '../../core/models/appointment.model';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { StatCardComponent } from '../../shared/ui/stat-card/stat-card.component';
import { EstadoCitaBadgeComponent } from '../../shared/ui/estado-cita-badge/estado-cita-badge.component';
import { InicialesPipe } from '../../shared/pipes/iniciales.pipe';

interface Actividad {
  icon: string;
  tone: 'success' | 'brand' | 'purple';
  texto: string;
  hace: string;
}

const hoyISO = () => new Date().toISOString().slice(0, 10);

/** Página de inicio: resumen operativo del día, compuesto con datos de varios microservicios. */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, IconComponent, PageHeaderComponent, StatCardComponent, EstadoCitaBadgeComponent, InicialesPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  protected readonly auth = inject(AuthService);
  private readonly patientService = inject(PatientService);
  private readonly appointmentService = inject(AppointmentService);

  protected readonly loading = signal(true);
  protected readonly pacientesActivos = signal(0);
  protected readonly citasHoy = signal<Cita[]>([]);
  protected readonly citasTotalHoy = signal(0);

  protected readonly proximasCitas = computed(() =>
    this.citasHoy()
      .filter((c) => !['Cancelada', 'Atendida'].includes(c.estado))
      .sort((a, b) => a.hora.localeCompare(b.hora))
      .slice(0, 4),
  );

  protected readonly actividad: Actividad[] = [
    { icon: 'calendar', tone: 'success', texto: 'Cita creada para María José Pérez el 28/05/2026 a las 10:30', hace: 'Hace 5 min' },
    { icon: 'users', tone: 'brand', texto: 'Paciente Juan Carlos López actualizado por Ana Martínez', hace: 'Hace 25 min' },
    { icon: 'clipboard', tone: 'purple', texto: 'Registro clínico agregado a Roberto Sánchez', hace: 'Hace 1 hora' },
  ];

  constructor() {
    this.patientService.list({ page: 1, pageSize: 1 }).subscribe((res) => this.pacientesActivos.set(res.total));
    this.appointmentService.list({ desde: hoyISO(), hasta: hoyISO() }).subscribe((res) => {
      this.citasHoy.set(res);
      this.citasTotalHoy.set(res.length);
      this.loading.set(false);
    });
  }
}
