import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AppointmentService } from '../../../core/services/appointment.service';
import { PatientService } from '../../../core/services/patient.service';
import { AuthService } from '../../../core/services/auth.service';
import { Cita } from '../../../core/models/appointment.model';
import { Paciente } from '../../../core/models/patient.model';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { InicialesPipe } from '../../../shared/pipes/iniciales.pipe';

const hoyISO = () => new Date().toISOString().slice(0, 10);

/** Índice del módulo clínico: citas en atención hoy + búsqueda rápida de expediente. */
@Component({
  selector: 'app-clinica-home',
  standalone: true,
  imports: [IconComponent, PageHeaderComponent, EmptyStateComponent, InicialesPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './clinica-home.component.html',
})
export class ClinicaHomeComponent {
  private readonly appointmentService = inject(AppointmentService);
  private readonly patientService = inject(PatientService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly enAtencion = signal<Cita[]>([]);
  protected readonly pendientes = signal<Cita[]>([]);

  protected readonly query = signal('');
  protected readonly resultados = signal<Paciente[]>([]);
  protected readonly buscando = signal(false);

  constructor() {
    this.appointmentService.list({ desde: hoyISO(), hasta: hoyISO() }).subscribe({
      next: (res) => {
        this.enAtencion.set(res.filter((c) => c.estado === 'En atencion'));
        this.pendientes.set(res.filter((c) => c.estado === 'Confirmada'));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private score(p: Paciente, q: string): number {
    const qn = q.toLowerCase().trim();
    const full = `${p.nombres} ${p.apellidos}`.toLowerCase();
    const nombres = p.nombres.toLowerCase();
    const apellidos = p.apellidos.toLowerCase();
    if (full === qn) return 100;
    if (full.startsWith(qn)) return 90;
    if (nombres.startsWith(qn) || apellidos.startsWith(qn)) return 80;
    if (full.split(/\s+/).some(w => w.startsWith(qn))) return 70;
    if (full.includes(qn)) return 60;
    if (p.numeroDocumento.toLowerCase().includes(qn)) return 40;
    return 10;
  }

  protected buscar(term: string): void {
    this.query.set(term);
    if (term.trim().length < 2) {
      this.resultados.set([]);
      return;
    }
    this.buscando.set(true);
    this.patientService.list({ page: 1, pageSize: 6, search: term }).subscribe((res) => {
      const q = term.toLowerCase().trim();
      const sorted = [...res.items].sort((a, b) => {
        const sa = this.score(a, q);
        const sb = this.score(b, q);
        if (sb !== sa) return sb - sa;
        return `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`);
      });
      this.resultados.set(sorted);
      this.buscando.set(false);
    });
  }

  protected irAExpediente(p: Paciente): void {
    this.router.navigate(['/clinica/expediente', p.pacienteId]);
  }

  protected irAAtencion(c: Cita): void {
    this.router.navigate(['/clinica/atencion', c.citaId]);
  }
}
