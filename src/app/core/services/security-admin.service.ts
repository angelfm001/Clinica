import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageQuery, PagedResult } from '../models/common.model';
import { Rol, RolNombre, Usuario, UsuarioInput } from '../models/security.model';
import { ApiEnvelope, paginar, unwrap } from './api-utils';

/** `UsuarioDto` de MedicalAppointments.Security. */
interface UsuarioApi {
  id: number;
  username: string;
  nombre: string;
  rolId: number;
  rol: RolNombre;
  medicoId?: number | null;
  activo: boolean;
}

interface RolApi {
  id: number;
  nombre: string;
}

const aUsuario = (u: UsuarioApi): Usuario => ({
  usuarioId: u.id,
  nombreUsuario: u.username,
  nombreCompleto: u.nombre,
  email: '',
  rolId: u.rolId,
  rol: u.rol,
  medicoId: u.medicoId ?? null,
  activo: u.activo,
  ultimoAcceso: null,
  fechaCreacion: '',
});

/**
 * Cliente HTTP de administración de MedicalAppointments.Security (solo rol
 * Administrador): Usuarios y Roles.
 */
@Injectable({ providedIn: 'root' })
export class SecurityAdminService {
  private readonly base = environment.api.security;

  constructor(private readonly http: HttpClient) {}

  listUsuarios(query: PageQuery): Observable<PagedResult<Usuario>> {
    return this.http.get<ApiEnvelope<UsuarioApi[]>>(`${this.base}/users`).pipe(
      unwrap<UsuarioApi[]>(),
      map((items) => paginar(items.map(aUsuario), query, (u) => `${u.nombreUsuario} ${u.nombreCompleto} ${u.rol}`)),
    );
  }

  getUsuario(usuarioId: number): Observable<Usuario> {
    return this.http.get<ApiEnvelope<UsuarioApi>>(`${this.base}/users/${usuarioId}`).pipe(unwrap<UsuarioApi>(), map(aUsuario));
  }

  createUsuario(input: UsuarioInput): Observable<Usuario> {
    const body = {
      username: input.nombreUsuario,
      password: input.contrasena,
      nombre: input.nombreCompleto,
      rolId: Number(input.rolId),
      medicoId: input.medicoId ? Number(input.medicoId) : null,
    };
    return this.http.post<ApiEnvelope<UsuarioApi>>(`${this.base}/users`, body).pipe(unwrap<UsuarioApi>(), map(aUsuario));
  }

  updateUsuario(usuarioId: number, input: UsuarioInput): Observable<void> {
    const body = {
      nombre: input.nombreCompleto,
      rolId: Number(input.rolId),
      medicoId: input.medicoId ? Number(input.medicoId) : null,
      activo: input.activo,
      password: input.contrasena || null,
    };
    return this.http.put(`${this.base}/users/${usuarioId}`, body).pipe(map(() => undefined));
  }

  /** Security no tiene un endpoint de estado: se reenvía el usuario completo con `activo` cambiado. */
  setUsuarioEstado(usuarioId: number, activo: boolean): Observable<void> {
    return this.getUsuario(usuarioId).pipe(
      switchMap((u) =>
        this.updateUsuario(usuarioId, {
          nombreUsuario: u.nombreUsuario,
          nombreCompleto: u.nombreCompleto,
          email: u.email,
          rolId: u.rolId,
          medicoId: u.medicoId,
          activo,
        }),
      ),
    );
  }

  listRoles(): Observable<Rol[]> {
    return this.http.get<ApiEnvelope<RolApi[]>>(`${this.base}/roles`).pipe(
      unwrap<RolApi[]>(),
      map((roles) => roles.map((r) => ({ rolId: r.id, nombre: r.nombre, activo: true }))),
    );
  }
}
