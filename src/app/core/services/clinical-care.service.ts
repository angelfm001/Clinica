import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageQuery, PagedResult } from '../models/common.model';
import {
  AbrirAtencionInput, Atencion, Medicamento, MedicamentoInput,
  NotaMedica, Prescripcion, PrescripcionInput, SignosVitales,
} from '../models/clinical-care.model';

/**
 * Cliente HTTP de MedicalAppointments.ClinicalCare — versión reducida que
 * fusiona lo que antes eran `MedicalRecord` y `Treatment` en un único
 * microservicio. No existen expediente, antecedentes, alergias, hábitos ni
 * catálogos de síntomas/CIE-10: el historial se obtiene de las atenciones del
 * paciente y el diagnóstico es texto libre dentro de la propia atención.
 */
@Injectable({ providedIn: 'root' })
export class ClinicalCareService {
  private readonly base = environment.api.clinicalCare;

  constructor(private readonly http: HttpClient) {}

  // ---------------------------------------------------------------- Atención
  /** Idempotente: si ya existe una atención abierta para la cita, la devuelve. */
  abrirAtencion(input: AbrirAtencionInput): Observable<Atencion> {
    return this.http.post<Atencion>(`${this.base}/consultations`, input);
  }

  getAtencionPorCita(citaId: number): Observable<Atencion> {
    return this.http.get<Atencion>(`${this.base}/consultations/by-cita/${citaId}`);
  }

  getAtencion(atencionId: number): Observable<Atencion> {
    return this.http.get<Atencion>(`${this.base}/consultations/${atencionId}`);
  }

  updateAtencion(atencionId: number, input: Partial<Atencion>): Observable<void> {
    return this.http.put<void>(`${this.base}/consultations/${atencionId}`, input);
  }

  saveVitals(atencionId: number, vitals: SignosVitales): Observable<SignosVitales> {
    return this.http.put<SignosVitales>(`${this.base}/consultations/${atencionId}/vitals`, vitals);
  }

  addNota(atencionId: number, nota: string): Observable<NotaMedica> {
    return this.http.post<NotaMedica>(`${this.base}/consultations/${atencionId}/notes`, { nota });
  }

  cerrarAtencion(atencionId: number): Observable<Atencion> {
    return this.http.post<Atencion>(`${this.base}/consultations/${atencionId}/close`, {});
  }

  /** Historial clínico del paciente: sus atenciones registradas, sin expediente aparte. */
  getAtencionesPaciente(pacienteId: number): Observable<Atencion[]> {
    return this.http.get<Atencion[]>(`${this.base}/consultations/patient/${pacienteId}`);
  }

  // ---------------------------------------------------------------- Treatment
  listMedicamentos(query: PageQuery): Observable<PagedResult<Medicamento>> {
    let params = new HttpParams().set('page', query.page ?? 1).set('pageSize', query.pageSize ?? 10);
    if (query.search) params = params.set('search', query.search);
    return this.http.get<PagedResult<Medicamento>>(`${this.base}/medications`, { params });
  }

  createMedicamento(input: MedicamentoInput): Observable<Medicamento> {
    return this.http.post<Medicamento>(`${this.base}/medications`, input);
  }

  updateMedicamento(id: number, input: MedicamentoInput): Observable<void> {
    return this.http.put<void>(`${this.base}/medications/${id}`, input);
  }

  deactivateMedicamento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/medications/${id}`);
  }

  createPrescripcion(input: PrescripcionInput): Observable<Prescripcion> {
    return this.http.post<Prescripcion>(`${this.base}/prescriptions`, input);
  }

  getPrescripcion(id: number): Observable<Prescripcion> {
    return this.http.get<Prescripcion>(`${this.base}/prescriptions/${id}`);
  }

  listByPaciente(pacienteId: number): Observable<Prescripcion[]> {
    return this.http.get<Prescripcion[]>(`${this.base}/prescriptions/patient/${pacienteId}`);
  }
}
