import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageQuery, PagedResult } from '../models/common.model';
import { Consultorio, DiaSemana, Especialidad, HorarioMedico, HorarioMedicoInput, Medico, MedicoInput } from '../models/staff.model';
import { ApiEnvelope, aHoraCorta, aTimeOnly, paginar, unwrap } from './api-utils';

// ------------------------------------------------ Formas de MedicalAppointments.Staff
interface EspecialidadApi { id: number; nombre: string; activo: boolean }
interface ConsultorioApi { id: number; nombre: string; ubicacion?: string | null; activo: boolean }
interface MedicoApi {
  id: number;
  nombres: string;
  apellidos: string;
  licencia: string;
  especialidadId: number;
  especialidad?: EspecialidadApi | null;
  telefono?: string | null;
  email?: string | null;
  activo: boolean;
}
interface HorarioApi {
  id: number;
  medicoId: number;
  /** System.DayOfWeek: 0 = domingo … 6 = sábado. */
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  consultorioId: number;
  consultorio?: ConsultorioApi | null;
  activo: boolean;
}

const aEspecialidad = (e: EspecialidadApi): Especialidad => ({ especialidadId: e.id, nombre: e.nombre, activo: e.activo });
const aConsultorio = (c: ConsultorioApi): Consultorio => ({
  consultorioId: c.id, nombre: c.nombre, ubicacion: c.ubicacion ?? null, activo: c.activo,
});
const aMedico = (m: MedicoApi): Medico => ({
  medicoId: m.id,
  nombres: m.nombres,
  apellidos: m.apellidos,
  licencia: m.licencia,
  especialidadId: m.especialidadId,
  especialidadNombre: m.especialidad?.nombre ?? '',
  telefono: m.telefono ?? null,
  email: m.email ?? null,
  activo: m.activo,
});

/** La interfaz usa ISO-8601 (1 = lunes … 7 = domingo); Staff usa System.DayOfWeek (0 = domingo). */
export const diaIsoADotNet = (dia: number): number => (dia === 7 ? 0 : dia);
export const diaDotNetAIso = (dia: number): DiaSemana => (dia === 0 ? 7 : dia) as DiaSemana;

const aHorario = (h: HorarioApi): HorarioMedico => ({
  horarioId: h.id,
  medicoId: h.medicoId,
  diaSemana: diaDotNetAIso(h.diaSemana),
  horaInicio: aHoraCorta(h.horaInicio),
  horaFin: aHoraCorta(h.horaFin),
  consultorioId: h.consultorioId,
  consultorioNombre: h.consultorio?.nombre ?? '',
  activo: h.activo,
});

const sinRespuesta = map(() => undefined as void);

/** Cliente HTTP de MedicalAppointments.Staff (todas las rutas exigen JWT). */
@Injectable({ providedIn: 'root' })
export class StaffService {
  private readonly base = environment.api.staff;

  constructor(private readonly http: HttpClient) {}

  // ------------------------------------------------------------------ Médicos
  allDoctors(): Observable<Medico[]> {
    return this.http.get<ApiEnvelope<MedicoApi[]>>(`${this.base}/doctors`).pipe(
      unwrap<MedicoApi[]>(),
      map((items) => items.map(aMedico)),
    );
  }

  listDoctors(query: PageQuery): Observable<PagedResult<Medico>> {
    return this.allDoctors().pipe(
      map((items) => paginar(items, query, (m) => `${m.nombres} ${m.apellidos} ${m.licencia} ${m.especialidadNombre ?? ''}`)),
    );
  }

  getDoctorsByIds(ids: number[]): Observable<Medico[]> {
    return this.allDoctors().pipe(map((items) => items.filter((m) => ids.includes(m.medicoId))));
  }

  getDoctor(medicoId: number): Observable<Medico> {
    return this.http.get<ApiEnvelope<MedicoApi>>(`${this.base}/doctors/${medicoId}`).pipe(unwrap<MedicoApi>(), map(aMedico));
  }

  createDoctor(input: MedicoInput): Observable<Medico> {
    return this.http.post<ApiEnvelope<MedicoApi>>(`${this.base}/doctors`, { ...input, especialidadId: Number(input.especialidadId) })
      .pipe(unwrap<MedicoApi>(), map(aMedico));
  }

  updateDoctor(medicoId: number, input: MedicoInput): Observable<void> {
    return this.http.put(`${this.base}/doctors/${medicoId}`, { ...input, especialidadId: Number(input.especialidadId) })
      .pipe(sinRespuesta);
  }

  deactivateDoctor(medicoId: number): Observable<void> {
    return this.http.delete(`${this.base}/doctors/${medicoId}`).pipe(sinRespuesta);
  }

  // ------------------------------------------------------------- Especialidades
  listSpecialties(): Observable<Especialidad[]> {
    return this.http.get<ApiEnvelope<EspecialidadApi[]>>(`${this.base}/specialties`).pipe(
      unwrap<EspecialidadApi[]>(),
      map((items) => items.map(aEspecialidad)),
    );
  }

  createSpecialty(input: Partial<Especialidad>): Observable<Especialidad> {
    return this.http.post<ApiEnvelope<EspecialidadApi>>(`${this.base}/specialties`, { nombre: input.nombre })
      .pipe(unwrap<EspecialidadApi>(), map(aEspecialidad));
  }

  updateSpecialty(id: number, input: Partial<Especialidad>): Observable<void> {
    return this.http.put(`${this.base}/specialties/${id}`, { nombre: input.nombre, activo: input.activo ?? true })
      .pipe(sinRespuesta);
  }

  deactivateSpecialty(id: number): Observable<void> {
    return this.http.delete(`${this.base}/specialties/${id}`).pipe(sinRespuesta);
  }

  // -------------------------------------------------------------- Consultorios
  listClinics(): Observable<Consultorio[]> {
    return this.http.get<ApiEnvelope<ConsultorioApi[]>>(`${this.base}/offices`).pipe(
      unwrap<ConsultorioApi[]>(),
      map((items) => items.map(aConsultorio)),
    );
  }

  createClinic(input: Partial<Consultorio>): Observable<Consultorio> {
    return this.http.post<ApiEnvelope<ConsultorioApi>>(`${this.base}/offices`, { nombre: input.nombre, ubicacion: input.ubicacion ?? null })
      .pipe(unwrap<ConsultorioApi>(), map(aConsultorio));
  }

  updateClinic(id: number, input: Partial<Consultorio>): Observable<void> {
    return this.http.put(`${this.base}/offices/${id}`, {
      nombre: input.nombre, ubicacion: input.ubicacion ?? null, activo: input.activo ?? true,
    }).pipe(sinRespuesta);
  }

  deactivateClinic(id: number): Observable<void> {
    return this.http.delete(`${this.base}/offices/${id}`).pipe(sinRespuesta);
  }

  // ------------------------------------------------------------------ Horarios
  listSchedules(medicoId: number): Observable<HorarioMedico[]> {
    return this.http.get<ApiEnvelope<HorarioApi[]>>(`${this.base}/doctors/${medicoId}/schedules`).pipe(
      unwrap<HorarioApi[]>(),
      map((items) => items.map(aHorario)),
    );
  }

  createSchedule(medicoId: number, input: HorarioMedicoInput): Observable<HorarioMedico> {
    return this.http.post<ApiEnvelope<HorarioApi>>(`${this.base}/doctors/${medicoId}/schedules`, this.horarioBody(input))
      .pipe(unwrap<HorarioApi>(), map(aHorario));
  }

  updateSchedule(medicoId: number, horarioId: number, input: HorarioMedicoInput): Observable<void> {
    return this.http.put(`${this.base}/doctors/${medicoId}/schedules/${horarioId}`, this.horarioBody(input)).pipe(sinRespuesta);
  }

  deleteSchedule(medicoId: number, horarioId: number): Observable<void> {
    return this.http.delete(`${this.base}/doctors/${medicoId}/schedules/${horarioId}`).pipe(sinRespuesta);
  }

  private horarioBody(input: HorarioMedicoInput) {
    return {
      diaSemana: diaIsoADotNet(Number(input.diaSemana)),
      horaInicio: aTimeOnly(input.horaInicio),
      horaFin: aTimeOnly(input.horaFin),
      consultorioId: Number(input.consultorioId),
      activo: input.activo ?? true,
    };
  }
}
