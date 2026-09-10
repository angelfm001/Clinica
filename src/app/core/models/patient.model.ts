/**
 * MedicalAppointments.Patient — Pacientes y Contactos de Emergencia.
 * Los nombres de campo replican `Domain.Model.Paciente` / `ContactoEmergencia`
 * (camelCase por la serialización por defecto de ASP.NET Core).
 */

export type TipoDocumento = 'DUI' | 'Pasaporte' | 'NIT' | 'Carnet de Minoridad' | 'Otro';
export type Sexo = 'M' | 'F' | 'O';
export type EstadoCivil = 'Soltero' | 'Casado' | 'Divorciado' | 'Viudo' | 'Union libre';

export interface Paciente {
  pacienteId: number;
  codigoPaciente: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  /** ISO 'yyyy-MM-dd' (DateOnly en el backend). */
  fechaNacimiento: string;
  sexo: Sexo;
  estadoCivil?: string | null;
  telefono?: string | null;
  telefonoSecundario?: string | null;
  email?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  pais?: string | null;
  ocupacion?: string | null;
  tipoSangre?: string | null;
  activo: boolean;
  fechaRegistro: string;
  contactosEmergencia?: ContactoEmergencia[];
}

/** Payload de CreatePacienteCommand / UpdatePacienteCommand. */
export type PacienteInput = Omit<
  Paciente,
  'pacienteId' | 'codigoPaciente' | 'fechaRegistro' | 'contactosEmergencia'
> & { codigoPaciente?: string };

export interface ContactoEmergencia {
  contactoEmergenciaId: number;
  pacienteId: number;
  nombreCompleto: string;
  parentesco?: string | null;
  telefono: string;
  telefonoSecundario?: string | null;
  email?: string | null;
  prioridad: number;
  activo: boolean;
}

export type ContactoEmergenciaInput = Omit<ContactoEmergencia, 'contactoEmergenciaId' | 'pacienteId'>;

export const PARENTESCOS = [
  'Madre', 'Padre', 'Hijo(a)', 'Cónyuge', 'Hermano(a)', 'Abuelo(a)', 'Tío(a)', 'Amigo(a)', 'Otro',
];

export const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
