/**
 * MedicalAppointments.ClinicalCare — versión reducida (5 módulos).
 * Fusiona lo que antes eran `MedicalRecord` y `Treatment` en un único
 * microservicio. No existen Expedientes_Clínicos, Antecedentes, Alergias,
 * Hábitos, catálogo de Síntomas ni catálogo CIE-10: el historial clínico se
 * obtiene directamente de las Atenciones registradas del paciente, y el
 * diagnóstico se guarda como texto libre en la propia Atención.
 */

export type EstadoAtencion = 'Abierta' | 'Cerrada';

export interface SignosVitales {
  signosVitalesId?: number;
  atencionId?: number;
  /** Formato libre, ej. "120/80". */
  presionArterial?: string | null;
  frecuenciaCardiaca?: number | null;
  temperatura?: number | null;
  saturacionOxigeno?: number | null;
  peso?: number | null;
  talla?: number | null;
  fechaRegistro?: string;
}

export interface NotaMedica {
  notaMedicaId: number;
  atencionId: number;
  nota: string;
  fecha: string;
  medicoNombre: string;
}

/**
 * Atención: vincula CitaId, PacienteId y MedicoId. El motivo de consulta vive
 * en la Cita (Appointment); aquí solo se registra el diagnóstico y el cierre.
 */
export interface Atencion {
  atencionId: number;
  citaId: number;
  pacienteId: number;
  pacienteNombre: string;
  medicoId: number;
  medicoNombre: string;
  fechaAtencion: string;
  /** Motivo de consulta, resuelto desde Appointment.Citas para mostrarlo en la ficha. */
  motivoConsulta?: string | null;
  diagnostico?: string | null;
  estado: EstadoAtencion;
  signosVitales?: SignosVitales | null;
  notas: NotaMedica[];
}

export interface AbrirAtencionInput {
  citaId: number;
  pacienteId: number;
  medicoId: number;
}

export type ViaAdministracion =
  | 'Oral' | 'Intravenosa' | 'Intramuscular' | 'Subcutánea' | 'Tópica' | 'Inhalatoria' | 'Oftálmica' | 'Rectal';

export const VIAS_ADMINISTRACION: ViaAdministracion[] = [
  'Oral', 'Intravenosa', 'Intramuscular', 'Subcutánea', 'Tópica', 'Inhalatoria', 'Oftálmica', 'Rectal',
];

export interface Medicamento {
  medicamentoId: number;
  nombre: string;
  principioActivo: string;
  presentacion: string;
  concentracion: string;
  activo: boolean;
}

export type MedicamentoInput = Omit<Medicamento, 'medicamentoId'>;

/** Filtros de catálogo, además del texto libre de `search`. Se resuelven contra la DB (Supabase). */
export interface MedicamentoFiltro {
  activo?: boolean;
}

export interface PrescripcionDetalle {
  prescripcionDetalleId?: number;
  medicamentoId: number;
  medicamentoNombre?: string;
  presentacion?: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  viaAdministracion: ViaAdministracion;
}

export interface Prescripcion {
  prescripcionId: number;
  atencionId: number;
  pacienteId: number;
  pacienteNombre: string;
  medicoNombre?: string;
  fecha: string;
  indicacionesGenerales?: string | null;
  detalles: PrescripcionDetalle[];
}

export interface PrescripcionInput {
  atencionId: number;
  pacienteId: number;
  indicacionesGenerales?: string | null;
  detalles: PrescripcionDetalle[];
}
