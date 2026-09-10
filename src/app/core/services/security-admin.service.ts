import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageQuery, PagedResult } from '../models/common.model';
import { Rol, Usuario, UsuarioInput } from '../models/security.model';

/**
 * Cliente HTTP de administración de MedicalAppointments.Security (solo rol
 * Administrador). Versión reducida: solo Usuarios y Roles; no hay Permisos,
 * Rol_Permiso, Sesiones_Usuario ni Auditoría en este prototipo.
 */
@Injectable({ providedIn: 'root' })
export class SecurityAdminService {
  private readonly base = environment.api.security;

  constructor(private readonly http: HttpClient) {}

  listUsuarios(query: PageQuery): Observable<PagedResult<Usuario>> {
    let params = new HttpParams().set('page', query.page ?? 1).set('pageSize', query.pageSize ?? 10);
    if (query.search) params = params.set('search', query.search);
    return this.http.get<PagedResult<Usuario>>(`${this.base}/users`, { params });
  }

  createUsuario(input: UsuarioInput): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.base}/users`, input);
  }

  updateUsuario(usuarioId: number, input: UsuarioInput): Observable<void> {
    return this.http.put<void>(`${this.base}/users/${usuarioId}`, input);
  }

  setUsuarioEstado(usuarioId: number, activo: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base}/users/${usuarioId}/estado`, { activo });
  }

  listRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${this.base}/roles`);
  }
}
