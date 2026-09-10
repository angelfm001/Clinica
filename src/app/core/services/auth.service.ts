import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, RolNombre, UsuarioSesion } from '../models/security.model';

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
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, request).pipe(
      tap((res) => {
        const stored: StoredSession = { token: res.token, usuario: res.usuario, expiraEn: res.expiraEn };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        this.session.set(stored);
      }),
    );
  }

  logout(): void {
    this.http.post(`${this.baseUrl}/auth/logout`, {}).subscribe({ complete: () => undefined, error: () => undefined });
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
