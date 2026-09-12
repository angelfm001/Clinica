import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { environment } from '../../../environments/environment';

/**
 * ÚNICO punto de acceso a datos de la aplicación.
 *
 * Una sola base de datos Supabase (proyecto único) reemplaza los 5
 * microservicios anteriores (Security, Patient, Staff, Appointment,
 * ClinicalCare) y el mock en memoria. Todos los servicios del dominio
 * (`AuthService`, `PatientService`, etc.) inyectan esta clase y usan
 * `client` — nunca `HttpClient` — manteniendo la misma API pública
 * (Observables + modelos camelCase) para no tocar los componentes.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  readonly client: SupabaseClient;

  constructor() {
    const { url, anonKey } = environment.supabase;
    if (!url || !anonKey || url.includes('TU-PROYECTO')) {
      console.warn(
        '[Supabase] Configura `environment.supabase.url` y `anonKey` con los datos de tu proyecto. ' +
          'Ver supabase/schema.sql para crear las tablas.',
      );
    }
    this.client = createClient(url, anonKey);
  }

  /**
   * Convierte un error de PostgREST/Supabase en `HttpErrorResponse` para que
   * el `error.interceptor`, los `login` y demás componentes que leen
   * `err?.error?.detail` sigan funcionando sin cambios.
   */
  toHttpError(error: unknown, fallback = 'Ocurrió un error al procesar la solicitud.'): HttpErrorResponse {
    const err = error as { code?: string; message?: string; details?: string; hint?: string };
    const detail = err?.message ?? fallback;

    // Conflictos de unicidad de Postgres (ej. numero_documento duplicado).
    if (err?.code === '23505') {
      return new HttpErrorResponse({ status: 409, error: { title: detail, status: 409, detail } });
    }
    if (err?.code === 'PGRST116') {
      return new HttpErrorResponse({ status: 404, error: { title: detail, status: 404, detail } });
    }
    // Si ya es HttpErrorResponse (lanzado por los servicios), se propaga tal cual.
    if (error instanceof HttpErrorResponse) return error;
    return new HttpErrorResponse({
      status: 400,
      error: { title: detail, status: 400, detail },
    });
  }

  /** Lanza `HttpErrorResponse` 404 cuando no hay fila, 409 en duplicados, etc. */
  fail(status: number, detail: string): never {
    throw new HttpErrorResponse({ status, error: { title: detail, status, detail } });
  }
}
