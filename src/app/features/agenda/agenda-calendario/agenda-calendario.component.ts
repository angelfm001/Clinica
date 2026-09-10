import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AppointmentService } from '../../../core/services/appointment.service';
import { StaffService } from '../../../core/services/staff.service';
import { Cita, DURACION_CITA_MIN, ESTADO_CITA_META } from '../../../core/models/appointment.model';
import { Especialidad, Medico } from '../../../core/models/staff.model';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { EstadoCitaBadgeComponent } from '../../../shared/ui/estado-cita-badge/estado-cita-badge.component';
import { InicialesPipe } from '../../../shared/pipes/iniciales.pipe';
import { CitaFormModalComponent } from '../cita-form-modal/cita-form-modal.component';
import { CitaDetallePanelComponent } from '../cita-detalle-panel/cita-detalle-panel.component';

const iso = (d: Date) => d.toISOString().slice(0, 10);
function startOfWeek(d: Date): Date {
  const c = new Date(d);
  const offset = (c.getDay() + 6) % 7;
  c.setDate(c.getDate() - offset);
  return c;
}

const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Franja horaria visible en la cuadrícula semanal (08:00 a 18:00). */
const HOUR_START = 8;
const HOUR_END = 18;

type Vista = 'semana' | 'dia' | 'mes';

interface BloqueCita {
  cita: Cita;
  top: number;
  height: number;
}

/** Calendario de citas: vista semana (cuadrícula por horas), día y mes, con filtros. */
@Component({
  selector: 'app-agenda-calendario',
  standalone: true,
  imports: [IconComponent, PageHeaderComponent, EmptyStateComponent, EstadoCitaBadgeComponent, InicialesPipe, CitaFormModalComponent, CitaDetallePanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './agenda-calendario.component.html',
  styleUrl: './agenda-calendario.component.css',
})
export class AgendaCalendarioComponent {
  private readonly appointmentService = inject(AppointmentService);
  private readonly staffService = inject(StaffService);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(true);
  protected readonly citas = signal<Cita[]>([]);
  protected readonly medicos = signal<Medico[]>([]);
  protected readonly especialidades = signal<Especialidad[]>([]);

  protected readonly vista = signal<Vista>('semana');
  protected readonly selectedDate = signal(iso(new Date()));
  protected readonly weekStart = signal(startOfWeek(new Date()));
  protected readonly monthCursor = signal(new Date());
  protected readonly filtroMedico = signal(0);
  protected readonly filtroEspecialidad = signal(0);

  protected readonly modalOpen = signal(false);
  protected readonly citaSeleccionada = signal<Cita | null>(null);

  protected readonly horas = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  /** Los 7 días de la semana en curso (Lunes a Domingo). */
  protected readonly weekDays = computed(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(this.weekStart());
    d.setDate(d.getDate() + i);
    return d;
  }));

  /** Los 7 días de la semana (Lunes a Domingo) con scroll horizontal. */
  protected readonly gridDays = computed(() => this.weekDays());

  /**
   * Citas del rango cargado, con los filtros de médico/especialidad aplicados.
   * La Cita ya no almacena `especialidadId` (Appointment solo guarda IDs de
   * Paciente, Médico y Consultorio); el filtro por especialidad se resuelve
   * en el cliente a partir de la especialidad única del médico (Staff).
   */
  protected readonly citasFiltradasRango = computed(() => {
    let list = this.citas();
    if (this.filtroMedico()) list = list.filter((c) => c.medicoId === this.filtroMedico());
    if (this.filtroEspecialidad()) {
      const medicosDeEspecialidad = new Set(
        this.medicos().filter((m) => m.especialidadId === this.filtroEspecialidad()).map((m) => m.medicoId),
      );
      list = list.filter((c) => medicosDeEspecialidad.has(c.medicoId));
    }
    return list;
  });

  /** Citas del día seleccionado (usado en la vista Día y en el resumen lateral). */
  protected readonly citasFiltradas = computed(() =>
    this.citasFiltradasRango().filter((c) => c.fecha === this.selectedDate()).sort((a, b) => a.hora.localeCompare(b.hora)),
  );

  protected readonly totalCitasDia = computed(() => this.citasFiltradas().length);
  protected readonly confirmadasDia = computed(() => this.citasFiltradas().filter((c) => c.estado === 'Confirmada').length);
  protected readonly porConfirmarDia = computed(() => this.citasFiltradas().filter((c) => c.estado === 'Programada').length);

  /** Próximas citas de HOY (no del día seleccionado), para el panel lateral. */
  protected readonly proximasHoy = computed(() => {
    const hoyIso = iso(new Date());
    return this.citasFiltradasRango()
      .filter((c) => c.fecha === hoyIso && !['Cancelada', 'Atendida'].includes(c.estado))
      .sort((a, b) => a.hora.localeCompare(b.hora))
      .slice(0, 6);
  });

  protected readonly monthGrid = computed(() => {
    const c = this.monthCursor();
    const firstOfMonth = new Date(c.getFullYear(), c.getMonth(), 1);
    const gridStart = startOfWeek(firstOfMonth);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  });

  constructor() {
    this.staffService.listDoctors({ page: 1, pageSize: 100 }).subscribe((res) => this.medicos.set(res.items));
    this.staffService.listSpecialties().subscribe((res) => this.especialidades.set(res));
    this.load();

    if (this.route.snapshot.queryParamMap.get('nueva')) {
      this.modalOpen.set(true);
    }
  }

  private rangoActual(): { desde: string; hasta: string } {
    if (this.vista() === 'mes') {
      const c = this.monthCursor();
      const start = new Date(c.getFullYear(), c.getMonth(), 1);
      const end = new Date(c.getFullYear(), c.getMonth() + 1, 0);
      return { desde: iso(start), hasta: iso(end) };
    }
    return { desde: iso(this.weekStart()), hasta: iso(this.weekDays()[6]) };
  }

  private load(): void {
    this.loading.set(true);
    const { desde, hasta } = this.rangoActual();
    this.appointmentService.list({ desde, hasta }).subscribe({
      next: (res) => {
        this.citas.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // -------------------------------------------------------------- Vista / nav
  protected setVista(v: Vista): void {
    this.vista.set(v);
    this.load();
  }

  protected navPrev(): void { this.nav(-1); }
  protected navNext(): void { this.nav(1); }

  private nav(delta: number): void {
    if (this.vista() === 'mes') {
      const d = new Date(this.monthCursor());
      d.setMonth(d.getMonth() + delta);
      this.monthCursor.set(d);
    } else if (this.vista() === 'dia') {
      const d = new Date(this.selectedDate());
      d.setDate(d.getDate() + delta);
      this.selectedDate.set(iso(d));
      this.weekStart.set(startOfWeek(d));
    } else {
      const d = new Date(this.weekStart());
      d.setDate(d.getDate() + delta * 7);
      this.weekStart.set(d);
    }
    this.load();
  }

  protected goToday(): void {
    const hoy = new Date();
    this.weekStart.set(startOfWeek(hoy));
    this.selectedDate.set(iso(hoy));
    this.monthCursor.set(hoy);
    this.load();
  }

  protected selectDay(d: Date): void {
    this.selectedDate.set(iso(d));
  }

  protected verAgendaCompleta(): void {
    this.setVista('dia');
    this.selectDay(new Date());
  }

  protected selectMonthDay(d: Date): void {
    this.selectedDate.set(iso(d));
    this.weekStart.set(startOfWeek(d));
    this.vista.set('dia');
    this.load();
  }

  // ------------------------------------------------------------------ Grid
  protected bloquesDelDia(d: Date): BloqueCita[] {
    const totalMin = (HOUR_END - HOUR_START) * 60;
    const fecha = iso(d);
    return this.citasFiltradasRango()
      .filter((c) => c.fecha === fecha)
      .map((c) => {
        const [h, m] = c.hora.split(':').map(Number);
        const startMin = (h - HOUR_START) * 60 + m;
        const endMin = startMin + DURACION_CITA_MIN;
        return {
          cita: c,
          top: Math.min(100, Math.max(0, (startMin / totalMin) * 100)),
          height: Math.max(6, ((endMin - startMin) / totalMin) * 100),
        };
      });
  }

  protected colorDeEstado(cita: Cita): string {
    return ESTADO_CITA_META[cita.estado].color;
  }

  /** Posición (%) de la línea de "ahora" dentro de la cuadrícula, si hoy está en la semana visible. */
  protected nowTopPercent(): number | null {
    const hoy = new Date();
    if (!this.gridDays().some((d) => iso(d) === iso(hoy))) return null;
    const totalMin = (HOUR_END - HOUR_START) * 60;
    const nowMin = (hoy.getHours() - HOUR_START) * 60 + hoy.getMinutes();
    if (nowMin < 0 || nowMin > totalMin) return null;
    return (nowMin / totalMin) * 100;
  }

  protected nowLabel(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  protected esHoy(d: Date): boolean {
    return iso(d) === iso(new Date());
  }

  // --------------------------------------------------------------- Acciones
  protected openNueva(): void {
    this.modalOpen.set(true);
  }

  protected onCitaCreada(): void {
    this.load();
  }

  protected openDetalle(c: Cita): void {
    this.citaSeleccionada.set(c);
  }

  protected onDetalleChanged(): void {
    this.load();
    const actual = this.citaSeleccionada();
    if (actual) {
      this.appointmentService.get(actual.citaId).subscribe((c) => this.citaSeleccionada.set(c));
    }
  }

  // ------------------------------------------------------------------ Texto
  protected dow(d: Date): string {
    return DOW[d.getDay()];
  }

  protected isoOf(d: Date): string {
    return iso(d);
  }

  protected countFor(d: Date): number {
    return this.citasFiltradasRango().filter((c) => c.fecha === iso(d)).length;
  }

  protected selectedDateLabel(): string {
    const [y, m, d] = this.selectedDate().split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return `${DOW[date.getDay()]} ${d} de ${MESES[m - 1]}`;
  }

  protected weekRangeLabel(): string {
    const days = this.gridDays();
    const first = days[0];
    const last = days[days.length - 1];
    const sameMonth = first.getMonth() === last.getMonth();
    return sameMonth
      ? `${first.getDate()} - ${last.getDate()} ${cap(MESES[last.getMonth()])} ${last.getFullYear()}`
      : `${first.getDate()} ${MESES[first.getMonth()]} - ${last.getDate()} ${cap(MESES[last.getMonth()])} ${last.getFullYear()}`;
  }

  protected monthLabel(): string {
    const c = this.monthCursor();
    return `${cap(MESES[c.getMonth()])} ${c.getFullYear()}`;
  }

  protected periodLabel(): string {
    if (this.vista() === 'mes') return this.monthLabel();
    if (this.vista() === 'dia') return this.selectedDateLabel();
    return this.weekRangeLabel();
  }

  protected isCurrentMonth(d: Date): boolean {
    return d.getMonth() === this.monthCursor().getMonth();
  }

  /** Para el panel "Próximas hoy": "AHORA" si la cita está en curso, si no la hora formateada. */
  protected badgeLabel(c: Cita): string {
    if (c.estado === 'En atencion') return 'AHORA';
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const [h, m] = c.hora.split(':').map(Number);
    const horaMin = h * 60 + m;
    if (iso(now) === c.fecha && horaMin <= nowMin && horaMin + DURACION_CITA_MIN >= nowMin) return 'AHORA';
    return c.hora;
  }

  protected esAhora(c: Cita): boolean {
    return this.badgeLabel(c) === 'AHORA';
  }
}
