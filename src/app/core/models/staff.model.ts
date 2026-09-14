/** MedicalAppointments.Staff — Médicos, Especialidades, Consultorios, Horarios. */

export interface Especialidad {
  especialidadId: number;
  nombre: string;
  activo: boolean;
}

export interface Medico {
  medicoId: number;
  nombres: string;
  apellidos: string;
  /** Número de licencia médica. */
  licencia: string;
  /** Especialidad principal y única del médico (sin tabla de relación N a N). */
  especialidadId: number;
  /** Nombre de la especialidad, resuelto por el `Core` de Staff para evitar N+1. */
  especialidadNombre?: string;
  telefono?: string | null;
  email?: string | null;
  activo: boolean;
}

export type MedicoInput = Omit<Medico, 'medicoId' | 'especialidadNombre'>;

/** Filtros de médicos, además del texto libre de `search`. Se resuelven contra la DB (Supabase). */
export interface MedicoFiltro {
  activo?: boolean;
  especialidadId?: number;
}

export interface Consultorio {
  consultorioId: number;
  nombre: string;
  ubicacion?: string | null;
  activo: boolean;
}

/** 1 = Lunes … 7 = Domingo (ISO-8601). */
export type DiaSemana = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface HorarioMedico {
  horarioId: number;
  medicoId: number;
  diaSemana: DiaSemana;
  /** 'HH:mm' */
  horaInicio: string;
  horaFin: string;
  consultorioId: number;
  consultorioNombre?: string;
  activo: boolean;
}

export type HorarioMedicoInput = Omit<HorarioMedico, 'horarioId' | 'consultorioNombre'>;

export const DIAS_SEMANA: { value: DiaSemana; label: string; corto: string }[] = [
  { value: 1, label: 'Lunes', corto: 'Lun' },
  { value: 2, label: 'Martes', corto: 'Mar' },
  { value: 3, label: 'Miércoles', corto: 'Mié' },
  { value: 4, label: 'Jueves', corto: 'Jue' },
  { value: 5, label: 'Viernes', corto: 'Vie' },
  { value: 6, label: 'Sábado', corto: 'Sáb' },
  { value: 7, label: 'Domingo', corto: 'Dom' },
];
