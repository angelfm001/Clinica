import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageQuery, PagedResult } from '../models/common.model';
import { Consultorio, Especialidad, HorarioMedico, HorarioMedicoInput, Medico, MedicoInput } from '../models/staff.model';

/** Cliente HTTP de MedicalAppointments.Staff. */
@Injectable({ providedIn: 'root' })
export class StaffService {
  private readonly base = environment.api.staff;

  constructor(private readonly http: HttpClient) {}

  // ------------------------------------------------------------------ Médicos
  listDoctors(query: PageQuery): Observable<PagedResult<Medico>> {
    let params = new HttpParams().set('page', query.page ?? 1).set('pageSize', query.pageSize ?? 10);
    if (query.search) params = params.set('search', query.search);
    return this.http.get<PagedResult<Medico>>(`${this.base}/doctors`, { params });
  }

  getDoctorsByIds(ids: number[]): Observable<Medico[]> {
    return this.http.get<Medico[]>(`${this.base}/doctors`, { params: new HttpParams().set('ids', ids.join(',')) });
  }

  getDoctor(medicoId: number): Observable<Medico> {
    return this.http.get<Medico>(`${this.base}/doctors/${medicoId}`);
  }

  createDoctor(input: MedicoInput): Observable<Medico> {
    return this.http.post<Medico>(`${this.base}/doctors`, input);
  }

  updateDoctor(medicoId: number, input: MedicoInput): Observable<void> {
    return this.http.put<void>(`${this.base}/doctors/${medicoId}`, input);
  }

  deactivateDoctor(medicoId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/doctors/${medicoId}`);
  }

  // ------------------------------------------------------------- Especialidades
  listSpecialties(): Observable<Especialidad[]> {
    return this.http.get<Especialidad[]>(`${this.base}/specialties`);
  }

  createSpecialty(input: Partial<Especialidad>): Observable<Especialidad> {
    return this.http.post<Especialidad>(`${this.base}/specialties`, input);
  }

  updateSpecialty(id: number, input: Partial<Especialidad>): Observable<void> {
    return this.http.put<void>(`${this.base}/specialties/${id}`, input);
  }

  deactivateSpecialty(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/specialties/${id}`);
  }

  // -------------------------------------------------------------- Consultorios
  listClinics(): Observable<Consultorio[]> {
    return this.http.get<Consultorio[]>(`${this.base}/clinics`);
  }

  createClinic(input: Partial<Consultorio>): Observable<Consultorio> {
    return this.http.post<Consultorio>(`${this.base}/clinics`, input);
  }

  updateClinic(id: number, input: Partial<Consultorio>): Observable<void> {
    return this.http.put<void>(`${this.base}/clinics/${id}`, input);
  }

  deactivateClinic(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/clinics/${id}`);
  }

  // ------------------------------------------------------------------ Horarios
  listSchedules(medicoId: number): Observable<HorarioMedico[]> {
    return this.http.get<HorarioMedico[]>(`${this.base}/doctors/${medicoId}/schedules`);
  }

  createSchedule(medicoId: number, input: HorarioMedicoInput): Observable<HorarioMedico> {
    return this.http.post<HorarioMedico>(`${this.base}/doctors/${medicoId}/schedules`, input);
  }

  updateSchedule(medicoId: number, horarioId: number, input: HorarioMedicoInput): Observable<void> {
    return this.http.put<void>(`${this.base}/doctors/${medicoId}/schedules/${horarioId}`, input);
  }

  deleteSchedule(medicoId: number, horarioId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/doctors/${medicoId}/schedules/${horarioId}`);
  }
}
