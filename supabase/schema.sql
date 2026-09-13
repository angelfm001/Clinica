-- ============================================================================
-- ClinicaPort — UNA SOLA base de datos en Supabase (Postgres)
-- ============================================================================
-- Script completo e idempotente.
--
-- Soluciona:
--   ERROR 428C9:
--   cannot insert a non-DEFAULT value into column "rol_id"
--   Column "rol_id" is an identity column defined as GENERATED ALWAYS.
--
-- Los IDs iniciales del mock se conservan mediante:
--   OVERRIDING SYSTEM VALUE
--
-- Después de los seeds, las secuencias se sincronizan para que los siguientes
-- INSERT automáticos continúen desde el ID correcto.
-- ============================================================================




-- ============================================================================
-- 2. SECURITY
-- ============================================================================

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

  -- PROTOTIPO:
  -- En producción NO almacenar contraseñas en texto plano.
  -- Usar Supabase Auth y guardar solamente el perfil.
  contrasena text not null default 'demo1234',

  rol_id bigint not null references roles(rol_id),

  -- Se enlaza después de crear medicos.
  medico_id bigint null,

  activo boolean not null default true,
  ultimo_acceso timestamptz null,
  fecha_creacion timestamptz not null default now()
);


-- ============================================================================
-- 3. PATIENT
-- ============================================================================

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
  paciente_id bigint not null
    references pacientes(paciente_id)
    on delete cascade,
  nombre_completo text not null,
  parentesco text null,
  telefono text not null,
  telefono_secundario text null,
  email text null,
  prioridad int not null default 1,
  activo boolean not null default true
);


-- ============================================================================
-- 4. STAFF
-- ============================================================================

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
  especialidad_id bigint not null
    references especialidades(especialidad_id),
  telefono text null,
  email text null,
  activo boolean not null default true
);

create table horarios_medicos (
  horario_id bigint generated always as identity primary key,
  medico_id bigint not null
    references medicos(medico_id)
    on delete cascade,
  dia_semana int not null
    check (dia_semana between 1 and 7),
  hora_inicio time not null,
  hora_fin time not null,
  consultorio_id bigint not null
    references consultorios(consultorio_id),
  activo boolean not null default true
);


-- FK usuarios -> medicos
alter table usuarios
  add constraint usuarios_medico_fk
  foreign key (medico_id)
  references medicos(medico_id)
  on delete set null;


-- ============================================================================
-- 5. APPOINTMENT
-- ============================================================================

create table citas (
  cita_id bigint generated always as identity primary key,

  paciente_id bigint not null
    references pacientes(paciente_id),

  medico_id bigint not null
    references medicos(medico_id),

  consultorio_id bigint not null
    references consultorios(consultorio_id),

  fecha date not null,
  hora time not null,

  motivo text null,

  estado text not null default 'Programada'
    check (
      estado in (
        'Programada',
        'Confirmada',
        'En atencion',
        'Atendida',
        'Cancelada'
      )
    ),

  observacion text null,

  created_at timestamptz not null default now()
);


-- Evita doble reserva del médico.
-- Las citas canceladas no bloquean el horario.
create unique index citas_medico_slot_unico
  on citas (medico_id, fecha, hora)
  where estado in (
    'Programada',
    'Confirmada',
    'En atencion',
    'Atendida'
  );


-- ============================================================================
-- 6. CLINICAL CARE
-- ============================================================================

create table atenciones (
  atencion_id bigint generated always as identity primary key,

  cita_id bigint not null unique
    references citas(cita_id),

  paciente_id bigint not null
    references pacientes(paciente_id),

  medico_id bigint not null
    references medicos(medico_id),

  fecha_atencion timestamptz not null default now(),

  motivo_consulta text null,
  diagnostico text null,

  estado text not null default 'Abierta'
    check (estado in ('Abierta', 'Cerrada'))
);

create table signos_vitales (
  signos_vitales_id bigint generated always as identity primary key,

  atencion_id bigint not null unique
    references atenciones(atencion_id)
    on delete cascade,

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

  atencion_id bigint not null
    references atenciones(atencion_id)
    on delete cascade,

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

  atencion_id bigint not null
    references atenciones(atencion_id),

  paciente_id bigint not null
    references pacientes(paciente_id),

  fecha timestamptz not null default now(),

  indicaciones_generales text null
);

create table prescripciones_detalle (
  prescripcion_detalle_id bigint generated always as identity primary key,

  prescripcion_id bigint not null
    references prescripciones(prescripcion_id)
    on delete cascade,

  medicamento_id bigint not null
    references medicamentos(medicamento_id),

  dosis text not null default '',
  frecuencia text not null default '',
  duracion text not null default '',
  via_administracion text not null default 'Oral'
);


-- ============================================================================
-- 7. RLS
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


-- ============================================================================
-- 8. POLÍTICAS PARA PROTOTIPO
-- ============================================================================
-- Permiten SELECT / INSERT / UPDATE / DELETE a anon y authenticated.
--
-- IMPORTANTE:
-- Esto es únicamente para desarrollo/prototipo.
-- En producción deben crearse políticas basadas en Supabase Auth y roles.

create policy "proto_all"
  on roles
  for all
  using (true)
  with check (true);

create policy "proto_all"
  on usuarios
  for all
  using (true)
  with check (true);

create policy "proto_all"
  on pacientes
  for all
  using (true)
  with check (true);

create policy "proto_all"
  on contactos_emergencia
  for all
  using (true)
  with check (true);

create policy "proto_all"
  on especialidades
  for all
  using (true)
  with check (true);

create policy "proto_all"
  on consultorios
  for all
  using (true)
  with check (true);

create policy "proto_all"
  on medicos
  for all
  using (true)
  with check (true);

create policy "proto_all"
  on horarios_medicos
  for all
  using (true)
  with check (true);

create policy "proto_all"
  on citas
  for all
  using (true)
  with check (true);

create policy "proto_all"
  on atenciones
  for all
  using (true)
  with check (true);

create policy "proto_all"
  on signos_vitales
  for all
  using (true)
  with check (true);

create policy "proto_all"
  on notas_medicas
  for all
  using (true)
  with check (true);

create policy "proto_all"
  on medicamentos
  for all
  using (true)
  with check (true);

create policy "proto_all"
  on prescripciones
  for all
  using (true)
  with check (true);

create policy "proto_all"
  on prescripciones_detalle
  for all
  using (true)
  with check (true);


-- ============================================================================
-- 9. SEEDS
-- ============================================================================
-- IMPORTANTE:
-- Las tablas utilizan GENERATED ALWAYS AS IDENTITY.
--
-- Como aquí queremos conservar los IDs del mock original, utilizamos:
--
--   OVERRIDING SYSTEM VALUE
--
-- Esto permite insertar explícitamente los IDs.


-- --------------------------------------------------------------------------
-- ROLES
-- --------------------------------------------------------------------------

insert into roles (rol_id, nombre, activo)
overriding system value
values
  (1, 'Administrador', true),
  (2, 'Medico', true),
  (3, 'Recepcion', true);


-- --------------------------------------------------------------------------
-- ESPECIALIDADES
-- --------------------------------------------------------------------------

insert into especialidades (
  especialidad_id,
  nombre,
  activo
)
overriding system value
values
  (1, 'Medicina General', true),
  (2, 'Cardiología', true),
  (3, 'Pediatría', true),
  (4, 'Ginecología', true),
  (5, 'Dermatología', true),
  (6, 'Ortopedia', true),
  (7, 'Oftalmología', false);


-- --------------------------------------------------------------------------
-- CONSULTORIOS
-- --------------------------------------------------------------------------

insert into consultorios (
  consultorio_id,
  nombre,
  ubicacion,
  activo
)
overriding system value
values
  (1, 'Consultorio 101', 'Piso 1', true),
  (2, 'Consultorio 102', 'Piso 1', true),
  (3, 'Consultorio 201', 'Piso 2', true),
  (4, 'Consultorio 202', 'Piso 2', true),
  (5, 'Sala de Procedimientos', 'Piso 3', true);


-- --------------------------------------------------------------------------
-- MÉDICOS
-- --------------------------------------------------------------------------

insert into medicos (
  medico_id,
  nombres,
  apellidos,
  licencia,
  especialidad_id,
  telefono,
  email,
  activo
)
overriding system value
values
  (
    1,
    'Luis Alberto',
    'Martínez Rivas',
    'JVPM-10233',
    1,
    '7712-0011',
    'luis.martinez@citasmedicas.sv',
    true
  ),
  (
    2,
    'Andrea',
    'Solís Peña',
    'JVPM-11876',
    4,
    '7712-0022',
    'andrea.solis@citasmedicas.sv',
    true
  ),
  (
    3,
    'Ernesto',
    'Ayala Mejía',
    'JVPM-12455',
    3,
    '7712-0033',
    'ernesto.ayala@citasmedicas.sv',
    true
  ),
  (
    4,
    'Patricia',
    'Guzmán Lara',
    'JVPM-13001',
    5,
    '7712-0044',
    'patricia.guzman@citasmedicas.sv',
    true
  ),
  (
    5,
    'Óscar',
    'Benítez Cruz',
    'JVPM-13544',
    6,
    '7712-0055',
    'oscar.benitez@citasmedicas.sv',
    false
  );


-- --------------------------------------------------------------------------
-- USUARIOS
-- --------------------------------------------------------------------------
-- usuario_id NO se proporciona.
-- PostgreSQL lo genera automáticamente.
--
-- Los rol_id y medico_id sí se proporcionan porque son FK normales.

insert into usuarios (
  nombre_usuario,
  nombre_completo,
  email,
  contrasena,
  rol_id,
  medico_id,
  activo
)
values
  (
    'admin',
    'Ángel Fuentes',
    'admin@citasmedicas.sv',
    'demo1234',
    1,
    null,
    true
  ),
  (
    'lmartinez',
    'Dr. Luis Martínez',
    'luis.martinez@citasmedicas.sv',
    'demo1234',
    2,
    1,
    true
  ),
  (
    'asolis',
    'Dra. Andrea Solís',
    'andrea.solis@citasmedicas.sv',
    'demo1234',
    2,
    2,
    true
  ),
  (
    'amartinez',
    'Ana Martínez',
    'ana.martinez@citasmedicas.sv',
    'demo1234',
    3,
    null,
    true
  ),
  (
    'jportillo',
    'José Portillo',
    'jose.portillo@citasmedicas.sv',
    'demo1234',
    3,
    null,
    false
  );


-- --------------------------------------------------------------------------
-- PACIENTES
-- --------------------------------------------------------------------------

insert into pacientes (
  paciente_id,
  codigo_paciente,
  tipo_documento,
  numero_documento,
  nombres,
  apellidos,
  fecha_nacimiento,
  sexo,
  estado_civil,
  telefono,
  email,
  direccion,
  ciudad,
  pais,
  ocupacion,
  tipo_sangre,
  activo
)
overriding system value
values
  (
    1,
    'PAC-0001',
    'DUI',
    '01234567-8',
    'Juan Carlos',
    'López Ramírez',
    '1988-04-15',
    'M',
    'Casado',
    '7600-1234',
    'juan.lopez@email.com',
    'Col. Escalón, Calle 3 #21',
    'San Salvador',
    'El Salvador',
    'Ingeniero',
    'O+',
    true
  ),
  (
    2,
    'PAC-0002',
    'DUI',
    '04567890-1',
    'María José',
    'Fernández Cruz',
    '1992-11-22',
    'F',
    'Soltero',
    '7621-5678',
    'maria.fernandez@email.com',
    'Res. Altavista, Pje. 5 #12',
    'Soyapango',
    'El Salvador',
    'Docente',
    'A+',
    true
  ),
  (
    3,
    'PAC-0003',
    'DUI',
    '01239876-5',
    'Roberto',
    'Sánchez Molina',
    '1975-02-03',
    'M',
    'Divorciado',
    '7645-9876',
    'roberto.sanchez@email.com',
    'Barrio San Miguelito #45',
    'San Salvador',
    'El Salvador',
    'Comerciante',
    'B+',
    true
  ),
  (
    4,
    'PAC-0004',
    'DUI',
    '06543210-9',
    'Laura Beatriz',
    'Hernández Paz',
    '1990-08-09',
    'F',
    'Casado',
    '7611-2345',
    'laura.hernandez@email.com',
    'Col. Miramonte #8',
    'San Salvador',
    'El Salvador',
    'Contadora',
    'O-',
    true
  ),
  (
    6,
    'PAC-0006',
    'DUI',
    '02233445-6',
    'Carlos Alberto',
    'Gómez Aguilar',
    '1983-06-30',
    'M',
    'Casado',
    '7788-9900',
    'carlos.gomez@email.com',
    'Santa Tecla, Col. Utila',
    'Santa Tecla',
    'El Salvador',
    'Arquitecto',
    'A-',
    true
  ),
  (
    7,
    'PAC-0007',
    'DUI',
    '03344556-7',
    'José Antonio',
    'Ramírez Flores',
    '1997-12-05',
    'M',
    'Soltero',
    '7099-1122',
    'jose.ramirez@email.com',
    'Mejicanos, Col. Zacamil',
    'Mejicanos',
    'El Salvador',
    'Estudiante',
    'O+',
    true
  ),
  (
    9,
    'PAC-0009',
    'DUI',
    '05566778-9',
    'Marta Elena',
    'Portillo Vega',
    '1958-09-14',
    'F',
    'Casado',
    '7233-8899',
    'marta.portillo@email.com',
    'San Marcos, Calle Principal',
    'San Marcos',
    'El Salvador',
    'Ama de casa',
    'A+',
    true
  ),
  (
    10,
    'PAC-0010',
    'DUI',
    '06677889-0',
    'Diego',
    'Alvarenga Castro',
    '2015-05-02',
    'M',
    null,
    '7900-3344',
    null,
    'Ilopango, Col. Santa Lucía',
    'Ilopango',
    'El Salvador',
    null,
    'O+',
    true
  );


-- --------------------------------------------------------------------------
-- CONTACTOS DE EMERGENCIA
-- --------------------------------------------------------------------------

insert into contactos_emergencia (
  paciente_id,
  nombre_completo,
  parentesco,
  telefono,
  prioridad,
  activo
)
values
  (
    1,
    'Silvia Ramírez de López',
    'Cónyuge',
    '7600-9988',
    1,
    true
  ),
  (
    2,
    'Rosa Cruz',
    'Madre',
    '7622-1010',
    1,
    true
  ),
  (
    10,
    'Karla Castro',
    'Madre',
    '7900-3344',
    1,
    true
  );


-- --------------------------------------------------------------------------
-- HORARIOS MÉDICOS
-- --------------------------------------------------------------------------

insert into horarios_medicos (
  medico_id,
  dia_semana,
  hora_inicio,
  hora_fin,
  consultorio_id,
  activo
)
values
  (1, 1, '08:00', '12:00', 1, true),
  (1, 3, '08:00', '13:00', 1, true),
  (1, 5, '08:00', '12:00', 2, true),
  (2, 2, '09:00', '13:00', 3, true),
  (2, 4, '09:00', '13:00', 3, true),
  (3, 1, '07:30', '11:30', 4, true),
  (3, 2, '07:30', '11:30', 4, true),
  (4, 3, '14:00', '18:00', 2, true);


-- --------------------------------------------------------------------------
-- MEDICAMENTOS
-- --------------------------------------------------------------------------

insert into medicamentos (
  nombre,
  principio_activo,
  presentacion,
  concentracion,
  activo
)
values
  (
    'Acetaminofén',
    'Paracetamol',
    'Tableta',
    '500 mg',
    true
  ),
  (
    'Amoxicilina',
    'Amoxicilina',
    'Cápsula',
    '500 mg',
    true
  ),
  (
    'Ibuprofeno',
    'Ibuprofeno',
    'Tableta',
    '400 mg',
    true
  ),
  (
    'Losartán',
    'Losartán potásico',
    'Tableta',
    '50 mg',
    true
  ),
  (
    'Metformina',
    'Metformina clorhidrato',
    'Tableta',
    '850 mg',
    true
  ),
  (
    'Omeprazol',
    'Omeprazol',
    'Cápsula',
    '20 mg',
    true
  ),
  (
    'Loratadina',
    'Loratadina',
    'Tableta',
    '10 mg',
    true
  ),
  (
    'Salbutamol',
    'Salbutamol',
    'Inhalador',
    '100 mcg/dosis',
    true
  );


-- ============================================================================
-- 10. SINCRONIZACIÓN DE SECUENCIAS
-- ============================================================================
--
-- Como algunos IDs fueron insertados manualmente mediante
-- OVERRIDING SYSTEM VALUE, sincronizamos las secuencias.
--
-- El tercer parámetro TRUE indica que el valor proporcionado ya fue utilizado,
-- por lo que el siguiente INSERT automático utilizará MAX(id) + 1.
-- ============================================================================

select setval(
  pg_get_serial_sequence('public.roles', 'rol_id'),
  coalesce((select max(rol_id) from public.roles), 1),
  true
);

select setval(
  pg_get_serial_sequence('public.especialidades', 'especialidad_id'),
  coalesce((select max(especialidad_id) from public.especialidades), 1),
  true
);

select setval(
  pg_get_serial_sequence('public.consultorios', 'consultorio_id'),
  coalesce((select max(consultorio_id) from public.consultorios), 1),
  true
);

select setval(
  pg_get_serial_sequence('public.medicos', 'medico_id'),
  coalesce((select max(medico_id) from public.medicos), 1),
  true
);

select setval(
  pg_get_serial_sequence('public.usuarios', 'usuario_id'),
  coalesce((select max(usuario_id) from public.usuarios), 1),
  true
);

select setval(
  pg_get_serial_sequence('public.pacientes', 'paciente_id'),
  coalesce((select max(paciente_id) from public.pacientes), 1),
  true
);

select setval(
  pg_get_serial_sequence('public.contactos_emergencia', 'contacto_emergencia_id'),
  coalesce((select max(contacto_emergencia_id) from public.contactos_emergencia), 1),
  true
);

select setval(
  pg_get_serial_sequence('public.horarios_medicos', 'horario_id'),
  coalesce((select max(horario_id) from public.horarios_medicos), 1),
  true
);

select setval(
  pg_get_serial_sequence('public.citas', 'cita_id'),
  coalesce((select max(cita_id) from public.citas), 1),
  true
);

select setval(
  pg_get_serial_sequence('public.atenciones', 'atencion_id'),
  coalesce((select max(atencion_id) from public.atenciones), 1),
  true
);

select setval(
  pg_get_serial_sequence('public.signos_vitales', 'signos_vitales_id'),
  coalesce((select max(signos_vitales_id) from public.signos_vitales), 1),
  true
);

select setval(
  pg_get_serial_sequence('public.notas_medicas', 'nota_medica_id'),
  coalesce((select max(nota_medica_id) from public.notas_medicas), 1),
  true
);

select setval(
  pg_get_serial_sequence('public.medicamentos', 'medicamento_id'),
  coalesce((select max(medicamento_id) from public.medicamentos), 1),
  true
);

select setval(
  pg_get_serial_sequence('public.prescripciones', 'prescripcion_id'),
  coalesce((select max(prescripcion_id) from public.prescripciones), 1),
  true
);

select setval(
  pg_get_serial_sequence('public.prescripciones_detalle', 'prescripcion_detalle_id'),
  coalesce((select max(prescripcion_detalle_id) from public.prescripciones_detalle), 1),
  true
);


-- ============================================================================
-- 11. VERIFICACIÓN
-- ============================================================================

select
  'roles' as tabla,
  count(*) as registros
from roles

union all

select
  'usuarios',
  count(*)
from usuarios

union all

select
  'pacientes',
  count(*)
from pacientes

union all

select
  'contactos_emergencia',
  count(*)
from contactos_emergencia

union all

select
  'especialidades',
  count(*)
from especialidades

union all

select
  'consultorios',
  count(*)
from consultorios

union all

select
  'medicos',
  count(*)
from medicos

union all

select
  'horarios_medicos',
  count(*)
from horarios_medicos

union all

select
  'medicamentos',
  count(*)
from medicamentos;


