import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { AppointmentService } from '../../core/services/appointment.service';
import { PatientService } from '../../core/services/patient.service';
import { StaffService } from '../../core/services/staff.service';
import { Cita, EstadoCita, ESTADO_CITA_META } from '../../core/models/appointment.model';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { StatCardComponent } from '../../shared/ui/stat-card/stat-card.component';

interface BarraEstado { estado: EstadoCita; label: string; total: number; pct: number; color: string; }
interface BarraMedico { nombre: string; total: number; pct: number; }

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Reportes operativos: citas por estado, carga por médico y resumen de pacientes. */
@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [PageHeaderComponent, StatCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.css',
})
export class ReportesComponent {
  private readonly appointmentService = inject(AppointmentService);
  private readonly patientService = inject(PatientService);
  private readonly staffService = inject(StaffService);

  protected readonly loading = signal(true);
  protected readonly citas = signal<Cita[]>([]);
  protected readonly pacientesTotal = signal(0);
  protected readonly medicosActivos = signal(0);

  protected readonly porEstado = computed<BarraEstado[]>(() => {
    const list = this.citas();
    const total = list.length || 1;
    const estados: EstadoCita[] = ['Programada', 'Confirmada', 'En atencion', 'Atendida', 'Cancelada'];
    return estados.map((estado) => {
      const count = list.filter((c) => c.estado === estado).length;
      return { estado, label: ESTADO_CITA_META[estado].label, total: count, pct: Math.round((count / total) * 100), color: ESTADO_CITA_META[estado].color };
    }).filter((b) => b.total > 0);
  });

  protected readonly porMedico = computed<BarraMedico[]>(() => {
    const list = this.citas();
    const map = new Map<string, number>();
    for (const c of list) map.set(c.medicoNombre, (map.get(c.medicoNombre) ?? 0) + 1);
    const max = Math.max(1, ...map.values());
    return [...map.entries()]
      .map(([nombre, total]) => ({ nombre, total, pct: Math.round((total / max) * 100) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  });

  protected readonly tasaAtencion = computed(() => {
    const list = this.citas();
    if (list.length === 0) return 0;
    const atendidas = list.filter((c) => c.estado === 'Atendida').length;
    return Math.round((atendidas / list.length) * 100);
  });

  protected readonly tasaCancelacion = computed(() => {
    const list = this.citas();
    if (list.length === 0) return 0;
    const canceladas = list.filter((c) => c.estado === 'Cancelada').length;
    return Math.round((canceladas / list.length) * 100);
  });

  constructor() {
    const hoy = new Date();
    const hace30 = new Date();
    hace30.setDate(hoy.getDate() - 30);
    const futuro30 = new Date();
    futuro30.setDate(hoy.getDate() + 30);

    this.appointmentService.list({ desde: iso(hace30), hasta: iso(futuro30) }).subscribe({
      next: (res) => {
        this.citas.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.patientService.list({ page: 1, pageSize: 1 }).subscribe((res) => this.pacientesTotal.set(res.total));
    this.staffService.listDoctors({ page: 1, pageSize: 100 }).subscribe((res) => this.medicosActivos.set(res.items.filter((m) => m.activo).length));
  }
}
