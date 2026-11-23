import { Observable, map } from 'rxjs';

import { PageQuery, PagedResult } from '../models/common.model';

/**
 * Utilidades compartidas por los clientes HTTP de los microservicios.
 *
 * Casi todos los microservicios .NET responden con el sobre estándar
 * `HttpResponse<T>` ({ succeeded, result, errorCode, errorMessage }); Patient
 * devuelve el objeto directamente. `unwrap` acepta ambos formatos para que los
 * servicios no tengan que distinguirlos.
 */
export interface ApiEnvelope<T> {
  succeeded: boolean;
  result: T;
  errorCode: number;
  errorMessage: string | null;
}

function isEnvelope<T>(body: unknown): body is ApiEnvelope<T> {
  return !!body && typeof body === 'object' && 'succeeded' in body && 'result' in body;
}

export function unwrap<T>() {
  return (source: Observable<ApiEnvelope<T> | T>): Observable<T> =>
    source.pipe(map((body) => (isEnvelope<T>(body) ? body.result : body)));
}

/**
 * Los microservicios devuelven listas completas (sin paginación del lado del
 * servidor), así que la búsqueda y la paginación se aplican aquí, con el mismo
 * contrato `PagedResult` que esperan los componentes.
 */
export function paginar<T>(items: T[], query: PageQuery, texto: (item: T) => string): PagedResult<T> {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const q = normalizar(query.search ?? '');
  const filtrados = q ? items.filter((i) => normalizar(texto(i)).includes(q)) : items;
  const inicio = (page - 1) * pageSize;
  return { items: filtrados.slice(inicio, inicio + pageSize), total: filtrados.length, page, pageSize };
}

/** Minúsculas y sin acentos, para búsquedas tolerantes. */
export function normalizar(valor: string): string {
  return valor.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

/** 'HH:mm:ss' (TimeOnly de .NET) → 'HH:mm'. */
export function aHoraCorta(valor: string | null | undefined): string {
  return (valor ?? '').slice(0, 5);
}

/** 'HH:mm' → 'HH:mm:ss', formato que acepta TimeOnly en el backend. */
export function aTimeOnly(hora: string): string {
  return hora.length === 5 ? `${hora}:00` : hora;
}

/** DateTime de .NET ('yyyy-MM-ddTHH:mm:ss') → { fecha: 'yyyy-MM-dd', hora: 'HH:mm' }. */
export function separarFechaHora(fechaHora: string): { fecha: string; hora: string } {
  const [fecha, resto = ''] = fechaHora.split('T');
  return { fecha, hora: resto.slice(0, 5) };
}
