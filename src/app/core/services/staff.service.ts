import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { SupabaseClientService } from './supabase-client.service';
import { ToastService } from './toast.service';
import { PageQuery, PagedResult } from '../models/common.model';
import { Consultorio, DiaSemana, Especialidad, HorarioMedico, HorarioMedicoInput, Medico, MedicoFiltro, MedicoInput } from '../models/staff.model';

type MedicoRow = {
  medico_id: number; nombres: string; apellidos: string; licencia: string;
  especialidad_id: number; telefono: string | null; email: string | null;
  activo: boolean; especialidades: { nombre: string } | null;
};
type HorarioRow = {
  horario_id: number; medico_id: number; dia_semana: number;
  hora_inicio: string; hora_fin: string; consultorio_id: number;
  activo: boolean; consultorios: { nombre: string } | null;
};

const MEDICO_SELECT =
  'medico_id, nombres, apellidos, licencia, especialidad_id, telefono, email, activo, especialidades!inner(nombre)';
const HORARIO_SELECT =
  'horario_id, medico_id, dia_semana, hora_inicio, hora_fin, consultorio_id, activo, consultorios(nombre)';

function toMedico(r: MedicoRow): Medico {
  return {
    medicoId: r.medico_id, nombres: r.nombres, apellidos: r.apellidos,
    licencia: r.licencia, especialidadId: r.especialidad_id,
    especialidadNombre: r.especialidades?.nombre ?? '',
    telefono: r.telefono, email: r.email, activo: r.activo,
  };
}

function toHorario(r: HorarioRow): HorarioMedico {
  return {
    horarioId: r.horario_id, medicoId: r.medico_id,
    diaSemana: r.dia_semana as DiaSemana,
    horaInicio: r.hora_inicio.slice(0, 5), horaFin: r.hora_fin.slice(0, 5),
    consultorioId: r.consultorio_id,
    consultorioNombre: r.consultorios?.nombre ?? '',
    activo: r.activo,
  };
}

/** Staff (médicos, especialidades, consultorios, horarios) contra Supabase único. */
@Injectable({ providedIn: 'root' })
export class StaffService {
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

  // ------------------------------------------------------------------ Médicos
  listDoctors(query: PageQuery & MedicoFiltro): Observable<PagedResult<Medico>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const run = (async (): Promise<PagedResult<Medico>> => {
      let q = this.sb.client
        .from('medicos')
        .select(MEDICO_SELECT, { count: 'exact' })
        .order('medico_id', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      const s = (query.search ?? '').trim();
      if (s) q = q.or(`nombres.ilike.%${s}%,apellidos.ilike.%${s}%`);
      if (query.activo !== undefined) q = q.eq('activo', query.activo);
      if (query.especialidadId !== undefined) q = q.eq('especialidad_id', query.especialidadId);
      const { data, error, count } = await q;
      if (error) throw this.sb.toHttpError(error);
      return { items: ((data ?? []) as unknown as MedicoRow[]).map(toMedico), total: count ?? 0, page, pageSize };
    })();
    return from(run).pipe(this.handle('No se pudieron cargar los médicos.'));
  }

  getDoctorsByIds(ids: number[]): Observable<Medico[]> {
    const run = (async (): Promise<Medico[]> => {
      if (!ids.length) return [];
      const { data, error } = await this.sb.client.from('medicos').select(MEDICO_SELECT).in('medico_id', ids);
      if (error) throw this.sb.toHttpError(error);
      return ((data ?? []) as unknown as MedicoRow[]).map(toMedico);
    })();
    return from(run).pipe(this.handle('No se pudieron cargar los médicos.'));
  }

  getDoctor(medicoId: number): Observable<Medico> {
    const run = (async (): Promise<Medico> => {
      const { data, error } = await this.sb.client.from('medicos').select(MEDICO_SELECT).eq('medico_id', medicoId).maybeSingle();
      if (error) throw this.sb.toHttpError(error);
      if (!data) this.sb.fail(404, 'Médico no encontrado.');
      return toMedico(data as unknown as MedicoRow);
    })();
    return from(run).pipe(this.handle('No se pudo cargar el médico.'));
  }

  createDoctor(input: MedicoInput): Observable<Medico> {
    const run = (async (): Promise<Medico> => {
      const { data, error } = await this.sb.client
        .from('medicos')
        .insert({
          nombres: input.nombres, apellidos: input.apellidos, licencia: input.licencia,
          especialidad_id: input.especialidadId, telefono: input.telefono ?? null,
          email: input.email ?? null, activo: input.activo,
        })
        .select(MEDICO_SELECT)
        .single();
      if (error) {
        if (error.code === '23505') this.sb.fail(409, 'Ya existe un médico con esa licencia.');
        throw this.sb.toHttpError(error);
      }
      return toMedico(data as unknown as MedicoRow);
    })();
    return from(run).pipe(this.handle('No se pudo crear el médico.'));
  }

  updateDoctor(medicoId: number, input: MedicoInput): Observable<void> {
    const run = (async (): Promise<void> => {
      const { error } = await this.sb.client
        .from('medicos')
        .update({
          nombres: input.nombres, apellidos: input.apellidos, licencia: input.licencia,
          especialidad_id: input.especialidadId, telefono: input.telefono ?? null,
          email: input.email ?? null, activo: input.activo,
        })
        .eq('medico_id', medicoId);
      if (error) throw this.sb.toHttpError(error);
    })();
    return from(run).pipe(
      map(() => undefined),
      this.handle('No se pudo actualizar el médico.'),
    );
  }

  deactivateDoctor(medicoId: number): Observable<void> {
    const run = (async (): Promise<void> => {
      const { error } = await this.sb.client.from('medicos').update({ activo: false }).eq('medico_id', medicoId);
      if (error) throw this.sb.toHttpError(error);
    })();
    return from(run).pipe(
      map(() => undefined),
      this.handle('No se pudo desactivar el médico.'),
    );
  }

  // ------------------------------------------------------------- Especialidades
  listSpecialties(): Observable<Especialidad[]> {
    const run = (async (): Promise<Especialidad[]> => {
      const { data, error } = await this.sb.client.from('especialidades').select('especialidad_id, nombre, activo').order('nombre');
      if (error) throw this.sb.toHttpError(error);
      return ((data ?? []) as { especialidad_id: number; nombre: string; activo: boolean }[]).map((r) => ({
        especialidadId: r.especialidad_id, nombre: r.nombre, activo: r.activo,
      }));
    })();
    return from(run).pipe(this.handle('No se pudieron cargar las especialidades.'));
  }

  createSpecialty(input: Partial<Especialidad>): Observable<Especialidad> {
    const run = (async (): Promise<Especialidad> => {
      const { data, error } = await this.sb.client
        .from('especialidades')
        .insert({ nombre: input.nombre ?? '', activo: input.activo ?? true })
        .select('especialidad_id, nombre, activo')
        .single();
      if (error) throw this.sb.toHttpError(error);
      const r = data as { especialidad_id: number; nombre: string; activo: boolean };
      return { especialidadId: r.especialidad_id, nombre: r.nombre, activo: r.activo };
    })();
    return from(run).pipe(this.handle('No se pudo crear la especialidad.'));
  }

  updateSpecialty(id: number, input: Partial<Especialidad>): Observable<void> {
    const run = (async (): Promise<void> => {
      const patch: Record<string, unknown> = {};
      if (input.nombre !== undefined) patch['nombre'] = input.nombre;
      if (input.activo !== undefined) patch['activo'] = input.activo;
      const { error } = await this.sb.client.from('especialidades').update(patch).eq('especialidad_id', id);
      if (error) throw this.sb.toHttpError(error);
    })();
    return from(run).pipe(
      map(() => undefined),
      this.handle('No se pudo actualizar la especialidad.'),
    );
  }

  deactivateSpecialty(id: number): Observable<void> {
    const run = (async (): Promise<void> => {
      const { error } = await this.sb.client.from('especialidades').update({ activo: false }).eq('especialidad_id', id);
      if (error) throw this.sb.toHttpError(error);
    })();
    return from(run).pipe(
      map(() => undefined),
      this.handle('No se pudo desactivar la especialidad.'),
    );
  }

  // -------------------------------------------------------------- Consultorios
  listClinics(): Observable<Consultorio[]> {
    const run = (async (): Promise<Consultorio[]> => {
      const { data, error } = await this.sb.client.from('consultorios').select('consultorio_id, nombre, ubicacion, activo').order('nombre');
      if (error) throw this.sb.toHttpError(error);
      return ((data ?? []) as { consultorio_id: number; nombre: string; ubicacion: string | null; activo: boolean }[]).map((r) => ({
        consultorioId: r.consultorio_id, nombre: r.nombre, ubicacion: r.ubicacion, activo: r.activo,
      }));
    })();
    return from(run).pipe(this.handle('No se pudieron cargar los consultorios.'));
  }

  createClinic(input: Partial<Consultorio>): Observable<Consultorio> {
    const run = (async (): Promise<Consultorio> => {
      const { data, error } = await this.sb.client
        .from('consultorios')
        .insert({ nombre: input.nombre ?? '', ubicacion: input.ubicacion ?? null, activo: input.activo ?? true })
        .select('consultorio_id, nombre, ubicacion, activo')
        .single();
      if (error) throw this.sb.toHttpError(error);
      const r = data as { consultorio_id: number; nombre: string; ubicacion: string | null; activo: boolean };
      return { consultorioId: r.consultorio_id, nombre: r.nombre, ubicacion: r.ubicacion, activo: r.activo };
    })();
    return from(run).pipe(this.handle('No se pudo crear el consultorio.'));
  }

  updateClinic(id: number, input: Partial<Consultorio>): Observable<void> {
    const run = (async (): Promise<void> => {
      const patch: Record<string, unknown> = {};
      if (input.nombre !== undefined) patch['nombre'] = input.nombre;
      if (input.ubicacion !== undefined) patch['ubicacion'] = input.ubicacion;
      if (input.activo !== undefined) patch['activo'] = input.activo;
      const { error } = await this.sb.client.from('consultorios').update(patch).eq('consultorio_id', id);
      if (error) throw this.sb.toHttpError(error);
    })();
    return from(run).pipe(
      map(() => undefined),
      this.handle('No se pudo actualizar el consultorio.'),
    );
  }

  deactivateClinic(id: number): Observable<void> {
    const run = (async (): Promise<void> => {
      const { error } = await this.sb.client.from('consultorios').update({ activo: false }).eq('consultorio_id', id);
      if (error) throw this.sb.toHttpError(error);
    })();
    return from(run).pipe(
      map(() => undefined),
      this.handle('No se pudo desactivar el consultorio.'),
    );
  }

  // ------------------------------------------------------------------ Horarios
  listSchedules(medicoId: number): Observable<HorarioMedico[]> {
    const run = (async (): Promise<HorarioMedico[]> => {
      const { data, error } = await this.sb.client
        .from('horarios_medicos')
        .select(HORARIO_SELECT)
        .eq('medico_id', medicoId)
        .order('dia_semana')
        .order('hora_inicio');
      if (error) throw this.sb.toHttpError(error);
      return ((data ?? []) as unknown as HorarioRow[]).map(toHorario);
    })();
    return from(run).pipe(this.handle('No se pudieron cargar los horarios.'));
  }

  createSchedule(medicoId: number, input: HorarioMedicoInput): Observable<HorarioMedico> {
    const run = (async (): Promise<HorarioMedico> => {
      const { data, error } = await this.sb.client
        .from('horarios_medicos')
        .insert({
          medico_id: medicoId, dia_semana: input.diaSemana,
          hora_inicio: input.horaInicio, hora_fin: input.horaFin,
          consultorio_id: input.consultorioId, activo: input.activo,
        })
        .select(HORARIO_SELECT)
        .single();
      if (error) throw this.sb.toHttpError(error);
      return toHorario(data as unknown as HorarioRow);
    })();
    return from(run).pipe(this.handle('No se pudo crear el horario.'));
  }

  updateSchedule(medicoId: number, horarioId: number, input: HorarioMedicoInput): Observable<void> {
    void medicoId;
    const run = (async (): Promise<void> => {
      const { error } = await this.sb.client
        .from('horarios_medicos')
        .update({
          dia_semana: input.diaSemana, hora_inicio: input.horaInicio, hora_fin: input.horaFin,
          consultorio_id: input.consultorioId, activo: input.activo,
        })
        .eq('horario_id', horarioId);
      if (error) throw this.sb.toHttpError(error);
    })();
    return from(run).pipe(
      map(() => undefined),
      this.handle('No se pudo actualizar el horario.'),
    );
  }

  deleteSchedule(medicoId: number, horarioId: number): Observable<void> {
    void medicoId;
    const run = (async (): Promise<void> => {
      const { error } = await this.sb.client.from('horarios_medicos').delete().eq('horario_id', horarioId);
      if (error) throw this.sb.toHttpError(error);
    })();
    return from(run).pipe(
      map(() => undefined),
      this.handle('No se pudo eliminar el horario.'),
    );
  }
}
