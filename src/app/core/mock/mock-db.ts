/**
 * Base de datos en memoria usada por `mockBackendInterceptor`.
 *
 * Existe únicamente para poder demostrar y desarrollar la interfaz mientras los
 * microservicios se terminan. No la consume ningún componente: todo pasa por los
 * servicios HTTP reales. Con `environment.useMock = false` este archivo queda
 * fuera del flujo (y del bundle relevante) sin tocar una línea de la UI.
 *
 * Refleja la planificación reducida a 5 módulos: Security (solo Usuarios y
 * Roles), Patient (sin cambios), Staff (una especialidad por médico),
 * Appointment (sin Estados_Cita ni Turnos) y ClinicalCare (fusiona
 * MedicalRecord + Treatment, sin expediente/antecedentes/alergias/hábitos ni
 * catálogos de síntomas/CIE-10).
 */
import { Rol, Usuario } from '../models/security.model';
import { ContactoEmergencia, Paciente } from '../models/patient.model';
import { Consultorio, Especialidad, HorarioMedico, Medico } from '../models/staff.model';
import { Cita, EstadoCita } from '../models/appointment.model';
import { Atencion, Medicamento, Prescripcion } from '../models/clinical-care.model';

// ------------------------------------------------------------------ utils ---
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};
const HOY = new Date();
const dia = (n: number) => iso(addDays(HOY, n));
const hace = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

/** Lunes de la semana en curso, para sembrar la agenda alrededor de hoy. */
const lunes = (() => {
  const d = new Date(HOY);
  const offset = (d.getDay() + 6) % 7;
  return addDays(d, -offset);
})();
const diaSemana = (n: number) => iso(addDays(lunes, n));

// --------------------------------------------------------------- Security ---
export const roles: Rol[] = [
  { rolId: 1, nombre: 'Administrador', activo: true, usuariosAsignados: 1 },
  { rolId: 2, nombre: 'Medico', activo: true, usuariosAsignados: 2 },
  { rolId: 3, nombre: 'Recepcion', activo: true, usuariosAsignados: 2 },
];

export const usuarios: Usuario[] = [
  { usuarioId: 1, nombreUsuario: 'admin', nombreCompleto: 'Ángel Fuentes', email: 'admin@citasmedicas.sv', rolId: 1, rol: 'Administrador', medicoId: null, activo: true, ultimoAcceso: hace(12), fechaCreacion: dia(-320) },
  { usuarioId: 2, nombreUsuario: 'lmartinez', nombreCompleto: 'Dr. Luis Martínez', email: 'luis.martinez@citasmedicas.sv', rolId: 2, rol: 'Medico', medicoId: 1, activo: true, ultimoAcceso: hace(48), fechaCreacion: dia(-280) },
  { usuarioId: 3, nombreUsuario: 'asolis', nombreCompleto: 'Dra. Andrea Solís', email: 'andrea.solis@citasmedicas.sv', rolId: 2, rol: 'Medico', medicoId: 2, activo: true, ultimoAcceso: hace(190), fechaCreacion: dia(-265) },
  { usuarioId: 4, nombreUsuario: 'amartinez', nombreCompleto: 'Ana Martínez', email: 'ana.martinez@citasmedicas.sv', rolId: 3, rol: 'Recepcion', medicoId: null, activo: true, ultimoAcceso: hace(3), fechaCreacion: dia(-200) },
  { usuarioId: 5, nombreUsuario: 'jportillo', nombreCompleto: 'José Portillo', email: 'jose.portillo@citasmedicas.sv', rolId: 3, rol: 'Recepcion', medicoId: null, activo: false, ultimoAcceso: dia(-40), fechaCreacion: dia(-120) },
];

// ---------------------------------------------------------------- Patient ---
export const pacientes: Paciente[] = [
  { pacienteId: 1, codigoPaciente: 'PAC-0001', tipoDocumento: 'DUI', numeroDocumento: '01234567-8', nombres: 'Juan Carlos', apellidos: 'López Ramírez', fechaNacimiento: '1988-04-15', sexo: 'M', estadoCivil: 'Casado', telefono: '7600-1234', telefonoSecundario: '2260-1100', email: 'juan.lopez@email.com', direccion: 'Col. Escalón, Calle 3 #21', ciudad: 'San Salvador', pais: 'El Salvador', ocupacion: 'Ingeniero', tipoSangre: 'O+', activo: true, fechaRegistro: dia(-410) },
  { pacienteId: 2, codigoPaciente: 'PAC-0002', tipoDocumento: 'DUI', numeroDocumento: '04567890-1', nombres: 'María José', apellidos: 'Fernández Cruz', fechaNacimiento: '1992-11-22', sexo: 'F', estadoCivil: 'Soltero', telefono: '7621-5678', telefonoSecundario: null, email: 'maria.fernandez@email.com', direccion: 'Res. Altavista, Pje. 5 #12', ciudad: 'Soyapango', pais: 'El Salvador', ocupacion: 'Docente', tipoSangre: 'A+', activo: true, fechaRegistro: dia(-360) },
  { pacienteId: 3, codigoPaciente: 'PAC-0003', tipoDocumento: 'DUI', numeroDocumento: '01239876-5', nombres: 'Roberto', apellidos: 'Sánchez Molina', fechaNacimiento: '1975-02-03', sexo: 'M', estadoCivil: 'Divorciado', telefono: '7645-9876', telefonoSecundario: null, email: 'roberto.sanchez@email.com', direccion: 'Barrio San Miguelito #45', ciudad: 'San Salvador', pais: 'El Salvador', ocupacion: 'Comerciante', tipoSangre: 'B+', activo: true, fechaRegistro: dia(-300) },
  { pacienteId: 4, codigoPaciente: 'PAC-0004', tipoDocumento: 'DUI', numeroDocumento: '06543210-9', nombres: 'Laura Beatriz', apellidos: 'Hernández Paz', fechaNacimiento: '1990-08-09', sexo: 'F', estadoCivil: 'Casado', telefono: '7611-2345', telefonoSecundario: null, email: 'laura.hernandez@email.com', direccion: 'Col. Miramonte #8', ciudad: 'San Salvador', pais: 'El Salvador', ocupacion: 'Contadora', tipoSangre: 'O-', activo: true, fechaRegistro: dia(-280) },
  { pacienteId: 5, codigoPaciente: 'PAC-0005', tipoDocumento: 'DUI', numeroDocumento: '07894561-2', nombres: 'Ana Gabriela', apellidos: 'Ruiz Medina', fechaNacimiento: '1965-01-27', sexo: 'F', estadoCivil: 'Viudo', telefono: '7633-4455', telefonoSecundario: null, email: 'ana.ruiz@email.com', direccion: 'Col. Layco, Av. España', ciudad: 'San Salvador', pais: 'El Salvador', ocupacion: 'Jubilada', tipoSangre: 'AB+', activo: false, fechaRegistro: dia(-250) },
  { pacienteId: 6, codigoPaciente: 'PAC-0006', tipoDocumento: 'DUI', numeroDocumento: '02233445-6', nombres: 'Carlos Alberto', apellidos: 'Gómez Aguilar', fechaNacimiento: '1983-06-30', sexo: 'M', estadoCivil: 'Casado', telefono: '7788-9900', telefonoSecundario: null, email: 'carlos.gomez@email.com', direccion: 'Santa Tecla, Col. Utila', ciudad: 'Santa Tecla', pais: 'El Salvador', ocupacion: 'Arquitecto', tipoSangre: 'A-', activo: true, fechaRegistro: dia(-210) },
  { pacienteId: 7, codigoPaciente: 'PAC-0007', tipoDocumento: 'DUI', numeroDocumento: '03344556-7', nombres: 'José Antonio', apellidos: 'Ramírez Flores', fechaNacimiento: '1997-12-05', sexo: 'M', estadoCivil: 'Soltero', telefono: '7099-1122', telefonoSecundario: null, email: 'jose.ramirez@email.com', direccion: 'Mejicanos, Col. Zacamil', ciudad: 'Mejicanos', pais: 'El Salvador', ocupacion: 'Estudiante', tipoSangre: 'O+', activo: true, fechaRegistro: dia(-180) },
  { pacienteId: 8, codigoPaciente: 'PAC-0008', tipoDocumento: 'Pasaporte', numeroDocumento: 'B0912345', nombres: 'Sofía', apellidos: 'Navarro Iglesias', fechaNacimiento: '2001-03-18', sexo: 'F', estadoCivil: 'Soltero', telefono: '7455-6677', telefonoSecundario: null, email: 'sofia.navarro@email.com', direccion: 'Antiguo Cuscatlán', ciudad: 'Antiguo Cuscatlán', pais: 'España', ocupacion: 'Diseñadora', tipoSangre: 'B-', activo: true, fechaRegistro: dia(-150) },
  { pacienteId: 9, codigoPaciente: 'PAC-0009', tipoDocumento: 'DUI', numeroDocumento: '05566778-9', nombres: 'Marta Elena', apellidos: 'Portillo Vega', fechaNacimiento: '1958-09-14', sexo: 'F', estadoCivil: 'Casado', telefono: '7233-8899', telefonoSecundario: null, email: 'marta.portillo@email.com', direccion: 'San Marcos, Calle Principal', ciudad: 'San Marcos', pais: 'El Salvador', ocupacion: 'Ama de casa', tipoSangre: 'A+', activo: true, fechaRegistro: dia(-120) },
  { pacienteId: 10, codigoPaciente: 'PAC-0010', tipoDocumento: 'DUI', numeroDocumento: '06677889-0', nombres: 'Diego', apellidos: 'Alvarenga Castro', fechaNacimiento: '2015-05-02', sexo: 'M', estadoCivil: null, telefono: '7900-3344', telefonoSecundario: null, email: null, direccion: 'Ilopango, Col. Santa Lucía', ciudad: 'Ilopango', pais: 'El Salvador', ocupacion: null, tipoSangre: 'O+', activo: true, fechaRegistro: dia(-90) },
  { pacienteId: 11, codigoPaciente: 'PAC-0011', tipoDocumento: 'DUI', numeroDocumento: '07788990-1', nombres: 'Verónica', apellidos: 'Campos Delgado', fechaNacimiento: '1979-07-21', sexo: 'F', estadoCivil: 'Union libre', telefono: '7566-1199', telefonoSecundario: null, email: 'veronica.campos@email.com', direccion: 'Apopa, Res. Valle Verde', ciudad: 'Apopa', pais: 'El Salvador', ocupacion: 'Enfermera', tipoSangre: 'AB-', activo: true, fechaRegistro: dia(-60) },
  { pacienteId: 12, codigoPaciente: 'PAC-0012', tipoDocumento: 'DUI', numeroDocumento: '08899001-2', nombres: 'Ricardo', apellidos: 'Escobar Turcios', fechaNacimiento: '1969-10-11', sexo: 'M', estadoCivil: 'Casado', telefono: '7322-4455', telefonoSecundario: null, email: 'ricardo.escobar@email.com', direccion: 'San Salvador, Col. Médica', ciudad: 'San Salvador', pais: 'El Salvador', ocupacion: 'Abogado', tipoSangre: 'B+', activo: true, fechaRegistro: dia(-30) },
];

export const contactosEmergencia: ContactoEmergencia[] = [
  { contactoEmergenciaId: 1, pacienteId: 1, nombreCompleto: 'Silvia Ramírez de López', parentesco: 'Cónyuge', telefono: '7600-9988', telefonoSecundario: null, email: 'silvia.r@email.com', prioridad: 1, activo: true },
  { contactoEmergenciaId: 2, pacienteId: 1, nombreCompleto: 'Mario López', parentesco: 'Padre', telefono: '7601-2233', telefonoSecundario: null, email: null, prioridad: 2, activo: true },
  { contactoEmergenciaId: 3, pacienteId: 2, nombreCompleto: 'Rosa Cruz', parentesco: 'Madre', telefono: '7622-1010', telefonoSecundario: null, email: null, prioridad: 1, activo: true },
  { contactoEmergenciaId: 4, pacienteId: 3, nombreCompleto: 'Elena Molina', parentesco: 'Hermano(a)', telefono: '7646-3030', telefonoSecundario: null, email: null, prioridad: 1, activo: true },
  { contactoEmergenciaId: 5, pacienteId: 10, nombreCompleto: 'Karla Castro', parentesco: 'Madre', telefono: '7900-3344', telefonoSecundario: '2255-6677', email: 'karla.castro@email.com', prioridad: 1, activo: true },
];

// ------------------------------------------------------------------ Staff ---
export const especialidades: Especialidad[] = [
  { especialidadId: 1, nombre: 'Medicina General', activo: true },
  { especialidadId: 2, nombre: 'Cardiología', activo: true },
  { especialidadId: 3, nombre: 'Pediatría', activo: true },
  { especialidadId: 4, nombre: 'Ginecología', activo: true },
  { especialidadId: 5, nombre: 'Dermatología', activo: true },
  { especialidadId: 6, nombre: 'Ortopedia', activo: true },
  { especialidadId: 7, nombre: 'Oftalmología', activo: false },
];

export const consultorios: Consultorio[] = [
  { consultorioId: 1, nombre: 'Consultorio 101', ubicacion: 'Piso 1', activo: true },
  { consultorioId: 2, nombre: 'Consultorio 102', ubicacion: 'Piso 1', activo: true },
  { consultorioId: 3, nombre: 'Consultorio 201', ubicacion: 'Piso 2', activo: true },
  { consultorioId: 4, nombre: 'Consultorio 202', ubicacion: 'Piso 2', activo: true },
  { consultorioId: 5, nombre: 'Sala de Procedimientos', ubicacion: 'Piso 3', activo: true },
];

function nombreEspecialidad(id: number): string {
  return especialidades.find((e) => e.especialidadId === id)?.nombre ?? '';
}

export const medicos: Medico[] = [
  { medicoId: 1, nombres: 'Luis Alberto', apellidos: 'Martínez Rivas', licencia: 'JVPM-10233', especialidadId: 1, especialidadNombre: nombreEspecialidad(1), telefono: '7712-0011', email: 'luis.martinez@citasmedicas.sv', activo: true },
  { medicoId: 2, nombres: 'Andrea', apellidos: 'Solís Peña', licencia: 'JVPM-11876', especialidadId: 4, especialidadNombre: nombreEspecialidad(4), telefono: '7712-0022', email: 'andrea.solis@citasmedicas.sv', activo: true },
  { medicoId: 3, nombres: 'Ernesto', apellidos: 'Ayala Mejía', licencia: 'JVPM-12455', especialidadId: 3, especialidadNombre: nombreEspecialidad(3), telefono: '7712-0033', email: 'ernesto.ayala@citasmedicas.sv', activo: true },
  { medicoId: 4, nombres: 'Patricia', apellidos: 'Guzmán Lara', licencia: 'JVPM-13001', especialidadId: 5, especialidadNombre: nombreEspecialidad(5), telefono: '7712-0044', email: 'patricia.guzman@citasmedicas.sv', activo: true },
  { medicoId: 5, nombres: 'Óscar', apellidos: 'Benítez Cruz', licencia: 'JVPM-13544', especialidadId: 6, especialidadNombre: nombreEspecialidad(6), telefono: '7712-0055', email: 'oscar.benitez@citasmedicas.sv', activo: false },
];

export const horarios: HorarioMedico[] = [
  { horarioId: 1, medicoId: 1, diaSemana: 1, horaInicio: '08:00', horaFin: '12:00', consultorioId: 1, activo: true },
  { horarioId: 2, medicoId: 1, diaSemana: 1, horaInicio: '14:00', horaFin: '17:00', consultorioId: 1, activo: true },
  { horarioId: 3, medicoId: 1, diaSemana: 3, horaInicio: '08:00', horaFin: '13:00', consultorioId: 1, activo: true },
  { horarioId: 4, medicoId: 1, diaSemana: 5, horaInicio: '08:00', horaFin: '12:00', consultorioId: 2, activo: true },
  { horarioId: 5, medicoId: 2, diaSemana: 2, horaInicio: '09:00', horaFin: '13:00', consultorioId: 3, activo: true },
  { horarioId: 6, medicoId: 2, diaSemana: 4, horaInicio: '09:00', horaFin: '13:00', consultorioId: 3, activo: true },
  { horarioId: 7, medicoId: 3, diaSemana: 1, horaInicio: '07:30', horaFin: '11:30', consultorioId: 4, activo: true },
  { horarioId: 8, medicoId: 3, diaSemana: 2, horaInicio: '07:30', horaFin: '11:30', consultorioId: 4, activo: true },
  { horarioId: 9, medicoId: 3, diaSemana: 4, horaInicio: '14:00', horaFin: '18:00', consultorioId: 4, activo: true },
  { horarioId: 10, medicoId: 4, diaSemana: 3, horaInicio: '14:00', horaFin: '18:00', consultorioId: 2, activo: true },
  { horarioId: 11, medicoId: 4, diaSemana: 5, horaInicio: '13:00', horaFin: '17:00', consultorioId: 2, activo: true },
];

// ------------------------------------------------------------ Appointment ---
const nombrePaciente = (id: number) => {
  const p = pacientes.find((x) => x.pacienteId === id)!;
  return `${p.nombres} ${p.apellidos}`;
};
const nombreMedico = (id: number) => {
  const m = medicos.find((x) => x.medicoId === id)!;
  return `Dr(a). ${m.nombres} ${m.apellidos}`;
};

interface SeedCita {
  p: number; m: number; c: number; d: string; h: string; est: EstadoCita; motivo: string;
}
/** Estado limitado a las 5 vigentes en la nueva planificación (sin "En espera" ni "No asistió"). */
const seedCitas: SeedCita[] = [
  { p: 6, m: 1, c: 1, d: dia(0), h: '09:00', est: 'Confirmada', motivo: 'Control de presión arterial' },
  { p: 2, m: 2, c: 3, d: dia(0), h: '10:30', est: 'Confirmada', motivo: 'Control ginecológico anual' },
  { p: 7, m: 1, c: 1, d: dia(0), h: '11:00', est: 'Programada', motivo: 'Dolor de garganta y fiebre' },
  { p: 10, m: 3, c: 4, d: dia(0), h: '08:00', est: 'Atendida', motivo: 'Control de crecimiento' },
  { p: 1, m: 1, c: 1, d: dia(0), h: '14:30', est: 'Programada', motivo: 'Seguimiento cardiológico' },
  { p: 12, m: 4, c: 2, d: dia(0), h: '15:00', est: 'Programada', motivo: 'Lesión en la piel' },
  { p: 3, m: 1, c: 1, d: diaSemana(0), h: '08:30', est: 'Atendida', motivo: 'Consulta general' },
  { p: 4, m: 2, c: 3, d: diaSemana(1), h: '09:30', est: 'Atendida', motivo: 'Control prenatal' },
  { p: 8, m: 4, c: 2, d: diaSemana(2), h: '14:00', est: 'Cancelada', motivo: 'Acné persistente' },
  { p: 9, m: 1, c: 1, d: diaSemana(2), h: '09:00', est: 'Atendida', motivo: 'Palpitaciones' },
  { p: 11, m: 2, c: 3, d: diaSemana(3), h: '10:00', est: 'Cancelada', motivo: 'Consulta de rutina' },
  { p: 5, m: 1, c: 2, d: diaSemana(4), h: '10:00', est: 'Programada', motivo: 'Chequeo general' },
  { p: 1, m: 4, c: 2, d: dia(1), h: '14:30', est: 'Programada', motivo: 'Revisión de lunar' },
  { p: 10, m: 3, c: 4, d: dia(1), h: '08:20', est: 'Confirmada', motivo: 'Vacunación' },
  { p: 12, m: 1, c: 1, d: dia(2), h: '09:30', est: 'Programada', motivo: 'Dolor lumbar' },
  { p: 6, m: 2, c: 3, d: dia(3), h: '11:00', est: 'Programada', motivo: 'Consulta de pareja' },
  { p: 7, m: 3, c: 4, d: dia(4), h: '15:00', est: 'Programada', motivo: 'Control de asma' },
];

/** `especialidadNombre` y `pacienteDocumento` se resuelven aquí como lo haría el `Core` de Appointment al componer Patient + Staff. */
export const citas: Cita[] = seedCitas.map((s, i) => ({
  citaId: 100 + i,
  pacienteId: s.p,
  pacienteNombre: nombrePaciente(s.p),
  pacienteDocumento: pacientes.find((p) => p.pacienteId === s.p)!.numeroDocumento,
  medicoId: s.m,
  medicoNombre: nombreMedico(s.m),
  especialidadNombre: medicos.find((m) => m.medicoId === s.m)?.especialidadNombre ?? '',
  consultorioId: s.c,
  consultorioNombre: consultorios.find((c) => c.consultorioId === s.c)!.nombre,
  fecha: s.d,
  hora: s.h,
  motivo: s.motivo,
  estado: s.est,
  observacion: null,
}));

// ------------------------------------------------------------ ClinicalCare -
export const atenciones: Atencion[] = [
  {
    atencionId: 1, citaId: 106, pacienteId: 3, pacienteNombre: nombrePaciente(3), medicoId: 1, medicoNombre: nombreMedico(1),
    fechaAtencion: `${diaSemana(0)}T08:35:00`, motivoConsulta: 'Consulta general',
    diagnostico: 'Diabetes mellitus tipo 2 (E11) — control metabólico irregular.',
    estado: 'Cerrada',
    signosVitales: { signosVitalesId: 1, atencionId: 1, presionArterial: '138/86', frecuenciaCardiaca: 78, temperatura: 36.7, saturacionOxigeno: 97, peso: 84.5, talla: 1.74, fechaRegistro: `${diaSemana(0)}T08:40:00` },
    notas: [{ notaMedicaId: 1, atencionId: 1, nota: 'Se ajusta dosis de metformina y se solicita hemoglobina glicosilada de control en 3 meses.', fecha: `${diaSemana(0)}T08:55:00`, medicoNombre: nombreMedico(1) }],
  },
  {
    atencionId: 2, citaId: 109, pacienteId: 9, pacienteNombre: nombrePaciente(9), medicoId: 1, medicoNombre: nombreMedico(1),
    fechaAtencion: `${diaSemana(2)}T09:10:00`, motivoConsulta: 'Palpitaciones',
    diagnostico: 'Hipertensión esencial (I10).',
    estado: 'Cerrada',
    signosVitales: { signosVitalesId: 2, atencionId: 2, presionArterial: '145/92', frecuenciaCardiaca: 96, temperatura: 36.4, saturacionOxigeno: 98, peso: 68.2, talla: 1.58, fechaRegistro: `${diaSemana(2)}T09:15:00` },
    notas: [{ notaMedicaId: 2, atencionId: 2, nota: 'Se indica electrocardiograma y control de presión domiciliaria por 7 días.', fecha: `${diaSemana(2)}T09:30:00`, medicoNombre: nombreMedico(1) }],
  },
];

export const medicamentos: Medicamento[] = [
  { medicamentoId: 1, nombre: 'Acetaminofén', principioActivo: 'Paracetamol', presentacion: 'Tableta', concentracion: '500 mg', activo: true },
  { medicamentoId: 2, nombre: 'Amoxicilina', principioActivo: 'Amoxicilina', presentacion: 'Cápsula', concentracion: '500 mg', activo: true },
  { medicamentoId: 3, nombre: 'Ibuprofeno', principioActivo: 'Ibuprofeno', presentacion: 'Tableta', concentracion: '400 mg', activo: true },
  { medicamentoId: 4, nombre: 'Losartán', principioActivo: 'Losartán potásico', presentacion: 'Tableta', concentracion: '50 mg', activo: true },
  { medicamentoId: 5, nombre: 'Metformina', principioActivo: 'Metformina clorhidrato', presentacion: 'Tableta', concentracion: '850 mg', activo: true },
  { medicamentoId: 6, nombre: 'Omeprazol', principioActivo: 'Omeprazol', presentacion: 'Cápsula', concentracion: '20 mg', activo: true },
  { medicamentoId: 7, nombre: 'Loratadina', principioActivo: 'Loratadina', presentacion: 'Tableta', concentracion: '10 mg', activo: true },
  { medicamentoId: 8, nombre: 'Salbutamol', principioActivo: 'Salbutamol', presentacion: 'Inhalador', concentracion: '100 mcg/dosis', activo: true },
  { medicamentoId: 9, nombre: 'Ciprofloxacino', principioActivo: 'Ciprofloxacino', presentacion: 'Tableta', concentracion: '500 mg', activo: true },
  { medicamentoId: 10, nombre: 'Diclofenaco', principioActivo: 'Diclofenaco sódico', presentacion: 'Ampolla', concentracion: '75 mg/3 mL', activo: true },
  { medicamentoId: 11, nombre: 'Hidrocortisona', principioActivo: 'Hidrocortisona', presentacion: 'Crema', concentracion: '1%', activo: true },
  { medicamentoId: 12, nombre: 'Sales de rehidratación oral', principioActivo: 'Electrolitos', presentacion: 'Sobre', concentracion: '20.5 g', activo: true },
];

export const prescripciones: Prescripcion[] = [
  {
    prescripcionId: 1, atencionId: 1, pacienteId: 3, pacienteNombre: nombrePaciente(3),
    medicoNombre: nombreMedico(1), fecha: `${diaSemana(0)}T09:00:00`,
    indicacionesGenerales: 'Control en 3 meses con laboratorios.',
    detalles: [
      { prescripcionDetalleId: 1, medicamentoId: 5, medicamentoNombre: 'Metformina', presentacion: 'Tableta 850 mg', dosis: '1 tableta', frecuencia: 'Cada 12 horas', duracion: '90 días', viaAdministracion: 'Oral' },
      { prescripcionDetalleId: 2, medicamentoId: 4, medicamentoNombre: 'Losartán', presentacion: 'Tableta 50 mg', dosis: '1 tableta', frecuencia: 'Cada 24 horas', duracion: '90 días', viaAdministracion: 'Oral' },
    ],
  },
  {
    prescripcionId: 2, atencionId: 2, pacienteId: 9, pacienteNombre: nombrePaciente(9),
    medicoNombre: nombreMedico(1), fecha: `${diaSemana(2)}T09:35:00`,
    indicacionesGenerales: null,
    detalles: [
      { prescripcionDetalleId: 3, medicamentoId: 4, medicamentoNombre: 'Losartán', presentacion: 'Tableta 50 mg', dosis: '1 tableta', frecuencia: 'Cada 24 horas', duracion: '30 días', viaAdministracion: 'Oral' },
    ],
  },
];

/** Secuencias para simular el autoincremental de la base de datos. */
export const seq = {
  paciente: 100, contacto: 100, cita: 200, usuario: 100, medico: 100,
  especialidad: 100, consultorio: 100, horario: 100, atencion: 100, nota: 100,
  medicamento: 100, prescripcion: 100,
};

export const nombreDePaciente = nombrePaciente;
export const nombreDeMedico = nombreMedico;
