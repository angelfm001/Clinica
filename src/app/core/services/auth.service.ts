import { Injectable, computed, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

import { SupabaseClientService } from './supabase-client.service';
import { ToastService } from './toast.service';
import { LoginRequest, LoginResponse, RolNombre, UsuarioSesion } from '../models/security.model';

const STORAGE_KEY = 'cm.session';

interface StoredSession {
  token: string;
  usuario: UsuarioSesion;
  expiraEn: string;
}

/**
 * Autenticación contra la ÚNICA base Supabase (tablas `usuarios` + `roles`).
 * Misma API pública que antes (signals + `login(): Observable<LoginResponse>`)
 * para no tocar guards, interceptor ni componentes.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = signal<StoredSession | null>(this.restore());

  readonly usuario = computed(() => this.session()?.usuario ?? null);
  readonly isAuthenticated = computed(() => !!this.session());
  readonly rol = computed<RolNombre | null>(() => this.session()?.usuario.rol ?? null);
  readonly token = computed(() => this.session()?.token ?? null);

  constructor(
    private readonly sb: SupabaseClientService,
    private readonly router: Router,
    private readonly toast: ToastService,
  ) {}

  private restore(): StoredSession | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as StoredSession) : null;
    } catch {
      return null;
    }
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    const nombreUsuario = request.nombreUsuario.trim();
    const run = (async (): Promise<LoginResponse> => {
      const { data, error } = await this.sb.client
        .from('usuarios')
        .select('usuario_id, nombre_usuario, nombre_completo, email, contrasena, medico_id, activo, roles!inner(nombre)')
        .ilike('nombre_usuario', nombreUsuario)
        .limit(1)
        .maybeSingle();

      if (error) throw this.sb.toHttpError(error);
      if (!data) this.sb.fail(401, 'Usuario o contraseña incorrectos.');
      const row = data as unknown as {
        usuario_id: number; nombre_usuario: string; nombre_completo: string;
        email: string; contrasena: string | null; medico_id: number | null;
        activo: boolean; roles: { nombre: string };
      };
      if (!row.activo) this.sb.fail(403, 'El usuario está desactivado.');
      if (!request.contrasena || (row.contrasena && row.contrasena !== request.contrasena)) {
        this.sb.fail(401, 'Usuario o contraseña incorrectos.');
      }

      const usuario: UsuarioSesion = {
        usuarioId: row.usuario_id,
        nombreUsuario: row.nombre_usuario,
        nombreCompleto: row.nombre_completo,
        email: row.email,
        rol: row.roles.nombre as RolNombre,
        medicoId: row.medico_id,
      };
      const res: LoginResponse = {
        // Token local opaco (sin backend JWT en el prototipo Supabase).
        token: `sb.${btoa(`${row.usuario_id}:${Date.now()}`)}`,
        expiraEn: new Date(Date.now() + 8 * 3600_000).toISOString(),
        usuario,
      };

      // Marca último acceso (best-effort, no bloquea el login).
      void this.sb.client
        .from('usuarios')
        .update({ ultimo_acceso: new Date().toISOString() })
        .eq('usuario_id', row.usuario_id);

      const stored: StoredSession = { token: res.token, usuario: res.usuario, expiraEn: res.expiraEn };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      this.session.set(stored);
      return res;
    })();

    return from(run).pipe(
      catchError((e: unknown) => {
        const http = e instanceof HttpErrorResponse ? e : this.sb.toHttpError(e);
        if (http.status !== 401 && http.status !== 403) {
          this.toast.error((http.error?.['detail'] as string) ?? 'No se pudo iniciar sesión.');
        }
        return throwError(() => http);
      }),
    );
  }

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
