import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Cita, CitaFiltro, CitaInput, DURACION_CITA_MIN, EstadoCita, SlotDisponible } from '../models/appointment.model';
import { Paciente } from '../models/patient.model';
import { Consultorio, Medico } from '../models/staff.model';
import { ApiEnvelope, separarFechaHora, unwrap } from './api-utils';
import { PatientService } from './patient.service';
import { StaffService, diaDotNetAIso } from './staff.service';

/** Estado tal como lo serializa Appointment (enum EstadoCita como texto). */
type EstadoCitaApi = 'Programada' | 'Confirmada' | 'EnAtencion' | 'Atendida' | 'Cancelada';

/** Entidad `Cita` de MedicalAppointments.Appointment. */
export interface CitaApi {
  id: number;
  pacienteId: number;
  medicoId: number;
  consultorioId: number;
  fechaHora: string;
  motivo: string | null;
  estado: EstadoCitaApi;
  observacion: string | null;
}

const aEstadoUi = (estado: EstadoCitaApi): EstadoCita => (estado === 'EnAtencion' ? 'En atencion' : estado);
const aEstadoApi = (estado: EstadoCita): EstadoCitaApi => (estado === 'En atencion' ? 'EnAtencion' : estado);

/** Estados que mantienen ocupado el horario del médico. */
const ESTADOS_QUE_OCUPAN: EstadoCitaApi[] = ['Programada', 'Confirmada', 'EnAtencion', 'Atendida'];

interface Catalogos {
  pacientes: Map<number, Paciente>;
  medicos: Map<number, Medico>;
  consultorios: Map<number, Consultorio>;
}

/**
 * Cliente HTTP de MedicalAppointments.Appointment. La cita solo persiste los
 * IDs de paciente, médico y consultorio: los nombres que muestra la agenda se
 * componen aquí consultando Patient y Staff en un solo lote (sin N+1).
 */
@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly base = environment.api.appointment;

  constructor(
    private readonly http: HttpClient,
    private readonly patients: PatientService,
    private readonly staff: StaffService,
  ) {}

  /** Citas tal como las devuelve Appointment, sin componer nombres. */
  citasApi(filtro: { pacienteId?: number; medicoId?: number } = {}): Observable<CitaApi[]> {
    let params = new HttpParams();
    if (filtro.pacienteId) params = params.set('pacienteId', filtro.pacienteId);
    if (filtro.medicoId) params = params.set('medicoId', filtro.medicoId);
    return this.http.get<ApiEnvelope<CitaApi[]>>(`${this.base}/appointments`, { params }).pipe(unwrap<CitaApi[]>());
  }

  private catalogos(): Observable<Catalogos> {
    return forkJoin({
      pacientes: this.patients.all(),
      medicos: this.staff.allDoctors(),
      consultorios: this.staff.listClinics(),
    }).pipe(
      map(({ pacientes, medicos, consultorios }) => ({
        pacientes: new Map(pacientes.map((p) => [p.pacienteId, p])),
        medicos: new Map(medicos.map((m) => [m.medicoId, m])),
        consultorios: new Map(consultorios.map((c) => [c.consultorioId, c])),
      })),
    );
  }

  private aCita(c: CitaApi, cat: Catalogos): Cita {
    const paciente = cat.pacientes.get(c.pacienteId);
    const medico = cat.medicos.get(c.medicoId);
    const { fecha, hora } = separarFechaHora(c.fechaHora);
    return {
      citaId: c.id,
      pacienteId: c.pacienteId,
      pacienteNombre: paciente ? `${paciente.nombres} ${paciente.apellidos}` : `Paciente #${c.pacienteId}`,
      pacienteDocumento: paciente?.numeroDocumento,
      medicoId: c.medicoId,
      medicoNombre: medico ? `Dr(a). ${medico.nombres} ${medico.apellidos}` : `Médico #${c.medicoId}`,
      especialidadNombre: medico?.especialidadNombre ?? '',
      consultorioId: c.consultorioId,
      consultorioNombre: cat.consultorios.get(c.consultorioId)?.nombre ?? `Consultorio #${c.consultorioId}`,
      fecha,
      hora,
      motivo: c.motivo,
      estado: aEstadoUi(c.estado),
      observacion: c.observacion,
    };
  }

  private enriquecer(citas: CitaApi[]): Observable<Cita[]> {
    if (!citas.length) return of([]);
    return this.catalogos().pipe(map((cat) => citas.map((c) => this.aCita(c, cat))));
  }

  list(filtro: CitaFiltro): Observable<Cita[]> {
    return this.citasApi({ pacienteId: filtro.pacienteId, medicoId: filtro.medicoId }).pipe(
      map((citas) =>
        citas
          .filter((c) => {
            const { fecha } = separarFechaHora(c.fechaHora);
            return (!filtro.desde || fecha >= filtro.desde)
              && (!filtro.hasta || fecha <= filtro.hasta)
              && (!filtro.estado || aEstadoUi(c.estado) === filtro.estado);
          })
          .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora)),
      ),
      switchMap((citas) => this.enriquecer(citas)),
    );
  }

  getApi(citaId: number): Observable<CitaApi> {
    return this.http.get<ApiEnvelope<CitaApi>>(`${this.base}/appointments/${citaId}`).pipe(unwrap<CitaApi>());
  }

  get(citaId: number): Observable<Cita> {
    return this.getApi(citaId).pipe(
      switchMap((c) => this.enriquecer([c])),
      map(([cita]) => cita),
    );
  }

  /**
   * Horarios libres del médico en una fecha: bloques de DURACION_CITA_MIN dentro
   * de sus horarios de Staff, marcando como ocupados los que ya tienen cita.
   */
  slots(medicoId: number, fecha: string): Observable<SlotDisponible[]> {
    return forkJoin({
      horarios: this.staff.listSchedules(medicoId),
      citas: this.citasApi({ medicoId }),
    }).pipe(
      map(({ horarios, citas }) => {
        const dia = diaDotNetAIso(new Date(`${fecha}T00:00:00`).getDay());
        const ocupadas = new Set(
          citas
            .filter((c) => ESTADOS_QUE_OCUPAN.includes(c.estado))
            .map((c) => separarFechaHora(c.fechaHora))
            .filter((fh) => fh.fecha === fecha)
            .map((fh) => fh.hora),
        );
        const slots: SlotDisponible[] = [];
        horarios
          .filter((h) => h.activo && h.diaSemana === dia)
          .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
          .forEach((h) => {
            for (let min = aMinutos(h.horaInicio); min + DURACION_CITA_MIN <= aMinutos(h.horaFin); min += DURACION_CITA_MIN) {
              const hora = aHora(min);
              slots.push({ hora, disponible: !ocupadas.has(hora), consultorioId: h.consultorioId });
            }
          });
        return slots;
      }),
    );
  }

  create(input: CitaInput): Observable<Cita> {
    const body = {
      pacienteId: Number(input.pacienteId),
      medicoId: Number(input.medicoId),
      consultorioId: Number(input.consultorioId),
      fechaHora: `${input.fecha}T${input.hora}:00`,
      // Motivo es obligatorio en CreateCitaCommand.
      motivo: input.motivo?.trim() || 'Consulta general',
    };
    return this.http.post<ApiEnvelope<CitaApi>>(`${this.base}/appointments`, body).pipe(
      unwrap<CitaApi>(),
      switchMap((c) => this.enriquecer([c])),
      map(([cita]) => cita),
    );
  }

  /** Appointment no permite editar una cita ya agendada (solo cambiar su estado). */
  update(_citaId: number, _input: Partial<CitaInput>): Observable<void> {
    return throwError(() => new HttpErrorResponse({
      status: 400,
      error: { detail: 'El microservicio de citas no permite editar una cita; cancélala y agenda una nueva.' },
    }));
  }

  changeStatus(citaId: number, estado: EstadoCita, observacion?: string | null): Observable<Cita> {
    return this.http
      .patch<ApiEnvelope<CitaApi>>(`${this.base}/appointments/${citaId}/estado`, { estado: aEstadoApi(estado), observacion: observacion ?? null })
      .pipe(
        unwrap<CitaApi>(),
        switchMap((c) => this.enriquecer([c])),
        map(([cita]) => cita),
      );
  }

  cancel(citaId: number, motivo?: string): Observable<Cita> {
    return this.changeStatus(citaId, 'Cancelada', motivo ?? null);
  }
}

function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function aHora(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}
