-- ============================================================================
-- ClinicaPort — UNA SOLA base de datos en Supabase (Postgres)
-- ============================================================================
-- Cómo usar:
--   1. Crea un proyecto en https://supabase.com
--   2. Abre SQL Editor > New query, pega TODO este archivo y ejecútalo.
--   3. Copia Settings > API > Project URL y anon public key a
--      src/environments/environment.ts (y environment.prod.ts).
--
-- Reemplaza los 5 microservicios (Security, Patient, Staff, Appointment,
-- ClinicalCare) y el mock en memoria. Todas las tablas viven en el esquema
-- `public` de ESTE único proyecto.
-- ============================================================================

-- Limpieza idempotente (permite re-ejecutar el script)
drop table if exists prescripciones_detalle cascade;
drop table if exists prescripciones cascade;
drop table if exists notas_medicas cascade;
drop table if exists signos_vitales cascade;
drop table if exists atenciones cascade;
drop table if exists citas cascade;
drop table if exists horarios_medicos cascade;
drop table if exists medicos cascade;
drop table if exists consultorios cascade;
drop table if exists especialidades cascade;
drop table if exists contactos_emergencia cascade;
drop table if exists pacientes cascade;
drop table if exists usuarios cascade;
drop table if exists roles cascade;
drop table if exists medicamentos cascade;

-- ---------------------------------------------------------------- Security
create table roles (
  rol_id bigint generated always as identity primary key,
  nombre text not null unique,
  activo boolean not null default true
);

create table usuarios (
  usuario_id bigint generated always as identity primary key,
  nombre_usuario text not null unique,
  nombre_completo text not null,
  email text not null,
  -- Prototipo: contraseña en claro para paridad con el mock anterior.
  -- En producción usa Supabase Auth (auth.users) y guarda aquí solo el perfil.
  contrasena text not null default 'demo1234',
  rol_id bigint not null references roles(rol_id),
  medico_id bigint null, -- se enlaza tras crear medicos (fk diferida abajo)
  activo boolean not null default true,
  ultimo_acceso timestamptz null,
  fecha_creacion timestamptz not null default now()
);

-- ---------------------------------------------------------------- Patient
create table pacientes (
  paciente_id bigint generated always as identity primary key,
  codigo_paciente text not null unique,
  tipo_documento text not null default 'DUI',
  numero_documento text not null unique,
  nombres text not null,
  apellidos text not null,
  fecha_nacimiento date not null,
  sexo text not null default 'M',
  estado_civil text null,
  telefono text null,
  telefono_secundario text null,
  email text null,
  direccion text null,
  ciudad text null,
  pais text null default 'El Salvador',
  ocupacion text null,
  tipo_sangre text null,
  activo boolean not null default true,
  fecha_registro timestamptz not null default now()
);

create table contactos_emergencia (
  contacto_emergencia_id bigint generated always as identity primary key,
  paciente_id bigint not null references pacientes(paciente_id) on delete cascade,
  nombre_completo text not null,
  parentesco text null,
  telefono text not null,
  telefono_secundario text null,
  email text null,
  prioridad int not null default 1,
  activo boolean not null default true
);

-- ---------------------------------------------------------------- Staff
create table especialidades (
  especialidad_id bigint generated always as identity primary key,
  nombre text not null unique,
  activo boolean not null default true
);

create table consultorios (
  consultorio_id bigint generated always as identity primary key,
  nombre text not null unique,
  ubicacion text null,
  activo boolean not null default true
);

create table medicos (
  medico_id bigint generated always as identity primary key,
  nombres text not null,
  apellidos text not null,
  licencia text not null unique,
  especialidad_id bigint not null references especialidades(especialidad_id),
  telefono text null,
  email text null,
  activo boolean not null default true
);

create table horarios_medicos (
  horario_id bigint generated always as identity primary key,
  medico_id bigint not null references medicos(medico_id) on delete cascade,
  dia_semana int not null check (dia_semana between 1 and 7),
  hora_inicio time not null,
  hora_fin time not null,
  consultorio_id bigint not null references consultorios(consultorio_id),
  activo boolean not null default true
);

-- FK diferida usuarios -> medicos (ambas tablas ya existen)
alter table usuarios add constraint usuarios_medico_fk
  foreign key (medico_id) references medicos(medico_id) on delete set null;

-- ------------------------------------------------------------- Appointment
create table citas (
  cita_id bigint generated always as identity primary key,
  paciente_id bigint not null references pacientes(paciente_id),
  medico_id bigint not null references medicos(medico_id),
  consultorio_id bigint not null references consultorios(consultorio_id),
  fecha date not null,
  hora time not null,
  motivo text null,
  estado text not null default 'Programada'
    check (estado in ('Programada','Confirmada','En atencion','Atendida','Cancelada')),
  observacion text null,
  created_at timestamptz not null default now()
);
-- Evita doble reserva del médico (mismo día + hora mientras no esté cancelada).
-- Las canceladas se excluyen con índice parcial.
create unique index citas_medico_slot_unico
  on citas (medico_id, fecha, hora)
  where estado in ('Programada','Confirmada','En atencion','Atendida');

-- ------------------------------------------------------------ ClinicalCare
create table atenciones (
  atencion_id bigint generated always as identity primary key,
  cita_id bigint not null unique references citas(cita_id),
  paciente_id bigint not null references pacientes(paciente_id),
  medico_id bigint not null references medicos(medico_id),
  fecha_atencion timestamptz not null default now(),
  motivo_consulta text null,
  diagnostico text null,
  estado text not null default 'Abierta' check (estado in ('Abierta','Cerrada'))
);

create table signos_vitales (
  signos_vitales_id bigint generated always as identity primary key,
  atencion_id bigint not null unique references atenciones(atencion_id) on delete cascade,
  presion_arterial text null,
  frecuencia_cardiaca numeric null,
  temperatura numeric null,
  saturacion_oxigeno numeric null,
  peso numeric null,
  talla numeric null,
  fecha_registro timestamptz not null default now()
);

create table notas_medicas (
  nota_medica_id bigint generated always as identity primary key,
  atencion_id bigint not null references atenciones(atencion_id) on delete cascade,
  nota text not null,
  fecha timestamptz not null default now(),
  medico_nombre text not null default ''
);

create table medicamentos (
  medicamento_id bigint generated always as identity primary key,
  nombre text not null,
  principio_activo text not null default '',
  presentacion text not null default '',
  concentracion text not null default '',
  activo boolean not null default true
);

create table prescripciones (
  prescripcion_id bigint generated always as identity primary key,
  atencion_id bigint not null references atenciones(atencion_id),
  paciente_id bigint not null references pacientes(paciente_id),
  fecha timestamptz not null default now(),
  indicaciones_generales text null
);

create table prescripciones_detalle (
  prescripcion_detalle_id bigint generated always as identity primary key,
  prescripcion_id bigint not null references prescripciones(prescripcion_id) on delete cascade,
  medicamento_id bigint not null references medicamentos(medicamento_id),
  dosis text not null default '',
  frecuencia text not null default '',
  duracion text not null default '',
  via_administracion text not null default 'Oral'
);

-- ============================================================================
-- RLS: políticas abiertas para el prototipo (anon key puede operar).
-- En producción, activa RLS + Supabase Auth y restringe por rol.
-- ============================================================================
alter table roles enable row level security;
alter table usuarios enable row level security;
alter table pacientes enable row level security;
alter table contactos_emergencia enable row level security;
alter table especialidades enable row level security;
alter table consultorios enable row level security;
alter table medicos enable row level security;
alter table horarios_medicos enable row level security;
alter table citas enable row level security;
alter table atenciones enable row level security;
alter table signos_vitales enable row level security;
alter table notas_medicas enable row level security;
alter table medicamentos enable row level security;
alter table prescripciones enable row level security;
alter table prescripciones_detalle enable row level security;

-- Permite todo a anon/authenticated (prototipo). Ajusta según tu modelo.
create policy "proto_all" on roles for all using (true) with check (true);
create policy "proto_all" on usuarios for all using (true) with check (true);
create policy "proto_all" on pacientes for all using (true) with check (true);
create policy "proto_all" on contactos_emergencia for all using (true) with check (true);
create policy "proto_all" on especialidades for all using (true) with check (true);
create policy "proto_all" on consultorios for all using (true) with check (true);
create policy "proto_all" on medicos for all using (true) with check (true);
create policy "proto_all" on horarios_medicos for all using (true) with check (true);
create policy "proto_all" on citas for all using (true) with check (true);
create policy "proto_all" on atenciones for all using (true) with check (true);
create policy "proto_all" on signos_vitales for all using (true) with check (true);
create policy "proto_all" on notas_medicas for all using (true) with check (true);
create policy "proto_all" on medicamentos for all using (true) with check (true);
create policy "proto_all" on prescripciones for all using (true) with check (true);
create policy "proto_all" on prescripciones_detalle for all using (true) with check (true);

-- ============================================================================
-- SEEDS (paridad con el mock anterior para que la UI se vea igual)
-- ============================================================================
insert into roles (rol_id, nombre, activo) values
  (1, 'Administrador', true), (2, 'Medico', true), (3, 'Recepcion', true);

insert into especialidades (especialidad_id, nombre, activo) values
  (1, 'Medicina General', true), (2, 'Cardiología', true), (3, 'Pediatría', true),
  (4, 'Ginecología', true), (5, 'Dermatología', true), (6, 'Ortopedia', true),
  (7, 'Oftalmología', false);

insert into consultorios (consultorio_id, nombre, ubicacion, activo) values
  (1, 'Consultorio 101', 'Piso 1', true), (2, 'Consultorio 102', 'Piso 1', true),
  (3, 'Consultorio 201', 'Piso 2', true), (4, 'Consultorio 202', 'Piso 2', true),
  (5, 'Sala de Procedimientos', 'Piso 3', true);

insert into medicos (medico_id, nombres, apellidos, licencia, especialidad_id, telefono, email, activo) values
  (1, 'Luis Alberto', 'Martínez Rivas', 'JVPM-10233', 1, '7712-0011', 'luis.martinez@citasmedicas.sv', true),
  (2, 'Andrea', 'Solís Peña', 'JVPM-11876', 4, '7712-0022', 'andrea.solis@citasmedicas.sv', true),
  (3, 'Ernesto', 'Ayala Mejía', 'JVPM-12455', 3, '7712-0033', 'ernesto.ayala@citasmedicas.sv', true),
  (4, 'Patricia', 'Guzmán Lara', 'JVPM-13001', 5, '7712-0044', 'patricia.guzman@citasmedicas.sv', true),
  (5, 'Óscar', 'Benítez Cruz', 'JVPM-13544', 6, '7712-0055', 'oscar.benitez@citasmedicas.sv', false);

insert into usuarios (nombre_usuario, nombre_completo, email, contrasena, rol_id, medico_id, activo) values
  ('admin', 'Ángel Fuentes', 'admin@citasmedicas.sv', 'demo1234', 1, null, true),
  ('lmartinez', 'Dr. Luis Martínez', 'luis.martinez@citasmedicas.sv', 'demo1234', 2, 1, true),
  ('asolis', 'Dra. Andrea Solís', 'andrea.solis@citasmedicas.sv', 'demo1234', 2, 2, true),
  ('amartinez', 'Ana Martínez', 'ana.martinez@citasmedicas.sv', 'demo1234', 3, null, true),
  ('jportillo', 'José Portillo', 'jose.portillo@citasmedicas.sv', 'demo1234', 3, null, false);

insert into pacientes
  (paciente_id, codigo_paciente, tipo_documento, numero_documento, nombres, apellidos, fecha_nacimiento, sexo, estado_civil, telefono, email, direccion, ciudad, pais, ocupacion, tipo_sangre, activo)
values
  (1, 'PAC-0001', 'DUI', '01234567-8', 'Juan Carlos', 'López Ramírez', '1988-04-15', 'M', 'Casado', '7600-1234', 'juan.lopez@email.com', 'Col. Escalón, Calle 3 #21', 'San Salvador', 'El Salvador', 'Ingeniero', 'O+', true),
  (2, 'PAC-0002', 'DUI', '04567890-1', 'María José', 'Fernández Cruz', '1992-11-22', 'F', 'Soltero', '7621-5678', 'maria.fernandez@email.com', 'Res. Altavista, Pje. 5 #12', 'Soyapango', 'El Salvador', 'Docente', 'A+', true),
  (3, 'PAC-0003', 'DUI', '01239876-5', 'Roberto', 'Sánchez Molina', '1975-02-03', 'M', 'Divorciado', '7645-9876', 'roberto.sanchez@email.com', 'Barrio San Miguelito #45', 'San Salvador', 'El Salvador', 'Comerciante', 'B+', true),
  (4, 'PAC-0004', 'DUI', '06543210-9', 'Laura Beatriz', 'Hernández Paz', '1990-08-09', 'F', 'Casado', '7611-2345', 'laura.hernandez@email.com', 'Col. Miramonte #8', 'San Salvador', 'El Salvador', 'Contadora', 'O-', true),
  (6, 'PAC-0006', 'DUI', '02233445-6', 'Carlos Alberto', 'Gómez Aguilar', '1983-06-30', 'M', 'Casado', '7788-9900', 'carlos.gomez@email.com', 'Santa Tecla, Col. Utila', 'Santa Tecla', 'El Salvador', 'Arquitecto', 'A-', true),
  (7, 'PAC-0007', 'DUI', '03344556-7', 'José Antonio', 'Ramírez Flores', '1997-12-05', 'M', 'Soltero', '7099-1122', 'jose.ramirez@email.com', 'Mejicanos, Col. Zacamil', 'Mejicanos', 'El Salvador', 'Estudiante', 'O+', true),
  (9, 'PAC-0009', 'DUI', '05566778-9', 'Marta Elena', 'Portillo Vega', '1958-09-14', 'F', 'Casado', '7233-8899', 'marta.portillo@email.com', 'San Marcos, Calle Principal', 'San Marcos', 'El Salvador', 'Ama de casa', 'A+', true),
  (10, 'PAC-0010', 'DUI', '06677889-0', 'Diego', 'Alvarenga Castro', '2015-05-02', 'M', null, '7900-3344', null, 'Ilopango, Col. Santa Lucía', 'Ilopango', 'El Salvador', null, 'O+', true);

insert into contactos_emergencia (paciente_id, nombre_completo, parentesco, telefono, prioridad, activo) values
  (1, 'Silvia Ramírez de López', 'Cónyuge', '7600-9988', 1, true),
  (2, 'Rosa Cruz', 'Madre', '7622-1010', 1, true),
  (10, 'Karla Castro', 'Madre', '7900-3344', 1, true);

insert into horarios_medicos (medico_id, dia_semana, hora_inicio, hora_fin, consultorio_id, activo) values
  (1, 1, '08:00', '12:00', 1, true), (1, 3, '08:00', '13:00', 1, true),
  (1, 5, '08:00', '12:00', 2, true), (2, 2, '09:00', '13:00', 3, true),
  (2, 4, '09:00', '13:00', 3, true), (3, 1, '07:30', '11:30', 4, true),
  (3, 2, '07:30', '11:30', 4, true), (4, 3, '14:00', '18:00', 2, true);

insert into medicamentos (nombre, principio_activo, presentacion, concentracion, activo) values
  ('Acetaminofén', 'Paracetamol', 'Tableta', '500 mg', true),
  ('Amoxicilina', 'Amoxicilina', 'Cápsula', '500 mg', true),
  ('Ibuprofeno', 'Ibuprofeno', 'Tableta', '400 mg', true),
  ('Losartán', 'Losartán potásico', 'Tableta', '50 mg', true),
  ('Metformina', 'Metformina clorhidrato', 'Tableta', '850 mg', true),
  ('Omeprazol', 'Omeprazol', 'Cápsula', '20 mg', true),
  ('Loratadina', 'Loratadina', 'Tableta', '10 mg', true),
  ('Salbutamol', 'Salbutamol', 'Inhalador', '100 mcg/dosis', true);

-- Reinicia secuencias de identity al máximo insertado
select setval(pg_get_serial_sequence('roles','rol_id'), coalesce(max(rol_id),1)) from roles;
select setval(pg_get_serial_sequence('especialidades','especialidad_id'), coalesce(max(especialidad_id),1)) from especialidades;
select setval(pg_get_serial_sequence('consultorios','consultorio_id'), coalesce(max(consultorio_id),1)) from consultorios;
select setval(pg_get_serial_sequence('medicos','medico_id'), coalesce(max(medico_id),1)) from medicos;
select setval(pg_get_serial_sequence('usuarios','usuario_id'), coalesce(max(usuario_id),1)) from usuarios;
select setval(pg_get_serial_sequence('pacientes','paciente_id'), coalesce(max(paciente_id),1)) from pacientes;
