import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { SupabaseClientService } from './supabase-client.service';
import { ToastService } from './toast.service';
import { PageQuery, PagedResult } from '../models/common.model';
import { ContactoEmergencia, ContactoEmergenciaInput, Paciente, PacienteInput, Sexo, TipoDocumento } from '../models/patient.model';

type PacienteRow = {
  paciente_id: number; codigo_paciente: string; tipo_documento: string;
  numero_documento: string; nombres: string; apellidos: string;
  fecha_nacimiento: string; sexo: string; estado_civil: string | null;
  telefono: string | null; telefono_secundario: string | null; email: string | null;
  direccion: string | null; ciudad: string | null; pais: string | null;
  ocupacion: string | null; tipo_sangre: string | null;
  activo: boolean; fecha_registro: string;
};

type ContactoRow = {
  contacto_emergencia_id: number; paciente_id: number; nombre_completo: string;
  parentesco: string | null; telefono: string; telefono_secundario: string | null;
  email: string | null; prioridad: number; activo: boolean;
};

const PACIENTE_SELECT =
  'paciente_id, codigo_paciente, tipo_documento, numero_documento, nombres, apellidos, fecha_nacimiento, sexo, estado_civil, telefono, telefono_secundario, email, direccion, ciudad, pais, ocupacion, tipo_sangre, activo, fecha_registro';
const CONTACTO_SELECT =
  'contacto_emergencia_id, paciente_id, nombre_completo, parentesco, telefono, telefono_secundario, email, prioridad, activo';

function toPaciente(r: PacienteRow): Paciente {
  return {
    pacienteId: r.paciente_id,
    codigoPaciente: r.codigo_paciente,
    tipoDocumento: r.tipo_documento as TipoDocumento,
    numeroDocumento: r.numero_documento,
    nombres: r.nombres,
    apellidos: r.apellidos,
    fechaNacimiento: r.fecha_nacimiento,
    sexo: r.sexo as Sexo,
    estadoCivil: r.estado_civil,
    telefono: r.telefono,
    telefonoSecundario: r.telefono_secundario,
    email: r.email,
    direccion: r.direccion,
    ciudad: r.ciudad,
    pais: r.pais,
    ocupacion: r.ocupacion,
    tipoSangre: r.tipo_sangre,
    activo: r.activo,
    fechaRegistro: r.fecha_registro,
  };
}

function toContacto(r: ContactoRow): ContactoEmergencia {
  return {
    contactoEmergenciaId: r.contacto_emergencia_id,
    pacienteId: r.paciente_id,
    nombreCompleto: r.nombre_completo,
    parentesco: r.parentesco,
    telefono: r.telefono,
    telefonoSecundario: r.telefono_secundario,
    email: r.email,
    prioridad: r.prioridad,
    activo: r.activo,
  };
}

/** Pacientes y contactos contra la ÚNICA base Supabase. Misma API pública. */
@Injectable({ providedIn: 'root' })
export class PatientService {
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

  list(query: PageQuery): Observable<PagedResult<Paciente>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const run = (async (): Promise<PagedResult<Paciente>> => {
      let q = this.sb.client
        .from('pacientes')
        .select(PACIENTE_SELECT, { count: 'exact' })
        .order('paciente_id', { ascending: true })
        .range((page - 1) * pageSize, page * pageSize - 1);
      const s = (query.search ?? '').trim();
      if (s) q = q.or(`nombres.ilike.%${s}%,apellidos.ilike.%${s}%,numero_documento.ilike.%${s}%,telefono.ilike.%${s}%`);
      const { data, error, count } = await q;
      if (error) throw this.sb.toHttpError(error);
      return { items: ((data ?? []) as unknown as PacienteRow[]).map(toPaciente), total: count ?? 0, page, pageSize };
    })();
    return from(run).pipe(this.handle('No se pudieron cargar los pacientes.'));
  }

  getByIds(ids: number[]): Observable<Paciente[]> {
    const run = (async (): Promise<Paciente[]> => {
      if (!ids.length) return [];
      const { data, error } = await this.sb.client.from('pacientes').select(PACIENTE_SELECT).in('paciente_id', ids);
      if (error) throw this.sb.toHttpError(error);
      return ((data ?? []) as unknown as PacienteRow[]).map(toPaciente);
    })();
    return from(run).pipe(this.handle('No se pudieron cargar los pacientes.'));
  }

  getById(pacienteId: number): Observable<Paciente> {
    const run = (async (): Promise<Paciente> => {
      const { data, error } = await this.sb.client.from('pacientes').select(PACIENTE_SELECT).eq('paciente_id', pacienteId).maybeSingle();
      if (error) throw this.sb.toHttpError(error);
      if (!data) this.sb.fail(404, 'Paciente no encontrado.');
      return toPaciente(data as unknown as PacienteRow);
    })();
    return from(run).pipe(this.handle('No se pudo cargar el paciente.'));
  }

  searchByDocumento(numeroDocumento: string): Observable<Paciente> {
    const run = (async (): Promise<Paciente> => {
      const { data, error } = await this.sb.client
        .from('pacientes')
        .select(PACIENTE_SELECT)
        .eq('numero_documento', numeroDocumento.trim())
        .maybeSingle();
      if (error) throw this.sb.toHttpError(error);
      if (!data) this.sb.fail(404, 'No existe un paciente con ese documento.');
      return toPaciente(data as unknown as PacienteRow);
    })();
    return from(run).pipe(this.handle('No se encontró el paciente.'));
  }

  create(input: PacienteInput): Observable<Paciente> {
    const run = (async (): Promise<Paciente> => {
      const codigo = input.codigoPaciente ?? `PAC-${String(Date.now()).slice(-6)}`;
      const { data, error } = await this.sb.client
        .from('pacientes')
        .insert({
          codigo_paciente: codigo,
          tipo_documento: input.tipoDocumento,
          numero_documento: input.numeroDocumento,
          nombres: input.nombres,
          apellidos: input.apellidos,
          fecha_nacimiento: input.fechaNacimiento,
          sexo: input.sexo,
          estado_civil: input.estadoCivil ?? null,
          telefono: input.telefono ?? null,
          telefono_secundario: input.telefonoSecundario ?? null,
          email: input.email ?? null,
          direccion: input.direccion ?? null,
          ciudad: input.ciudad ?? null,
          pais: input.pais ?? 'El Salvador',
          ocupacion: input.ocupacion ?? null,
          tipo_sangre: input.tipoSangre ?? null,
          activo: input.activo,
        })
        .select(PACIENTE_SELECT)
        .single();
      if (error) {
        if (error.code === '23505') this.sb.fail(409, 'Ya existe un paciente con ese número de documento.');
        throw this.sb.toHttpError(error);
      }
      return toPaciente(data as unknown as PacienteRow);
    })();
    return from(run).pipe(this.handle('No se pudo crear el paciente.'));
  }

  update(pacienteId: number, input: PacienteInput): Observable<void> {
    const run = (async (): Promise<void> => {
      const { error } = await this.sb.client
        .from('pacientes')
        .update({
          tipo_documento: input.tipoDocumento,
          numero_documento: input.numeroDocumento,
          nombres: input.nombres,
          apellidos: input.apellidos,
          fecha_nacimiento: input.fechaNacimiento,
          sexo: input.sexo,
          estado_civil: input.estadoCivil ?? null,
          telefono: input.telefono ?? null,
          telefono_secundario: input.telefonoSecundario ?? null,
          email: input.email ?? null,
          direccion: input.direccion ?? null,
          ciudad: input.ciudad ?? null,
          pais: input.pais ?? null,
          ocupacion: input.ocupacion ?? null,
          tipo_sangre: input.tipoSangre ?? null,
          activo: input.activo,
        })
        .eq('paciente_id', pacienteId);
      if (error) {
        if (error.code === '23505') this.sb.fail(409, 'Ya existe un paciente con ese número de documento.');
        throw this.sb.toHttpError(error);
      }
    })();
    return from(run).pipe(
      map(() => undefined),
      this.handle('No se pudo actualizar el paciente.'),
    );
  }

  /** Baja lógica: `activo = false`. */
  deactivate(pacienteId: number): Observable<void> {
    const run = (async (): Promise<void> => {
      const { error } = await this.sb.client.from('pacientes').update({ activo: false }).eq('paciente_id', pacienteId);
      if (error) throw this.sb.toHttpError(error);
    })();
    return from(run).pipe(
      map(() => undefined),
      this.handle('No se pudo desactivar el paciente.'),
    );
  }

  listContacts(pacienteId: number): Observable<ContactoEmergencia[]> {
    const run = (async (): Promise<ContactoEmergencia[]> => {
      const { data, error } = await this.sb.client
        .from('contactos_emergencia')
        .select(CONTACTO_SELECT)
        .eq('paciente_id', pacienteId)
        .order('prioridad', { ascending: true });
      if (error) throw this.sb.toHttpError(error);
      return ((data ?? []) as unknown as ContactoRow[]).map(toContacto);
    })();
    return from(run).pipe(this.handle('No se pudieron cargar los contactos.'));
  }

  createContact(pacienteId: number, input: ContactoEmergenciaInput): Observable<ContactoEmergencia> {
    const run = (async (): Promise<ContactoEmergencia> => {
      const { data, error } = await this.sb.client
        .from('contactos_emergencia')
        .insert({
          paciente_id: pacienteId,
          nombre_completo: input.nombreCompleto,
          parentesco: input.parentesco ?? null,
          telefono: input.telefono,
          telefono_secundario: input.telefonoSecundario ?? null,
          email: input.email ?? null,
          prioridad: input.prioridad,
          activo: input.activo,
        })
        .select(CONTACTO_SELECT)
        .single();
      if (error) throw this.sb.toHttpError(error);
      return toContacto(data as unknown as ContactoRow);
    })();
    return from(run).pipe(this.handle('No se pudo crear el contacto.'));
  }

  updateContact(pacienteId: number, contactoEmergenciaId: number, input: ContactoEmergenciaInput): Observable<void> {
    void pacienteId;
    const run = (async (): Promise<void> => {
      const { error } = await this.sb.client
        .from('contactos_emergencia')
        .update({
          nombre_completo: input.nombreCompleto,
          parentesco: input.parentesco ?? null,
          telefono: input.telefono,
          telefono_secundario: input.telefonoSecundario ?? null,
          email: input.email ?? null,
          prioridad: input.prioridad,
          activo: input.activo,
        })
        .eq('contacto_emergencia_id', contactoEmergenciaId);
      if (error) throw this.sb.toHttpError(error);
    })();
    return from(run).pipe(
      map(() => undefined),
      this.handle('No se pudo actualizar el contacto.'),
    );
  }

  deleteContact(pacienteId: number, contactoEmergenciaId: number): Observable<void> {
    void pacienteId;
    const run = (async (): Promise<void> => {
      const { error } = await this.sb.client.from('contactos_emergencia').delete().eq('contacto_emergencia_id', contactoEmergenciaId);
      if (error) throw this.sb.toHttpError(error);
    })();
    return from(run).pipe(
      map(() => undefined),
      this.handle('No se pudo eliminar el contacto.'),
    );
  }
}
