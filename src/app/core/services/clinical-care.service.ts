import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { SupabaseClientService } from './supabase-client.service';
import { ToastService } from './toast.service';
import { PageQuery, PagedResult } from '../models/common.model';
import {
  AbrirAtencionInput, Atencion, EstadoAtencion, Medicamento, MedicamentoFiltro, MedicamentoInput,
  NotaMedica, Prescripcion, PrescripcionInput, SignosVitales, ViaAdministracion,
} from '../models/clinical-care.model';

type AtencionRow = {
  atencion_id: number; cita_id: number; paciente_id: number; medico_id: number;
  fecha_atencion: string; motivo_consulta: string | null; diagnostico: string | null; estado: EstadoAtencion;
  pacientes: { nombres: string; apellidos: string } | null;
  medicos: { nombres: string; apellidos: string } | null;
};
type SignosRow = {
  signos_vitales_id: number; atencion_id: number; presion_arterial: string | null;
  frecuencia_cardiaca: number | null; temperatura: number | null;
  saturacion_oxigeno: number | null; peso: number | null; talla: number | null;
  fecha_registro: string;
};
type NotaRow = { nota_medica_id: number; atencion_id: number; nota: string; fecha: string; medico_nombre: string };

const ATENCION_SELECT = `
  atencion_id, cita_id, paciente_id, medico_id, fecha_atencion, motivo_consulta, diagnostico, estado,
  pacientes (nombres, apellidos),
  medicos (nombres, apellidos)
`;
const SIGNOS_SELECT = `
  signos_vitales_id, atencion_id, presion_arterial, frecuencia_cardiaca, temperatura,
  saturacion_oxigeno, peso, talla, fecha_registro
`;

function toSignos(r: SignosRow): SignosVitales {
  return {
    signosVitalesId: r.signos_vitales_id, atencionId: r.atencion_id,
    presionArterial: r.presion_arterial, frecuenciaCardiaca: r.frecuencia_cardiaca,
    temperatura: r.temperatura, saturacionOxigeno: r.saturacion_oxigeno,
    peso: r.peso, talla: r.talla, fechaRegistro: r.fecha_registro,
  };
}

function toNota(r: NotaRow): NotaMedica {
  return {
    notaMedicaId: r.nota_medica_id, atencionId: r.atencion_id,
    nota: r.nota, fecha: r.fecha, medicoNombre: r.medico_nombre,
  };
}

function toAtencion(r: AtencionRow, signos: SignosVitales | null, notas: NotaMedica[]): Atencion {
  return {
    atencionId: r.atencion_id, citaId: r.cita_id,
    pacienteId: r.paciente_id,
    pacienteNombre: r.pacientes ? `${r.pacientes.nombres} ${r.pacientes.apellidos}` : '',
    medicoId: r.medico_id,
    medicoNombre: r.medicos ? `Dr(a). ${r.medicos.nombres} ${r.medicos.apellidos}` : '',
    fechaAtencion: r.fecha_atencion,
    motivoConsulta: r.motivo_consulta,
    diagnostico: r.diagnostico,
    estado: r.estado,
    signosVitales: signos,
    notas,
  };
}

/**
 * ClinicalCare (atenciones, medicamentos, prescripciones) contra Supabase único.
 * Misma API pública que con microservicios: los componentes no cambian.
 */
@Injectable({ providedIn: 'root' })
export class ClinicalCareService {
  constructor(
    private readonly sb: SupabaseClientService,
    private readonly toast: ToastService,
  ) {}

  private handle<T>(fallback: string) {
    return catchError<T, Observable<T>>((e: unknown) => {
      const http = e instanceof HttpErrorResponse ? e : this.sb.toHttpError(e, fallback);
      this.toast.error((http.error?.['detail'] as string) ?? fallback);
      return throwError(() => http);
    });
  }

  /** Carga atención + signos + notas en paralelo (1 sola DB, sin N+1 entre servicios). */
  private async loadAtencion(atencionId: number): Promise<Atencion> {
    const [{ data: a, error: errA }, { data: s, error: errS }, { data: n, error: errN }] = await Promise.all([
      this.sb.client.from('atenciones').select(ATENCION_SELECT).eq('atencion_id', atencionId).maybeSingle(),
      this.sb.client.from('signos_vitales').select(SIGNOS_SELECT).eq('atencion_id', atencionId).maybeSingle(),
      this.sb.client.from('notas_medicas')
        .select('nota_medica_id, atencion_id, nota, fecha, medico_nombre')
        .eq('atencion_id', atencionId)
        .order('fecha', { ascending: false }),
    ]);
    if (errA) throw this.sb.toHttpError(errA);
    if (errS) throw this.sb.toHttpError(errS);
    if (errN) throw this.sb.toHttpError(errN);
    if (!a) this.sb.fail(404, 'Atención no encontrada.');
    const row = a as unknown as AtencionRow;
    return toAtencion(
      row,
      s ? toSignos(s as unknown as SignosRow) : null,
      ((n ?? []) as unknown as NotaRow[]).map(toNota),
    );
  }

  // ---------------------------------------------------------------- Atención
  /** Idempotente: si ya existe atención para la cita, la devuelve. */
  abrirAtencion(input: AbrirAtencionInput): Observable<Atencion> {
    const run = (async (): Promise<Atencion> => {
      const { data: existente } = await this.sb.client
        .from('atenciones')
        .select('atencion_id')
        .eq('cita_id', input.citaId)
        .maybeSingle();
      if (existente) return this.loadAtencion((existente as { atencion_id: number }).atencion_id);

      // Motivo desde la cita para mostrarlo en la ficha.
      const { data: cita } = await this.sb.client
        .from('citas')
        .select('motivo')
        .eq('cita_id', input.citaId)
        .maybeSingle();

      const { data: nueva, error } = await this.sb.client
        .from('atenciones')
        .insert({
          cita_id: input.citaId, paciente_id: input.pacienteId, medico_id: input.medicoId,
          motivo_consulta: (cita as { motivo: string | null } | null)?.motivo ?? null,
          estado: 'Abierta',
        })
        .select('atencion_id')
        .single();
      if (error) {
        // Carrera: otro tab la creó entre el SELECT y el INSERT (cita_id unique).
        if (error.code === '23505') {
          const { data: retry } = await this.sb.client
            .from('atenciones').select('atencion_id').eq('cita_id', input.citaId).maybeSingle();
          if (retry) return this.loadAtencion((retry as { atencion_id: number }).atencion_id);
        }
        throw this.sb.toHttpError(error);
      }
      // La cita pasa a "En atencion" (best-effort).
      void this.sb.client.from('citas').update({ estado: 'En atencion' }).eq('cita_id', input.citaId);
      return this.loadAtencion((nueva as { atencion_id: number }).atencion_id);
    })();
    return from(run).pipe(this.handle('No se pudo abrir la atención.'));
  }

  getAtencionPorCita(citaId: number): Observable<Atencion> {
    const run = (async (): Promise<Atencion> => {
      const { data, error } = await this.sb.client
        .from('atenciones').select('atencion_id').eq('cita_id', citaId).maybeSingle();
      if (error) throw this.sb.toHttpError(error);
      if (!data) this.sb.fail(404, 'No existe una atención abierta para esta cita.');
      return this.loadAtencion((data as { atencion_id: number }).atencion_id);
    })();
    return from(run).pipe(this.handle('No se pudo cargar la atención.'));
  }

  getAtencion(atencionId: number): Observable<Atencion> {
    return from(this.loadAtencion(atencionId)).pipe(this.handle('No se pudo cargar la atención.'));
  }

  updateAtencion(atencionId: number, input: Partial<Atencion>): Observable<void> {
    const run = (async (): Promise<void> => {
      const patch: Record<string, unknown> = {};
      if (input.diagnostico !== undefined) patch['diagnostico'] = input.diagnostico;
      if (input.motivoConsulta !== undefined) patch['motivo_consulta'] = input.motivoConsulta;
      if (input.estado !== undefined) patch['estado'] = input.estado;
      const { error } = await this.sb.client.from('atenciones').update(patch).eq('atencion_id', atencionId);
      if (error) throw this.sb.toHttpError(error);
    })();
    return from(run).pipe(
      map(() => undefined),
      this.handle('No se pudo actualizar la atención.'),
    );
  }

  saveVitals(atencionId: number, vitals: SignosVitales): Observable<SignosVitales> {
    const run = (async (): Promise<SignosVitales> => {
      const payload = {
        atencion_id: atencionId,
        presion_arterial: vitals.presionArterial ?? null,
        frecuencia_cardiaca: vitals.frecuenciaCardiaca ?? null,
        temperatura: vitals.temperatura ?? null,
        saturacion_oxigeno: vitals.saturacionOxigeno ?? null,
        peso: vitals.peso ?? null,
        talla: vitals.talla ?? null,
      };
      const { data, error } = await this.sb.client
        .from('signos_vitales')
        .upsert(payload, { onConflict: 'atencion_id' })
        .select(SIGNOS_SELECT)
        .single();
      if (error) throw this.sb.toHttpError(error);
      return toSignos(data as unknown as SignosRow);
    })();
    return from(run).pipe(this.handle('No se pudieron guardar los signos vitales.'));
  }

  addNota(atencionId: number, nota: string): Observable<NotaMedica> {
    const run = (async (): Promise<NotaMedica> => {
      const { data: at } = await this.sb.client
        .from('atenciones')
        .select('medicos (nombres, apellidos)')
        .eq('atencion_id', atencionId)
        .maybeSingle();
      const med = (at as unknown as { medicos: { nombres: string; apellidos: string } | null } | null)?.medicos;
      const medicoNombre = med ? `Dr(a). ${med.nombres} ${med.apellidos}` : '';
      const { data, error } = await this.sb.client
        .from('notas_medicas')
        .insert({ atencion_id: atencionId, nota, medico_nombre: medicoNombre })
        .select('nota_medica_id, atencion_id, nota, fecha, medico_nombre')
        .single();
      if (error) throw this.sb.toHttpError(error);
      return toNota(data as unknown as NotaRow);
    })();
    return from(run).pipe(this.handle('No se pudo agregar la nota.'));
  }

  cerrarAtencion(atencionId: number): Observable<Atencion> {
    const run = (async (): Promise<Atencion> => {
      const { data: at, error } = await this.sb.client
        .from('atenciones').select('cita_id').eq('atencion_id', atencionId).maybeSingle();
      if (error) throw this.sb.toHttpError(error);
      if (!at) this.sb.fail(404, 'Atención no encontrada.');
      const citaId = (at as { cita_id: number }).cita_id;
      const { error: errUp } = await this.sb.client.from('atenciones').update({ estado: 'Cerrada' }).eq('atencion_id', atencionId);
      if (errUp) throw this.sb.toHttpError(errUp);
      void this.sb.client.from('citas').update({ estado: 'Atendida' }).eq('cita_id', citaId);
      return this.loadAtencion(atencionId);
    })();
    return from(run).pipe(this.handle('No se pudo cerrar la atención.'));
  }

  getAtencionesPaciente(pacienteId: number): Observable<Atencion[]> {
    const run = (async (): Promise<Atencion[]> => {
      const { data, error } = await this.sb.client
        .from('atenciones')
        .select(ATENCION_SELECT)
        .eq('paciente_id', pacienteId)
        .order('fecha_atencion', { ascending: false });
      if (error) throw this.sb.toHttpError(error);
      const rows = (data ?? []) as unknown as AtencionRow[];
      // Signos + notas por atención (historial, volumen bajo: N consultas simples).
      return Promise.all(
        rows.map(async (r) => {
          const [{ data: s }, { data: n }] = await Promise.all([
            this.sb.client.from('signos_vitales').select(SIGNOS_SELECT).eq('atencion_id', r.atencion_id).maybeSingle(),
            this.sb.client.from('notas_medicas')
              .select('nota_medica_id, atencion_id, nota, fecha, medico_nombre')
              .eq('atencion_id', r.atencion_id)
              .order('fecha', { ascending: false }),
          ]);
          return toAtencion(
            r,
            s ? toSignos(s as unknown as SignosRow) : null,
            ((n ?? []) as unknown as NotaRow[]).map(toNota),
          );
        }),
      );
    })();
    return from(run).pipe(this.handle('No se pudo cargar el historial del paciente.'));
  }

  // ---------------------------------------------------------------- Treatment
  listMedicamentos(query: PageQuery & MedicamentoFiltro): Observable<PagedResult<Medicamento>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const run = (async (): Promise<PagedResult<Medicamento>> => {
      let q = this.sb.client
        .from('medicamentos')
        .select('medicamento_id, nombre, principio_activo, presentacion, concentracion, activo', { count: 'exact' })
        .order('medicamento_id', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      const s = (query.search ?? '').trim();
      if (s) q = q.or(`nombre.ilike.%${s}%,principio_activo.ilike.%${s}%`);
      if (query.activo !== undefined) q = q.eq('activo', query.activo);
      const { data, error, count } = await q;
      if (error) throw this.sb.toHttpError(error);
      const items = ((data ?? []) as {
        medicamento_id: number; nombre: string; principio_activo: string;
        presentacion: string; concentracion: string; activo: boolean;
      }[]).map((r) => ({
        medicamentoId: r.medicamento_id, nombre: r.nombre,
        principioActivo: r.principio_activo, presentacion: r.presentacion,
        concentracion: r.concentracion, activo: r.activo,
      }));
      return { items, total: count ?? 0, page, pageSize };
    })();
    return from(run).pipe(this.handle('No se pudieron cargar los medicamentos.'));
  }

  createMedicamento(input: MedicamentoInput): Observable<Medicamento> {
    const run = (async (): Promise<Medicamento> => {
      const { data, error } = await this.sb.client
        .from('medicamentos')
        .insert({
          nombre: input.nombre, principio_activo: input.principioActivo,
          presentacion: input.presentacion, concentracion: input.concentracion,
          activo: input.activo,
        })
        .select('medicamento_id, nombre, principio_activo, presentacion, concentracion, activo')
        .single();
      if (error) throw this.sb.toHttpError(error);
      const r = data as { medicamento_id: number; nombre: string; principio_activo: string; presentacion: string; concentracion: string; activo: boolean };
      return {
        medicamentoId: r.medicamento_id, nombre: r.nombre, principioActivo: r.principio_activo,
        presentacion: r.presentacion, concentracion: r.concentracion, activo: r.activo,
      };
    })();
    return from(run).pipe(this.handle('No se pudo crear el medicamento.'));
  }

  updateMedicamento(id: number, input: MedicamentoInput): Observable<void> {
    const run = (async (): Promise<void> => {
      const { error } = await this.sb.client
        .from('medicamentos')
        .update({
          nombre: input.nombre, principio_activo: input.principioActivo,
          presentacion: input.presentacion, concentracion: input.concentracion,
          activo: input.activo,
        })
        .eq('medicamento_id', id);
      if (error) throw this.sb.toHttpError(error);
    })();
    return from(run).pipe(
      map(() => undefined),
      this.handle('No se pudo actualizar el medicamento.'),
    );
  }

  deactivateMedicamento(id: number): Observable<void> {
    const run = (async (): Promise<void> => {
      const { error } = await this.sb.client.from('medicamentos').update({ activo: false }).eq('medicamento_id', id);
      if (error) throw this.sb.toHttpError(error);
    })();
    return from(run).pipe(
      map(() => undefined),
      this.handle('No se pudo desactivar el medicamento.'),
    );
  }

  createPrescripcion(input: PrescripcionInput): Observable<Prescripcion> {
    const run = (async (): Promise<Prescripcion> => {
      const { data: cab, error: errCab } = await this.sb.client
        .from('prescripciones')
        .insert({
          atencion_id: input.atencionId, paciente_id: input.pacienteId,
          indicaciones_generales: input.indicacionesGenerales ?? null,
        })
        .select('prescripcion_id, atencion_id, paciente_id, fecha, indicaciones_generales')
        .single();
      if (errCab) throw this.sb.toHttpError(errCab);
      const presId = (cab as { prescripcion_id: number }).prescripcion_id;

      const { error: errDet } = await this.sb.client.from('prescripciones_detalle').insert(
        input.detalles.map((d) => ({
          prescripcion_id: presId,
          medicamento_id: d.medicamentoId,
          dosis: d.dosis, frecuencia: d.frecuencia, duracion: d.duracion,
          via_administracion: d.viaAdministracion,
        })),
      );
      if (errDet) throw this.sb.toHttpError(errDet);
      return this.loadPrescripcion(presId);
    })();
    return from(run).pipe(this.handle('No se pudo crear la prescripción.'));
  }

  getPrescripcion(id: number): Observable<Prescripcion> {
    return from(this.loadPrescripcion(id)).pipe(this.handle('No se pudo cargar la prescripción.'));
  }

  listByPaciente(pacienteId: number): Observable<Prescripcion[]> {
    const run = (async (): Promise<Prescripcion[]> => {
      const { data, error } = await this.sb.client
        .from('prescripciones')
        .select('prescripcion_id')
        .eq('paciente_id', pacienteId)
        .order('fecha', { ascending: false });
      if (error) throw this.sb.toHttpError(error);
      const ids = ((data ?? []) as { prescripcion_id: number }[]).map((r) => r.prescripcion_id);
      return Promise.all(ids.map((id) => this.loadPrescripcion(id)));
    })();
    return from(run).pipe(this.handle('No se pudieron cargar las prescripciones.'));
  }

  private async loadPrescripcion(prescripcionId: number): Promise<Prescripcion> {
    const { data: cab, error: errCab } = await this.sb.client
      .from('prescripciones')
      .select(`
        prescripcion_id, atencion_id, paciente_id, fecha, indicaciones_generales,
        pacientes (nombres, apellidos),
        atenciones (medicos (nombres, apellidos))
      `)
      .eq('prescripcion_id', prescripcionId)
      .maybeSingle();
    if (errCab) throw this.sb.toHttpError(errCab);
    if (!cab) this.sb.fail(404, 'Prescripción no encontrada.');
    const c = cab as unknown as {
      prescripcion_id: number; atencion_id: number; paciente_id: number;
      fecha: string; indicaciones_generales: string | null;
      pacientes: { nombres: string; apellidos: string } | null;
      atenciones: { medicos: { nombres: string; apellidos: string } | null } | null;
    };

    const { data: det, error: errDet } = await this.sb.client
      .from('prescripciones_detalle')
      .select(`
        prescripcion_detalle_id, medicamento_id, dosis, frecuencia, duracion, via_administracion,
        medicamentos (nombre, presentacion)
      `)
      .eq('prescripcion_id', prescripcionId);
    if (errDet) throw this.sb.toHttpError(errDet);

    return {
      prescripcionId: c.prescripcion_id,
      atencionId: c.atencion_id,
      pacienteId: c.paciente_id,
      pacienteNombre: c.pacientes ? `${c.pacientes.nombres} ${c.pacientes.apellidos}` : '',
      medicoNombre: c.atenciones?.medicos ? `Dr(a). ${c.atenciones.medicos.nombres} ${c.atenciones.medicos.apellidos}` : '',
      fecha: c.fecha,
      indicacionesGenerales: c.indicaciones_generales,
      detalles: ((det ?? []) as unknown as {
        prescripcion_detalle_id: number; medicamento_id: number; dosis: string;
        frecuencia: string; duracion: string; via_administracion: ViaAdministracion;
        medicamentos: { nombre: string; presentacion: string } | null;
      }[]).map((d) => ({
        prescripcionDetalleId: d.prescripcion_detalle_id,
        medicamentoId: d.medicamento_id,
        medicamentoNombre: d.medicamentos?.nombre ?? '',
        presentacion: d.medicamentos?.presentacion ?? '',
        dosis: d.dosis, frecuencia: d.frecuencia, duracion: d.duracion,
        viaAdministracion: d.via_administracion,
      })),
    };
  }
}
