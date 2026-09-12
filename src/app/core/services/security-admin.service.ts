import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { SupabaseClientService } from './supabase-client.service';
import { ToastService } from './toast.service';
import { PageQuery, PagedResult } from '../models/common.model';
import { Rol, RolNombre, Usuario, UsuarioInput } from '../models/security.model';

type UsuarioRow = {
  usuario_id: number; nombre_usuario: string; nombre_completo: string;
  email: string; rol_id: number; medico_id: number | null; activo: boolean;
  ultimo_acceso: string | null; fecha_creacion: string;
  roles: { nombre: string } | null;
};

function toUsuario(r: UsuarioRow): Usuario {
  return {
    usuarioId: r.usuario_id,
    nombreUsuario: r.nombre_usuario,
    nombreCompleto: r.nombre_completo,
    email: r.email,
    rolId: r.rol_id,
    rol: (r.roles?.nombre ?? 'Recepcion') as RolNombre,
    medicoId: r.medico_id,
    activo: r.activo,
    ultimoAcceso: r.ultimo_acceso,
    fechaCreacion: r.fecha_creacion,
  };
}

/**
 * Administración de usuarios/roles contra la ÚNICA base Supabase.
 * Misma API pública que con microservicios: los componentes no cambian.
 */
@Injectable({ providedIn: 'root' })
export class SecurityAdminService {
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

  listUsuarios(query: PageQuery): Observable<PagedResult<Usuario>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const run = (async (): Promise<PagedResult<Usuario>> => {
      let q = this.sb.client
        .from('usuarios')
        .select('usuario_id, nombre_usuario, nombre_completo, email, rol_id, medico_id, activo, ultimo_acceso, fecha_creacion, roles!inner(nombre)', { count: 'exact' })
        .order('usuario_id', { ascending: true })
        .range((page - 1) * pageSize, page * pageSize - 1);
      const s = (query.search ?? '').trim();
      if (s) q = q.or(`nombre_completo.ilike.%${s}%,nombre_usuario.ilike.%${s}%`);
      const { data, error, count } = await q;
      if (error) throw this.sb.toHttpError(error);
      return {
        items: ((data ?? []) as unknown as UsuarioRow[]).map(toUsuario),
        total: count ?? 0, page, pageSize,
      };
    })();
    return from(run).pipe(this.handle('No se pudieron cargar los usuarios.'));
  }

  createUsuario(input: UsuarioInput): Observable<Usuario> {
    const run = (async (): Promise<Usuario> => {
      const { data, error } = await this.sb.client
        .from('usuarios')
        .insert({
          nombre_usuario: input.nombreUsuario,
          nombre_completo: input.nombreCompleto,
          email: input.email,
          contrasena: input.contrasena ?? 'demo1234',
          rol_id: input.rolId,
          medico_id: input.medicoId ?? null,
          activo: input.activo,
        })
        .select('usuario_id, nombre_usuario, nombre_completo, email, rol_id, medico_id, activo, ultimo_acceso, fecha_creacion, roles!inner(nombre)')
        .single();
      if (error) {
        if (error.code === '23505') this.sb.fail(409, 'El nombre de usuario ya existe.');
        throw this.sb.toHttpError(error);
      }
      return toUsuario(data as unknown as UsuarioRow);
    })();
    return from(run).pipe(this.handle('No se pudo crear el usuario.'));
  }

  updateUsuario(usuarioId: number, input: UsuarioInput): Observable<void> {
    const run = (async (): Promise<void> => {
      const patch: Record<string, unknown> = {
        nombre_usuario: input.nombreUsuario,
        nombre_completo: input.nombreCompleto,
        email: input.email,
        rol_id: input.rolId,
        medico_id: input.medicoId ?? null,
        activo: input.activo,
      };
      if (input.contrasena) patch['contrasena'] = input.contrasena;
      const { error } = await this.sb.client.from('usuarios').update(patch).eq('usuario_id', usuarioId);
      if (error) throw this.sb.toHttpError(error);
    })();
    return from(run).pipe(
      map(() => undefined),
      this.handle('No se pudo actualizar el usuario.'),
    );
  }

  setUsuarioEstado(usuarioId: number, activo: boolean): Observable<void> {
    const run = (async (): Promise<void> => {
      const { error } = await this.sb.client.from('usuarios').update({ activo }).eq('usuario_id', usuarioId);
      if (error) throw this.sb.toHttpError(error);
    })();
    return from(run).pipe(
      map(() => undefined),
      this.handle('No se pudo cambiar el estado del usuario.'),
    );
  }

  listRoles(): Observable<Rol[]> {
    const run = (async (): Promise<Rol[]> => {
      const { data, error } = await this.sb.client
        .from('roles')
        .select('rol_id, nombre, activo')
        .order('rol_id');
      if (error) throw this.sb.toHttpError(error);
      return ((data ?? []) as { rol_id: number; nombre: string; activo: boolean }[]).map((r) => ({
        rolId: r.rol_id, nombre: r.nombre, activo: r.activo,
      }));
    })();
    return from(run).pipe(this.handle('No se pudieron cargar los roles.'));
  }
}
