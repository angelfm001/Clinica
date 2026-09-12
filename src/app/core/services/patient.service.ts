import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageQuery, PagedResult } from '../models/common.model';
import { ContactoEmergencia, ContactoEmergenciaInput, Paciente, PacienteFiltro, PacienteInput } from '../models/patient.model';

/** Cliente HTTP de MedicalAppointments.Patient. */
@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly baseUrl = `${environment.api.patient}/patients`;

  constructor(private readonly http: HttpClient) {}

  list(query: PageQuery & PacienteFiltro): Observable<PagedResult<Paciente>> {
    let params = new HttpParams()
      .set('page', query.page ?? 1)
      .set('pageSize', query.pageSize ?? 10);
    if (query.search) params = params.set('search', query.search);
    if (query.activo !== undefined) params = params.set('activo', String(query.activo));
    if (query.sexo) params = params.set('sexo', query.sexo);
    if (query.tipoDocumento) params = params.set('tipoDocumento', query.tipoDocumento);
    return this.http.get<PagedResult<Paciente>>(this.baseUrl, { params });
  }

  /** Endpoint batch usado por Appointment/MedicalRecord/Treatment para evitar N+1. */
  getByIds(ids: number[]): Observable<Paciente[]> {
    return this.http.get<Paciente[]>(this.baseUrl, { params: new HttpParams().set('ids', ids.join(',')) });
  }

  getById(pacienteId: number): Observable<Paciente> {
    return this.http.get<Paciente>(`${this.baseUrl}/${pacienteId}`);
  }

  searchByDocumento(numeroDocumento: string): Observable<Paciente> {
    return this.http.get<Paciente>(`${this.baseUrl}/search`, { params: { numeroDocumento } });
  }

  create(input: PacienteInput): Observable<Paciente> {
    return this.http.post<Paciente>(this.baseUrl, input);
  }

  update(pacienteId: number, input: PacienteInput): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${pacienteId}`, input);
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
