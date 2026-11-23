/**
 * MedicalAppointments.ClinicalCare — fusiona lo que antes eran `MedicalRecord`
 * y `Treatment` en un único microservicio. Cada paciente tiene un Expediente
 * clínico (alergias, antecedentes y hábitos); el historial de atenciones se
 * obtiene de las Atenciones registradas del paciente. No hay catálogo de
 * Síntomas ni CIE-10: el diagnóstico es texto libre en la propia Atención.
 */

// ------------------------------------------------------------ Expediente clínico
export type TipoAlergia = 'Medicamento' | 'Alimento' | 'Ambiental' | 'Otra';
export type SeveridadAlergia = 'Leve' | 'Moderada' | 'Severa';
export type TipoAntecedente = 'Patologico' | 'Quirurgico' | 'Traumatico' | 'Familiar' | 'Otro';

export const TIPOS_ALERGIA: TipoAlergia[] = ['Medicamento', 'Alimento', 'Ambiental', 'Otra'];
export const SEVERIDADES_ALERGIA: SeveridadAlergia[] = ['Leve', 'Moderada', 'Severa'];
export const TIPOS_ANTECEDENTE: { valor: TipoAntecedente; etiqueta: string }[] = [
  { valor: 'Patologico', etiqueta: 'Patológico' },
  { valor: 'Quirurgico', etiqueta: 'Quirúrgico' },
  { valor: 'Traumatico', etiqueta: 'Traumático' },
  { valor: 'Familiar', etiqueta: 'Familiar' },
  { valor: 'Otro', etiqueta: 'Otro' },
];

export interface Alergia {
  alergiaId: number;
  sustancia: string;
  tipo: TipoAlergia;
  severidad: SeveridadAlergia;
  reaccion?: string | null;
  fechaRegistro: string;
}

export type AlergiaInput = Omit<Alergia, 'alergiaId' | 'fechaRegistro'>;

export interface Antecedente {
  antecedenteId: number;
  tipo: TipoAntecedente;
  descripcion: string;
  /** Solo en antecedentes familiares. */
  parentesco?: string | null;
  /** ISO 'yyyy-MM-dd'. */
  fechaDiagnostico?: string | null;
  fechaRegistro: string;
}

export type AntecedenteInput = Omit<Antecedente, 'antecedenteId' | 'fechaRegistro'>;

export interface HabitosExpediente {
  tabaquismo?: string | null;
  consumoAlcohol?: string | null;
  actividadFisica?: string | null;
  alimentacion?: string | null;
  observaciones?: string | null;
}

/** Uno por paciente: se abre con su primera atención o al consultarlo por primera vez. */
export interface ExpedienteClinico extends HabitosExpediente {
  expedienteId: number;
  pacienteId: number;
  numeroExpediente: string;
  fechaApertura: string;
  alergias: Alergia[];
  antecedentes: Antecedente[];
}

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
