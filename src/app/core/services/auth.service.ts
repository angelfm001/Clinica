import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, RolNombre, UsuarioSesion } from '../models/security.model';
import { ApiEnvelope, unwrap } from './api-utils';

/** Forma de `LoginResponse` / `UsuarioDto` en MedicalAppointments.Security. */
interface LoginResponseApi {
  token: string;
  expiraEn: string;
  usuario: { id: number; username: string; nombre: string; rolId: number; rol: RolNombre; medicoId?: number | null };
}

const STORAGE_KEY = 'cm.session';

interface StoredSession {
  token: string;
  usuario: UsuarioSesion;
  expiraEn: string;
}

/**
 * Autenticación contra MedicalAppointments.Security.
 * El token se guarda en `sessionStorage` (no persiste entre pestañas/reinicios
 * del navegador) y se expone vía signals para que guards e interceptor lo lean
 * de forma síncrona. El control de acceso se resuelve únicamente con el rol
 * incluido en el JWT (no hay Permisos ni Rol_Permiso en este prototipo).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = `${environment.api.security}`;

  private readonly session = signal<StoredSession | null>(this.restore());

  readonly usuario = computed(() => this.session()?.usuario ?? null);
  readonly isAuthenticated = computed(() => !!this.session());
  readonly rol = computed<RolNombre | null>(() => this.session()?.usuario.rol ?? null);
  readonly token = computed(() => this.session()?.token ?? null);

  constructor(private readonly http: HttpClient, private readonly router: Router) {}

  private restore(): StoredSession | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as StoredSession) : null;
    } catch {
      return null;
    }
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    const body = { username: request.nombreUsuario, password: request.contrasena };
    return this.http.post<ApiEnvelope<LoginResponseApi>>(`${this.baseUrl}/auth/login`, body).pipe(
      unwrap<LoginResponseApi>(),
      map((res): LoginResponse => ({
        token: res.token,
        expiraEn: res.expiraEn,
        usuario: {
          usuarioId: res.usuario.id,
          nombreUsuario: res.usuario.username,
          nombreCompleto: res.usuario.nombre,
          email: '',
          rol: res.usuario.rol,
          medicoId: res.usuario.medicoId ?? null,
        },
      })),
      tap((res) => {
        const stored: StoredSession = { token: res.token, usuario: res.usuario, expiraEn: res.expiraEn };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        this.session.set(stored);
      }),
    );
  }

  /** El JWT no tiene estado en el servidor (Security no expone /auth/logout): basta con descartarlo. */
  logout(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
    this.router.navigateByUrl('/login');
  }

  hasRol(...roles: RolNombre[]): boolean {
    const actual = this.rol();
    return !!actual && roles.includes(actual);
  }

  iniciales(): string {
    const nombre = this.usuario()?.nombreCompleto ?? '';
    const partes = nombre.trim().split(/\s+/);
    return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || 'US';
  }
}
