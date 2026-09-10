/** Tipos compartidos por todos los microservicios. */

/** Respuesta paginada estándar del backend. */
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Parámetros de consulta para listados paginados. */
export interface PageQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

/** ProblemDetails (RFC 7807) que devuelven los controllers .NET. */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string[]>;
}

export interface SelectOption<T = string> {
  value: T;
  label: string;
}
