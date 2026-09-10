/**
 * MedicalAppointments.Appointment — versión reducida (5 módulos).
 * Una sola tabla `Citas`; el estado se maneja como string controlado (no existe
 * `Estados_Cita`) y no hay tabla de Turnos (cola de espera física fuera de
 * alcance del prototipo).
 */

export type EstadoCita = 'Programada' | 'Confirmada' | 'En atencion' | 'Atendida' | 'Cancelada';

/**
 * Cita enriquecida: el `Core` de Appointment compone los nombres consultando
 * los endpoints de Patient y Staff (mitigación del problema N+1). La cita solo
 * persiste los IDs de Paciente, Médico y Consultorio; la especialidad se
 * resuelve a partir del médico (Staff ya no permite más de una por médico).
 */
export interface Cita {
  citaId: number;
  pacienteId: number;
  pacienteNombre: string;
  pacienteDocumento?: string;
  medicoId: number;
  medicoNombre: string;
  especialidadNombre?: string;
  consultorioId: number;
  consultorioNombre: string;
  /** ISO 'yyyy-MM-dd' (parte de FechaHora). */
  fecha: string;
  /** 'HH:mm' (parte de FechaHora). */
  hora: string;
  motivo?: string | null;
  estado: EstadoCita;
  observacion?: string | null;
}

export interface CitaInput {
  pacienteId: number;
  medicoId: number;
  consultorioId: number;
  fecha: string;
  hora: string;
  motivo?: string | null;
}

export interface CitaFiltro {
  desde?: string;
  hasta?: string;
  medicoId?: number;
  pacienteId?: number;
  estado?: EstadoCita;
}

/** Slot horario calculado a partir de Staff.HorariosMedicos menos las citas ya ocupadas. */
export interface SlotDisponible {
  hora: string;
  disponible: boolean;
  consultorioId: number;
}

/** Duración fija asumida por cita para fines de agenda (no persistida en Citas). */
export const DURACION_CITA_MIN = 30;

/** Metadatos de presentación por estado (color del bloque en el calendario). */
export const ESTADO_CITA_META: Record<EstadoCita, { badge: string; color: string; label: string }> = {
  'Programada':  { badge: 'badge-info',    color: 'var(--info)',    label: 'Programada' },
  'Confirmada':  { badge: 'badge-success', color: 'var(--success)', label: 'Confirmada' },
  'En atencion': { badge: 'badge-purple',  color: 'var(--purple)',  label: 'En atención' },
  'Atendida':    { badge: 'badge-neutral', color: 'var(--neutral)', label: 'Atendida' },
  'Cancelada':   { badge: 'badge-danger',  color: 'var(--danger)',  label: 'Cancelada' },
};
