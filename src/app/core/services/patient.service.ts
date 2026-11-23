import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, switchMap, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { PageQuery, PagedResult } from '../models/common.model';
import { ContactoEmergencia, ContactoEmergenciaInput, Paciente, PacienteFiltro, PacienteInput } from '../models/patient.model';
import { paginar } from './api-utils';

/**
 * Cliente HTTP de MedicalAppointments.Patient. Este microservicio responde sin
 * el sobre `HttpResponse<T>` y con los mismos nombres de campo que el modelo
 * de la interfaz. `GET /patients` devuelve la lista completa: los filtros y la
 * paginación se aplican aquí.
 */
@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly baseUrl = `${environment.api.patient}/patients`;

  constructor(private readonly http: HttpClient) {}

  /** Lista completa de pacientes (sin paginar). */
  all(): Observable<Paciente[]> {
    return this.http.get<Paciente[]>(this.baseUrl);
  }

  list(query: PageQuery & PacienteFiltro): Observable<PagedResult<Paciente>> {
    return this.all().pipe(
      map((todos) => {
        const base = todos
          .filter((p) =>
            (query.activo === undefined || p.activo === query.activo) &&
            (!query.sexo || p.sexo === query.sexo) &&
            (!query.tipoDocumento || p.tipoDocumento === query.tipoDocumento))
          .sort((a, b) => `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`));
        return paginar(base, query, (p) => `${p.nombres} ${p.apellidos} ${p.numeroDocumento} ${p.codigoPaciente} ${p.telefono ?? ''}`);
      }),
    );
  }

  getByIds(ids: number[]): Observable<Paciente[]> {
    return this.all().pipe(map((todos) => todos.filter((p) => ids.includes(p.pacienteId))));
  }

  getById(pacienteId: number): Observable<Paciente> {
    return this.http.get<Paciente>(`${this.baseUrl}/${pacienteId}`);
  }

  searchByDocumento(numeroDocumento: string): Observable<Paciente> {
    return this.all().pipe(
      switchMap((todos) => {
        const p = todos.find((x) => x.numeroDocumento === numeroDocumento);
        return p
          ? [p]
          : throwError(() => new HttpErrorResponse({ status: 404, error: { detail: 'Paciente no encontrado.' } }));
      }),
    );
  }

  /** `CodigoPaciente` es obligatorio en el backend: si el formulario no lo trae se genera el siguiente PAC-####. */
  create(input: PacienteInput): Observable<Paciente> {
    if (input.codigoPaciente) return this.http.post<Paciente>(this.baseUrl, input);
    return this.all().pipe(
      switchMap((todos) => {
        const max = todos.reduce((acc, p) => Math.max(acc, Number(/(\d+)$/.exec(p.codigoPaciente)?.[1] ?? 0)), 0);
        const codigoPaciente = `PAC-${String(max + 1).padStart(4, '0')}`;
        return this.http.post<Paciente>(this.baseUrl, { ...input, codigoPaciente });
      }),
    );
  }

  /** `UpdatePacienteCommand` también exige `CodigoPaciente`; se conserva el actual si el formulario no lo envía. */
  update(pacienteId: number, input: PacienteInput): Observable<void> {
    const enviar = (codigoPaciente: string) =>
      this.http.put<void>(`${this.baseUrl}/${pacienteId}`, { ...input, codigoPaciente });
    if (input.codigoPaciente) return enviar(input.codigoPaciente);
    return this.getById(pacienteId).pipe(switchMap((actual) => enviar(actual.codigoPaciente)));
  }

  deactivate(pacienteId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${pacienteId}`);
  }

  // ---------------------------------------------------- Contactos de emergencia
  listContacts(pacienteId: number): Observable<ContactoEmergencia[]> {
    return this.http.get<ContactoEmergencia[]>(`${this.baseUrl}/${pacienteId}/EmergencyContacts`);
  }

  createContact(pacienteId: number, input: ContactoEmergenciaInput): Observable<ContactoEmergencia> {
    return this.http.post<ContactoEmergencia>(`${this.baseUrl}/${pacienteId}/EmergencyContacts`, input);
  }

  updateContact(pacienteId: number, contactoEmergenciaId: number, input: ContactoEmergenciaInput): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${pacienteId}/EmergencyContacts/${contactoEmergenciaId}`, input);
  }

  deleteContact(pacienteId: number, contactoEmergenciaId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${pacienteId}/EmergencyContacts/${contactoEmergenciaId}`);
  }
}
