import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Cita, CitaFiltro, CitaInput, EstadoCita, SlotDisponible } from '../models/appointment.model';

/**
 * Cliente HTTP de MedicalAppointments.Appointment. Versión reducida: solo
 * `Citas` (sin Estados_Cita ni Turnos, que quedan fuera de alcance).
 */
@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly base = environment.api.appointment;

  constructor(private readonly http: HttpClient) {}

  list(filtro: CitaFiltro): Observable<Cita[]> {
    let params = new HttpParams();
    Object.entries(filtro).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    });
    return this.http.get<Cita[]>(`${this.base}/appointments`, { params });
  }

  get(citaId: number): Observable<Cita> {
    return this.http.get<Cita>(`${this.base}/appointments/${citaId}`);
  }

  slots(medicoId: number, fecha: string): Observable<SlotDisponible[]> {
    return this.http.get<SlotDisponible[]>(`${this.base}/appointments/slots`, { params: { medicoId, fecha } });
  }

  create(input: CitaInput): Observable<Cita> {
    return this.http.post<Cita>(`${this.base}/appointments`, input);
  }

  update(citaId: number, input: Partial<CitaInput>): Observable<void> {
    return this.http.put<void>(`${this.base}/appointments/${citaId}`, input);
  }

  changeStatus(citaId: number, estado: EstadoCita): Observable<Cita> {
    return this.http.patch<Cita>(`${this.base}/appointments/${citaId}/estado`, { estado });
  }

  cancel(citaId: number, motivo?: string): Observable<Cita> {
    return this.http.post<Cita>(`${this.base}/appointments/${citaId}/cancelar`, { motivo });
  }
}
