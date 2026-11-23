import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageQuery, PagedResult } from '../models/common.model';
import {
  AbrirAtencionInput, Alergia, AlergiaInput, Antecedente, AntecedenteInput, Atencion, EstadoAtencion,
  ExpedienteClinico, HabitosExpediente, Medicamento, MedicamentoInput, NotaMedica, Prescripcion,
  PrescripcionInput, SeveridadAlergia, SignosVitales, TipoAlergia, TipoAntecedente, ViaAdministracion,
} from '../models/clinical-care.model';
import { Paciente } from '../models/patient.model';
import { Medico } from '../models/staff.model';
import { ApiEnvelope, paginar, unwrap } from './api-utils';
import { AppointmentService, CitaApi } from './appointment.service';
import { PatientService } from './patient.service';
import { StaffService } from './staff.service';

// -------------------------------------------- Formas de MedicalAppointments.ClinicalCare
interface MedicamentoApi {
  id: number;
  nombre: string;
  principioActivo?: string | null;
  presentacion?: string | null;
  concentracion?: string | null;
  activo: boolean;
}
interface SignoVitalApi {
  id: number;
  atencionId: number;
  presionArterial?: string | null;
  frecuenciaCardiaca?: number | null;
  temperatura?: number | null;
  saturacionOxigeno?: number | null;
  peso?: number | null;
  talla?: number | null;
}
interface NotaMedicaApi { id: number; atencionId: number; nota: string; fechaHora: string }
interface PrescripcionDetalleApi {
  id: number;
  medicamentoId: number;
  medicamento?: MedicamentoApi | null;
  dosis: string;
  frecuencia: string;
  duracion: string;
  viaAdministracion?: string | null;
}
interface PrescripcionApi {
  id: number;
  atencionId: number;
  pacienteId: number;
  fecha: string;
  indicacionesGenerales?: string | null;
  detalles: PrescripcionDetalleApi[];
}
interface AtencionApi {
  id: number;
  citaId: number;
  pacienteId: number;
  medicoId: number;
  fechaHora: string;
  diagnostico?: string | null;
  estado: EstadoAtencion;
  signosVitales?: SignoVitalApi[];
  notasMedicas?: NotaMedicaApi[];
  prescripciones?: PrescripcionApi[];
}

interface AlergiaApi {
  id: number;
  sustancia: string;
  tipo: TipoAlergia;
  severidad: SeveridadAlergia;
  reaccion?: string | null;
  fechaRegistro: string;
}
interface AntecedenteApi {
  id: number;
  tipo: TipoAntecedente;
  descripcion: string;
  parentesco?: string | null;
  fechaDiagnostico?: string | null;
  fechaRegistro: string;
}
interface ExpedienteApi extends HabitosExpediente {
  id: number;
  pacienteId: number;
  numeroExpediente: string;
  fechaApertura: string;
  alergias?: AlergiaApi[];
  antecedentes?: AntecedenteApi[];
}

interface Contexto {
  pacientes: Map<number, Paciente>;
  medicos: Map<number, Medico>;
  citas: Map<number, CitaApi>;
}

const aMedicamento = (m: MedicamentoApi): Medicamento => ({
  medicamentoId: m.id,
  nombre: m.nombre,
  principioActivo: m.principioActivo ?? '',
  presentacion: m.presentacion ?? '',
  concentracion: m.concentracion ?? '',
  activo: m.activo,
});

const aSignos = (s: SignoVitalApi): SignosVitales => ({
  signosVitalesId: s.id,
  atencionId: s.atencionId,
  presionArterial: s.presionArterial ?? null,
  frecuenciaCardiaca: s.frecuenciaCardiaca ?? null,
  temperatura: s.temperatura ?? null,
  saturacionOxigeno: s.saturacionOxigeno ?? null,
  peso: s.peso ?? null,
  talla: s.talla ?? null,
});

/** DateTime de .NET (con o sin zona) → 'yyyy-MM-dd HH:mm', como se muestra en la ficha. */
const fechaCorta = (valor: string) => valor.replace('T', ' ').slice(0, 16);

const aAlergia = (a: AlergiaApi): Alergia => ({
  alergiaId: a.id,
  sustancia: a.sustancia,
  tipo: a.tipo,
  severidad: a.severidad,
  reaccion: a.reaccion ?? null,
  fechaRegistro: fechaCorta(a.fechaRegistro),
});

const aAntecedente = (a: AntecedenteApi): Antecedente => ({
  antecedenteId: a.id,
  tipo: a.tipo,
  descripcion: a.descripcion,
  parentesco: a.parentesco ?? null,
  fechaDiagnostico: a.fechaDiagnostico ? a.fechaDiagnostico.slice(0, 10) : null,
  fechaRegistro: fechaCorta(a.fechaRegistro),
});

const aExpediente = (e: ExpedienteApi): ExpedienteClinico => ({
  expedienteId: e.id,
  pacienteId: e.pacienteId,
  numeroExpediente: e.numeroExpediente,
  fechaApertura: fechaCorta(e.fechaApertura),
  tabaquismo: e.tabaquismo ?? null,
  consumoAlcohol: e.consumoAlcohol ?? null,
  actividadFisica: e.actividadFisica ?? null,
  alimentacion: e.alimentacion ?? null,
  observaciones: e.observaciones ?? null,
  alergias: (e.alergias ?? []).map(aAlergia),
  antecedentes: (e.antecedentes ?? []).map(aAntecedente),
});

/** Texto vacío → null, para que el backend no guarde cadenas en blanco. */
const textoONull = (valor?: string | null) => (valor && valor.trim() ? valor.trim() : null);

const nombreMedico = (m?: Medico) => (m ? `Dr(a). ${m.nombres} ${m.apellidos}` : '');
const nombrePaciente = (p?: Paciente) => (p ? `${p.nombres} ${p.apellidos}` : '');

/**
 * Cliente HTTP de MedicalAppointments.ClinicalCare (atenciones, signos vitales,
 * notas, prescripciones, medicamentos e historial). Las atenciones solo guardan
 * IDs; los nombres y el motivo de consulta se componen con Patient, Staff y
 * Appointment.
 */
@Injectable({ providedIn: 'root' })
export class ClinicalCareService {
  private readonly base = environment.api.clinicalCare;

  constructor(
    private readonly http: HttpClient,
    private readonly patients: PatientService,
    private readonly staff: StaffService,
    private readonly appointments: AppointmentService,
  ) {}

  // ---------------------------------------------------------------- Mapeo
  private contexto(atenciones: AtencionApi[]): Observable<Contexto> {
    if (!atenciones.length) return of({ pacientes: new Map(), medicos: new Map(), citas: new Map() });
    const pacienteIds = new Set(atenciones.map((a) => a.pacienteId));
    return forkJoin({
      pacientes: this.patients.all(),
      medicos: this.staff.allDoctors(),
      citas: pacienteIds.size === 1
        ? this.appointments.citasApi({ pacienteId: atenciones[0].pacienteId })
        : this.appointments.citasApi(),
    }).pipe(
      map(({ pacientes, medicos, citas }) => ({
        pacientes: new Map(pacientes.map((p) => [p.pacienteId, p])),
        medicos: new Map(medicos.map((m) => [m.medicoId, m])),
        citas: new Map(citas.map((c) => [c.id, c])),
      })),
    );
  }

  private aAtencion(a: AtencionApi, ctx: Contexto): Atencion {
    const medicoNombre = nombreMedico(ctx.medicos.get(a.medicoId));
    const signos = a.signosVitales ?? [];
    return {
      atencionId: a.id,
      citaId: a.citaId,
      pacienteId: a.pacienteId,
      pacienteNombre: nombrePaciente(ctx.pacientes.get(a.pacienteId)),
      medicoId: a.medicoId,
      medicoNombre,
      fechaAtencion: fechaCorta(a.fechaHora),
      motivoConsulta: ctx.citas.get(a.citaId)?.motivo ?? null,
      diagnostico: a.diagnostico ?? null,
      estado: a.estado,
      // ClinicalCare guarda cada registro de signos vitales; la ficha muestra el más reciente.
      signosVitales: signos.length ? aSignos(signos.reduce((x, y) => (y.id > x.id ? y : x))) : null,
      notas: (a.notasMedicas ?? [])
        .map((n) => this.aNota(n, medicoNombre))
        .sort((x, y) => y.fecha.localeCompare(x.fecha)),
    };
  }

  private aNota(n: NotaMedicaApi, medicoNombre: string): NotaMedica {
    return { notaMedicaId: n.id, atencionId: n.atencionId, nota: n.nota, fecha: fechaCorta(n.fechaHora), medicoNombre };
  }

  private aPrescripcion(p: PrescripcionApi, atencion: AtencionApi | undefined, ctx: Contexto): Prescripcion {
    return {
      prescripcionId: p.id,
      atencionId: p.atencionId,
      pacienteId: p.pacienteId,
      pacienteNombre: nombrePaciente(ctx.pacientes.get(p.pacienteId)),
      medicoNombre: atencion ? nombreMedico(ctx.medicos.get(atencion.medicoId)) : undefined,
      fecha: fechaCorta(p.fecha),
      indicacionesGenerales: p.indicacionesGenerales ?? null,
      detalles: (p.detalles ?? []).map((d) => ({
        prescripcionDetalleId: d.id,
        medicamentoId: d.medicamentoId,
        medicamentoNombre: d.medicamento?.nombre,
        presentacion: d.medicamento?.presentacion ?? undefined,
        dosis: d.dosis,
        frecuencia: d.frecuencia,
        duracion: d.duracion,
        viaAdministracion: (d.viaAdministracion ?? 'Oral') as ViaAdministracion,
      })),
    };
  }

  private mapearAtenciones(atenciones: AtencionApi[]): Observable<Atencion[]> {
    return this.contexto(atenciones).pipe(map((ctx) => atenciones.map((a) => this.aAtencion(a, ctx))));
  }

  private atencionApi(atencionId: number): Observable<AtencionApi> {
    return this.http.get<ApiEnvelope<AtencionApi>>(`${this.base}/attentions/${atencionId}`).pipe(unwrap<AtencionApi>());
  }

  private atencionesApi(filtro: { citaId?: number; pacienteId?: number }): Observable<AtencionApi[]> {
    let params = new HttpParams();
    if (filtro.citaId) params = params.set('citaId', filtro.citaId);
    if (filtro.pacienteId) params = params.set('pacienteId', filtro.pacienteId);
    return this.http.get<ApiEnvelope<AtencionApi[]>>(`${this.base}/attentions`, { params }).pipe(unwrap<AtencionApi[]>());
  }

  // ---------------------------------------------------------------- Atención
  /**
   * Idempotente: si la cita ya tiene atención la devuelve. Si no, pasa la cita
   * a "EnAtencion" (requisito de ClinicalCare) y crea la atención.
   */
  abrirAtencion(input: AbrirAtencionInput): Observable<Atencion> {
    return this.atencionesApi({ citaId: input.citaId }).pipe(
      switchMap((existentes) => {
        if (existentes.length) return this.getAtencion(existentes[0].id);
        return this.appointments.getApi(input.citaId).pipe(
          switchMap((cita) =>
            cita.estado === 'Programada' || cita.estado === 'Confirmada'
              ? this.appointments.changeStatus(cita.id, 'En atencion').pipe(map(() => undefined))
              : of(undefined),
          ),
          switchMap(() => this.http.post<ApiEnvelope<AtencionApi>>(`${this.base}/attentions`, { citaId: input.citaId })),
          unwrap<AtencionApi>(),
          switchMap((a) => this.getAtencion(a.id)),
        );
      }),
    );
  }

  getAtencionPorCita(citaId: number): Observable<Atencion> {
    return this.atencionesApi({ citaId }).pipe(
      switchMap((items) =>
        items.length
          ? this.mapearAtenciones(items.slice(0, 1)).pipe(map(([a]) => a))
          : throwError(() => new HttpErrorResponse({ status: 404, error: { detail: 'No existe una atención para esta cita.' } })),
      ),
    );
  }

  getAtencion(atencionId: number): Observable<Atencion> {
    return this.atencionApi(atencionId).pipe(
      switchMap((a) => this.mapearAtenciones([a])),
      map(([a]) => a),
    );
  }

  /** En ClinicalCare lo único editable de la atención es el diagnóstico. */
  updateAtencion(atencionId: number, input: Partial<Atencion>): Observable<void> {
    return this.http
      .patch(`${this.base}/attentions/${atencionId}/diagnostico`, { diagnostico: input.diagnostico ?? '' })
      .pipe(map(() => undefined));
  }

  /** Cada guardado registra una nueva toma de signos vitales. */
  saveVitals(atencionId: number, vitals: SignosVitales): Observable<SignosVitales> {
    const body = {
      presionArterial: vitals.presionArterial || null,
      frecuenciaCardiaca: vitals.frecuenciaCardiaca ?? null,
      temperatura: vitals.temperatura ?? null,
      saturacionOxigeno: vitals.saturacionOxigeno ?? null,
      peso: vitals.peso ?? null,
      talla: vitals.talla ?? null,
    };
    return this.http
      .post<ApiEnvelope<SignoVitalApi>>(`${this.base}/attentions/${atencionId}/vital-signs`, body)
      .pipe(unwrap<SignoVitalApi>(), map(aSignos));
  }

  addNota(atencionId: number, nota: string): Observable<NotaMedica> {
    return forkJoin({
      nota: this.http.post<ApiEnvelope<NotaMedicaApi>>(`${this.base}/attentions/${atencionId}/notes`, { nota }).pipe(unwrap<NotaMedicaApi>()),
      atencion: this.getAtencion(atencionId),
    }).pipe(map(({ nota: n, atencion }) => this.aNota(n, atencion.medicoNombre)));
  }

  /** Exige diagnóstico; ClinicalCare marca la cita como "Atendida" en Appointment. */
  cerrarAtencion(atencionId: number): Observable<Atencion> {
    return this.http.patch(`${this.base}/attentions/${atencionId}/cerrar`, {}).pipe(switchMap(() => this.getAtencion(atencionId)));
  }

  private historialApi(pacienteId: number): Observable<AtencionApi[]> {
    return this.http
      .get<ApiEnvelope<AtencionApi[]>>(`${this.base}/patients/${pacienteId}/history`)
      .pipe(unwrap<AtencionApi[]>());
  }

  /** Historial clínico del paciente: sus atenciones registradas. */
  getAtencionesPaciente(pacienteId: number): Observable<Atencion[]> {
    return this.historialApi(pacienteId).pipe(
      switchMap((items) => this.mapearAtenciones(items)),
      map((items) => items.sort((a, b) => b.fechaAtencion.localeCompare(a.fechaAtencion))),
    );
  }

  // ---------------------------------------------------------------- Expediente clínico
  private expedienteUrl(pacienteId: number): string {
    return `${this.base}/patients/${pacienteId}/record`;
  }

  /**
   * Expediente del paciente. Usa el POST idempotente de ClinicalCare: si el
   * paciente aún no tiene expediente lo abre, así todo paciente consultado
   * queda con su expediente.
   */
  getExpediente(pacienteId: number): Observable<ExpedienteClinico> {
    return this.http
      .post<ApiEnvelope<ExpedienteApi>>(this.expedienteUrl(pacienteId), {})
      .pipe(unwrap<ExpedienteApi>(), map(aExpediente));
  }

  updateHabitos(pacienteId: number, habitos: HabitosExpediente): Observable<ExpedienteClinico> {
    const body = {
      tabaquismo: textoONull(habitos.tabaquismo),
      consumoAlcohol: textoONull(habitos.consumoAlcohol),
      actividadFisica: textoONull(habitos.actividadFisica),
      alimentacion: textoONull(habitos.alimentacion),
      observaciones: textoONull(habitos.observaciones),
    };
    return this.http
      .put<ApiEnvelope<ExpedienteApi>>(this.expedienteUrl(pacienteId), body)
      .pipe(unwrap<ExpedienteApi>(), map(aExpediente));
  }

  addAlergia(pacienteId: number, input: AlergiaInput): Observable<Alergia> {
    const body = { ...input, reaccion: textoONull(input.reaccion) };
    return this.http
      .post<ApiEnvelope<AlergiaApi>>(`${this.expedienteUrl(pacienteId)}/allergies`, body)
      .pipe(unwrap<AlergiaApi>(), map(aAlergia));
  }

  deleteAlergia(pacienteId: number, alergiaId: number): Observable<void> {
    return this.http.delete(`${this.expedienteUrl(pacienteId)}/allergies/${alergiaId}`).pipe(map(() => undefined));
  }

  addAntecedente(pacienteId: number, input: AntecedenteInput): Observable<Antecedente> {
    const body = {
      tipo: input.tipo,
      descripcion: input.descripcion,
      parentesco: input.tipo === 'Familiar' ? textoONull(input.parentesco) : null,
      fechaDiagnostico: input.fechaDiagnostico || null,
    };
    return this.http
      .post<ApiEnvelope<AntecedenteApi>>(`${this.expedienteUrl(pacienteId)}/antecedents`, body)
      .pipe(unwrap<AntecedenteApi>(), map(aAntecedente));
  }

  deleteAntecedente(pacienteId: number, antecedenteId: number): Observable<void> {
    return this.http.delete(`${this.expedienteUrl(pacienteId)}/antecedents/${antecedenteId}`).pipe(map(() => undefined));
  }

  // ---------------------------------------------------------------- Treatment
  listMedicamentos(query: PageQuery): Observable<PagedResult<Medicamento>> {
    return this.http.get<ApiEnvelope<MedicamentoApi[]>>(`${this.base}/medications`).pipe(
      unwrap<MedicamentoApi[]>(),
      map((items) => paginar(items.map(aMedicamento), query, (m) => `${m.nombre} ${m.principioActivo} ${m.presentacion}`)),
    );
  }

  createMedicamento(input: MedicamentoInput): Observable<Medicamento> {
    const body = {
      nombre: input.nombre,
      principioActivo: input.principioActivo || null,
      presentacion: input.presentacion || null,
      concentracion: input.concentracion || null,
    };
    return this.http.post<ApiEnvelope<MedicamentoApi>>(`${this.base}/medications`, body).pipe(unwrap<MedicamentoApi>(), map(aMedicamento));
  }

  updateMedicamento(id: number, input: MedicamentoInput): Observable<void> {
    const body = {
      nombre: input.nombre,
      principioActivo: input.principioActivo || null,
      presentacion: input.presentacion || null,
      concentracion: input.concentracion || null,
      activo: input.activo ?? true,
    };
    return this.http.put(`${this.base}/medications/${id}`, body).pipe(map(() => undefined));
  }

  deactivateMedicamento(id: number): Observable<void> {
    return this.http.delete(`${this.base}/medications/${id}`).pipe(map(() => undefined));
  }

  createPrescripcion(input: PrescripcionInput): Observable<Prescripcion> {
    const body = {
      indicacionesGenerales: input.indicacionesGenerales || null,
      detalles: input.detalles.map((d) => ({
        medicamentoId: Number(d.medicamentoId),
        dosis: d.dosis,
        frecuencia: d.frecuencia,
        duracion: d.duracion,
        viaAdministracion: d.viaAdministracion || null,
      })),
    };
    return this.http
      .post<ApiEnvelope<PrescripcionApi>>(`${this.base}/attentions/${input.atencionId}/prescriptions`, body)
      .pipe(
        unwrap<PrescripcionApi>(),
        switchMap((p) => this.contexto([]).pipe(map((ctx) => this.aPrescripcion(p, undefined, ctx)))),
      );
  }

  /** Prescripciones del paciente, tomadas de su historial de atenciones. */
  listByPaciente(pacienteId: number): Observable<Prescripcion[]> {
    return this.historialApi(pacienteId).pipe(
      switchMap((atenciones) =>
        this.contexto(atenciones).pipe(
          map((ctx) =>
            atenciones
              .flatMap((a) => (a.prescripciones ?? []).map((p) => this.aPrescripcion(p, a, ctx)))
              .sort((a, b) => b.fecha.localeCompare(a.fecha)),
          ),
        ),
      ),
    );
  }
}
