import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { SupabaseClientService } from './supabase-client.service';
import { ToastService } from './toast.service';
import { Cita, CitaFiltro, CitaInput, EstadoCita, SlotDisponible } from '../models/appointment.model';

type CitaRow = {
  cita_id: number; paciente_id: number; medico_id: number; consultorio_id: number;
  fecha: string; hora: string; motivo: string | null; estado: EstadoCita; observacion: string | null;
  pacientes: { nombres: string; apellidos: string; numero_documento: string } | null;
  medicos: { nombres: string; apellidos: string; especialidades: { nombre: string } | null } | null;
  consultorios: { nombre: string } | null;
};

const CITA_SELECT = `
  cita_id, paciente_id, medico_id, consultorio_id, fecha, hora, motivo, estado, observacion,
  pacientes (nombres, apellidos, numero_documento),
  medicos (nombres, apellidos, especialidades (nombre)),
  consultorios (nombre)
`;

function toCita(r: CitaRow): Cita {
  const pacienteNombre = r.pacientes ? `${r.pacientes.nombres} ${r.pacientes.apellidos}` : '';
  const medicoNombre = r.medicos ? `Dr(a). ${r.medicos.nombres} ${r.medicos.apellidos}` : '';
  return {
    citaId: r.cita_id,
    pacienteId: r.paciente_id,
    pacienteNombre,
    pacienteDocumento: r.pacientes?.numero_documento,
    medicoId: r.medico_id,
    medicoNombre,
    especialidadNombre: r.medicos?.especialidades?.nombre ?? '',
    consultorioId: r.consultorio_id,
    consultorioNombre: r.consultorios?.nombre ?? '',
    fecha: r.fecha,
    hora: String(r.hora).slice(0, 5),
    motivo: r.motivo,
    estado: r.estado,
    observacion: r.observacion,
  };
}

/** Citas contra la ÚNICA base Supabase. Misma API pública que con microservicios. */
@Injectable({ providedIn: 'root' })
export class AppointmentService {
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

  list(filtro: CitaFiltro): Observable<Cita[]> {
    const run = (async (): Promise<Cita[]> => {
      let q = this.sb.client.from('citas').select(CITA_SELECT).order('fecha').order('hora');
      if (filtro.desde) q = q.gte('fecha', filtro.desde);
      if (filtro.hasta) q = q.lte('fecha', filtro.hasta);
      if (filtro.medicoId) q = q.eq('medico_id', filtro.medicoId);
      if (filtro.pacienteId) q = q.eq('paciente_id', filtro.pacienteId);
      if (filtro.estado) q = q.eq('estado', filtro.estado);
      const { data, error } = await q;
      if (error) throw this.sb.toHttpError(error);
      return ((data ?? []) as unknown as CitaRow[]).map(toCita);
    })();
    return from(run).pipe(this.handle('No se pudieron cargar las citas.'));
  }

  get(citaId: number): Observable<Cita> {
    const run = (async (): Promise<Cita> => {
      const { data, error } = await this.sb.client.from('citas').select(CITA_SELECT).eq('cita_id', citaId).maybeSingle();
      if (error) throw this.sb.toHttpError(error);
      if (!data) this.sb.fail(404, 'Cita no encontrada.');
      return toCita(data as unknown as CitaRow);
    })();
    return from(run).pipe(this.handle('No se pudo cargar la cita.'));
  }

  /**
   * Slots calculados desde `horarios_medicos` del día (dia_semana ISO) menos
   * las citas que ocupan slot. Si el médico no tiene horario ese día, se
   * devuelve la jornada base 08:00–17:00 cada 30 min (paridad con el mock).
   */
  slots(medicoId: number, fecha: string): Observable<SlotDisponible[]> {
    const run = (async (): Promise<SlotDisponible[]> => {
      const diaSemana = isoDiaSemana(fecha);
      const [{ data: horarios, error: errH }, { data: citas, error: errC }] = await Promise.all([
        this.sb.client.from('horarios_medicos')
          .select('hora_inicio, hora_fin, consultorio_id')
          .eq('medico_id', medicoId).eq('dia_semana', diaSemana).eq('activo', true),
        this.sb.client.from('citas')
          .select('hora, estado')
          .eq('medico_id', medicoId).eq('fecha', fecha)
          .in('estado', ['Programada', 'Confirmada', 'En atencion', 'Atendida']),
      ]);
      if (errH) throw this.sb.toHttpError(errH);
      if (errC) throw this.sb.toHttpError(errC);

      const ocupadas = new Set(((citas ?? []) as { hora: string }[]).map((c) => String(c.hora).slice(0, 5)));
      const rangos = ((horarios ?? []) as { hora_inicio: string; hora_fin: string; consultorio_id: number }[])
        .map((h) => ({ inicio: h.hora_inicio.slice(0, 5), fin: h.hora_fin.slice(0, 5), consultorioId: h.consultorio_id }));
      const base = rangos.length ? rangos : [{ inicio: '08:00', fin: '17:00', consultorioId: 1 }];

      const out: SlotDisponible[] = [];
      for (const r of base) {
        for (const hora of cada30Min(r.inicio, r.fin)) {
          out.push({ hora, disponible: !ocupadas.has(hora), consultorioId: r.consultorioId });
        }
      }
      return out.sort((a, b) => a.hora.localeCompare(b.hora));
    })();
    return from(run).pipe(this.handle('No se pudieron calcular los horarios disponibles.'));
  }

  create(input: CitaInput): Observable<Cita> {
    const run = (async (): Promise<Cita> => {
      const { data, error } = await this.sb.client
        .from('citas')
        .insert({
          paciente_id: input.pacienteId, medico_id: input.medicoId,
          consultorio_id: input.consultorioId, fecha: input.fecha,
          hora: input.hora, motivo: input.motivo ?? null, estado: 'Programada',
        })
        .select(CITA_SELECT)
        .single();
      if (error) {
        if (error.code === '23505') this.sb.fail(409, 'El médico ya tiene una cita agendada en ese horario.');
        throw this.sb.toHttpError(error);
      }
      return toCita(data as unknown as CitaRow);
    })();
    return from(run).pipe(this.handle('No se pudo crear la cita.'));
  }

  update(citaId: number, input: Partial<CitaInput>): Observable<void> {
    const run = (async (): Promise<void> => {
      const patch: Record<string, unknown> = {};
      if (input.pacienteId !== undefined) patch['paciente_id'] = input.pacienteId;
      if (input.medicoId !== undefined) patch['medico_id'] = input.medicoId;
      if (input.consultorioId !== undefined) patch['consultorio_id'] = input.consultorioId;
      if (input.fecha !== undefined) patch['fecha'] = input.fecha;
      if (input.hora !== undefined) patch['hora'] = input.hora;
      if (input.motivo !== undefined) patch['motivo'] = input.motivo;
      const { error } = await this.sb.client.from('citas').update(patch).eq('cita_id', citaId);
      if (error) {
        if (error.code === '23505') this.sb.fail(409, 'El médico ya tiene una cita agendada en ese horario.');
        throw this.sb.toHttpError(error);
      }
    })();
    return from(run).pipe(
      map(() => undefined),
      this.handle('No se pudo actualizar la cita.'),
    );
  }

  changeStatus(citaId: number, estado: EstadoCita): Observable<Cita> {
    const run = (async (): Promise<Cita> => {
      const { data, error } = await this.sb.client
        .from('citas')
        .update({ estado })
        .eq('cita_id', citaId)
        .select(CITA_SELECT)
        .single();
      if (error) throw this.sb.toHttpError(error);
      return toCita(data as unknown as CitaRow);
    })();
    return from(run).pipe(this.handle('No se pudo cambiar el estado de la cita.'));
  }

  cancel(citaId: number, motivo?: string): Observable<Cita> {
    const run = (async (): Promise<Cita> => {
      const patch: Record<string, unknown> = { estado: 'Cancelada' };
      if (motivo !== undefined) patch['observacion'] = motivo;
      const { data, error } = await this.sb.client
        .from('citas')
        .update(patch)
        .eq('cita_id', citaId)
        .select(CITA_SELECT)
        .single();
      if (error) throw this.sb.toHttpError(error);
      return toCita(data as unknown as CitaRow);
    })();
    return from(run).pipe(this.handle('No se pudo cancelar la cita.'));
  }
}

// ------------------------------------------------------------- helpers ---
/** 1=Lunes … 7=Domingo (ISO-8601) a partir de 'yyyy-MM-dd'. */
function isoDiaSemana(fecha: string): number {
  const d = new Date(`${fecha}T12:00:00`);
  return ((d.getDay() + 6) % 7) + 1;
}

function cada30Min(inicio: string, fin: string): string[] {
  const [hi, mi] = inicio.split(':').map(Number);
  const [hf, mf] = fin.split(':').map(Number);
  const out: string[] = [];
  let t = hi * 60 + mi;
  const end = hf * 60 + mf;
  while (t < end) {
    out.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
    t += 30;
  }
  return out;
}
