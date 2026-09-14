-- ============================================================================
-- Clinica — SEED de datos de prueba (mock-db.ts) para Supabase / Postgres
-- ============================================================================
-- Fuente de verdad del frontend:
--   src/app/core/mock/mock-db.ts
--
-- Qué hace:
--   1. LIMPIA todas las tablas (TRUNCATE ... CASCADE) para que la DB quede
--      idéntica al mock, sin duplicados por UNIQUE ni choques de PK.
--   2. REINSERTA los datos del mock conservando sus IDs originales mediante
--      OVERRIDING SYSTEM VALUE (las PK son GENERATED ALWAYS AS IDENTITY).
--   3. RESINCRONIZA las secuencias (setval) para que los próximos INSERT
--      automáticos sigan desde MAX(id) + 1.
--   4. Las fechas relativas del mock (dia(0), diaSemana(n), hace(min)) se
--      recalculan en SQL con CURRENT_DATE / now() y el lunes de la semana
--      actual: date_trunc('week', now())::date  (= lunes).
--      Así la agenda siempre queda "alrededor de hoy", igual que el mock.
--
-- Uso (Supabase SQL Editor o psql):
--   1. Asegúrate de que existe el schema del archivo supabase/schema.sql
--      (tablas + RLS + políticas).
--   2. Ejecuta ESTE archivo completo. Es re-ejecutable: siempre deja la DB
--      en el mismo estado.
--
-- Tablas afectadas (15):
--   roles, usuarios, pacientes, contactos_emergencia, especialidades,
--   consultorios, medicos, horarios_medicos, citas, atenciones,
--   signos_vitales, notas_medicas, medicamentos, prescripciones,
--   prescripciones_detalle
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. LIMPIEZA — deja la DB idéntica al mock
-- ============================================================================
-- RESTART IDENTITY resetea las secuencias; CASCADE resuelve el orden de FK.
-- (usuarios -> medicos, citas -> pacientes/medicos/consultorios, etc.)

TRUNCATE TABLE
  prescripciones_detalle,
  prescripciones,
  medicamentos,
  notas_medicas,
  signos_vitales,
  atenciones,
  citas,
  horarios_medicos,
  medicos,
  consultorios,
  especialidades,
  contactos_emergencia,
  pacientes,
  usuarios,
  roles
RESTART IDENTITY CASCADE;


-- ============================================================================
-- 1. ROLES — mock: roles[1..3]
-- ============================================================================

INSERT INTO roles (rol_id, nombre, activo)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Administrador', TRUE),
  (2, 'Medico', TRUE),
  (3, 'Recepcion', TRUE);


-- ============================================================================
-- 2. ESPECIALIDADES — mock: especialidades[1..7]
-- ============================================================================

INSERT INTO especialidades (especialidad_id, nombre, activo)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Medicina General', TRUE),
  (2, 'Cardiología', TRUE),
  (3, 'Pediatría', TRUE),
  (4, 'Ginecología', TRUE),
  (5, 'Dermatología', TRUE),
  (6, 'Ortopedia', TRUE),
  (7, 'Oftalmología', FALSE);


-- ============================================================================
-- 3. CONSULTORIOS — mock: consultorios[1..5]
-- ============================================================================

INSERT INTO consultorios (consultorio_id, nombre, ubicacion, activo)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Consultorio 101', 'Piso 1', TRUE),
  (2, 'Consultorio 102', 'Piso 1', TRUE),
  (3, 'Consultorio 201', 'Piso 2', TRUE),
  (4, 'Consultorio 202', 'Piso 2', TRUE),
  (5, 'Sala de Procedimientos', 'Piso 3', TRUE);


-- ============================================================================
-- 4. MÉDICOS — mock: medicos[1..5]
-- ============================================================================

INSERT INTO medicos (
  medico_id, nombres, apellidos, licencia,
  especialidad_id, telefono, email, activo
)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Luis Alberto', 'Martínez Rivas', 'JVPM-10233', 1, '7712-0011', 'luis.martinez@citasmedicas.sv', TRUE),
  (2, 'Andrea', 'Solís Peña', 'JVPM-11876', 4, '7712-0022', 'andrea.solis@citasmedicas.sv', TRUE),
  (3, 'Ernesto', 'Ayala Mejía', 'JVPM-12455', 3, '7712-0033', 'ernesto.ayala@citasmedicas.sv', TRUE),
  (4, 'Patricia', 'Guzmán Lara', 'JVPM-13001', 5, '7712-0044', 'patricia.guzman@citasmedicas.sv', TRUE),
  (5, 'Óscar', 'Benítez Cruz', 'JVPM-13544', 6, '7712-0055', 'oscar.benitez@citasmedicas.sv', FALSE);


-- ============================================================================
-- 5. USUARIOS — mock: usuarios[1..5]
--    mock: ultimoAcceso = hace(min) | dia(-40); fechaCreacion = dia(-N)
-- ============================================================================

INSERT INTO usuarios (
  usuario_id, nombre_usuario, nombre_completo, email, contrasena,
  rol_id, medico_id, activo, ultimo_acceso, fecha_creacion
)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'admin', 'Ángel Fuentes', 'admin@citasmedicas.sv', 'demo1234',
    1, NULL, TRUE, (now() - INTERVAL '12 minutes'), (CURRENT_DATE - 320)::timestamptz),
  (2, 'lmartinez', 'Dr. Luis Martínez', 'luis.martinez@citasmedicas.sv', 'demo1234',
    2, 1, TRUE, (now() - INTERVAL '48 minutes'), (CURRENT_DATE - 280)::timestamptz),
  (3, 'asolis', 'Dra. Andrea Solís', 'andrea.solis@citasmedicas.sv', 'demo1234',
    2, 2, TRUE, (now() - INTERVAL '190 minutes'), (CURRENT_DATE - 265)::timestamptz),
  (4, 'amartinez', 'Ana Martínez', 'ana.martinez@citasmedicas.sv', 'demo1234',
    3, NULL, TRUE, (now() - INTERVAL '3 minutes'), (CURRENT_DATE - 200)::timestamptz),
  (5, 'jportillo', 'José Portillo', 'jose.portillo@citasmedicas.sv', 'demo1234',
    3, NULL, FALSE, (CURRENT_DATE - 40)::timestamptz, (CURRENT_DATE - 120)::timestamptz);


-- ============================================================================
-- 6. PACIENTES — mock: pacientes[1..12] (COMPLETO, schema.sql solo traía 8)
--    mock: fechaRegistro = dia(-N)
-- ============================================================================

INSERT INTO pacientes (
  paciente_id, codigo_paciente, tipo_documento, numero_documento,
  nombres, apellidos, fecha_nacimiento, sexo, estado_civil,
  telefono, telefono_secundario, email, direccion, ciudad, pais,
  ocupacion, tipo_sangre, activo, fecha_registro
)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'PAC-0001', 'DUI', '01234567-8', 'Juan Carlos', 'López Ramírez', '1988-04-15', 'M', 'Casado',
    '7600-1234', '2260-1100', 'juan.lopez@email.com', 'Col. Escalón, Calle 3 #21', 'San Salvador', 'El Salvador',
    'Ingeniero', 'O+', TRUE, (CURRENT_DATE - 410)::timestamptz),
  (2, 'PAC-0002', 'DUI', '04567890-1', 'María José', 'Fernández Cruz', '1992-11-22', 'F', 'Soltero',
    '7621-5678', NULL, 'maria.fernandez@email.com', 'Res. Altavista, Pje. 5 #12', 'Soyapango', 'El Salvador',
    'Docente', 'A+', TRUE, (CURRENT_DATE - 360)::timestamptz),
  (3, 'PAC-0003', 'DUI', '01239876-5', 'Roberto', 'Sánchez Molina', '1975-02-03', 'M', 'Divorciado',
    '7645-9876', NULL, 'roberto.sanchez@email.com', 'Barrio San Miguelito #45', 'San Salvador', 'El Salvador',
    'Comerciante', 'B+', TRUE, (CURRENT_DATE - 300)::timestamptz),
  (4, 'PAC-0004', 'DUI', '06543210-9', 'Laura Beatriz', 'Hernández Paz', '1990-08-09', 'F', 'Casado',
    '7611-2345', NULL, 'laura.hernandez@email.com', 'Col. Miramonte #8', 'San Salvador', 'El Salvador',
    'Contadora', 'O-', TRUE, (CURRENT_DATE - 280)::timestamptz),
  (5, 'PAC-0005', 'DUI', '07894561-2', 'Ana Gabriela', 'Ruiz Medina', '1965-01-27', 'F', 'Viudo',
    '7633-4455', NULL, 'ana.ruiz@email.com', 'Col. Layco, Av. España', 'San Salvador', 'El Salvador',
    'Jubilada', 'AB+', FALSE, (CURRENT_DATE - 250)::timestamptz),
  (6, 'PAC-0006', 'DUI', '02233445-6', 'Carlos Alberto', 'Gómez Aguilar', '1983-06-30', 'M', 'Casado',
    '7788-9900', NULL, 'carlos.gomez@email.com', 'Santa Tecla, Col. Utila', 'Santa Tecla', 'El Salvador',
    'Arquitecto', 'A-', TRUE, (CURRENT_DATE - 210)::timestamptz),
  (7, 'PAC-0007', 'DUI', '03344556-7', 'José Antonio', 'Ramírez Flores', '1997-12-05', 'M', 'Soltero',
    '7099-1122', NULL, 'jose.ramirez@email.com', 'Mejicanos, Col. Zacamil', 'Mejicanos', 'El Salvador',
    'Estudiante', 'O+', TRUE, (CURRENT_DATE - 180)::timestamptz),
  (8, 'PAC-0008', 'Pasaporte', 'B0912345', 'Sofía', 'Navarro Iglesias', '2001-03-18', 'F', 'Soltero',
    '7455-6677', NULL, 'sofia.navarro@email.com', 'Antiguo Cuscatlán', 'Antiguo Cuscatlán', 'España',
    'Diseñadora', 'B-', TRUE, (CURRENT_DATE - 150)::timestamptz),
  (9, 'PAC-0009', 'DUI', '05566778-9', 'Marta Elena', 'Portillo Vega', '1958-09-14', 'F', 'Casado',
    '7233-8899', NULL, 'marta.portillo@email.com', 'San Marcos, Calle Principal', 'San Marcos', 'El Salvador',
    'Ama de casa', 'A+', TRUE, (CURRENT_DATE - 120)::timestamptz),
  (10, 'PAC-0010', 'DUI', '06677889-0', 'Diego', 'Alvarenga Castro', '2015-05-02', 'M', NULL,
    '7900-3344', NULL, NULL, 'Ilopango, Col. Santa Lucía', 'Ilopango', 'El Salvador',
    NULL, 'O+', TRUE, (CURRENT_DATE - 90)::timestamptz),
  (11, 'PAC-0011', 'DUI', '07788990-1', 'Verónica', 'Campos Delgado', '1979-07-21', 'F', 'Union libre',
    '7566-1199', NULL, 'veronica.campos@email.com', 'Apopa, Res. Valle Verde', 'Apopa', 'El Salvador',
    'Enfermera', 'AB-', TRUE, (CURRENT_DATE - 60)::timestamptz),
  (12, 'PAC-0012', 'DUI', '08899001-2', 'Ricardo', 'Escobar Turcios', '1969-10-11', 'M', 'Casado',
    '7322-4455', NULL, 'ricardo.escobar@email.com', 'San Salvador, Col. Médica', 'San Salvador', 'El Salvador',
    'Abogado', 'B+', TRUE, (CURRENT_DATE - 30)::timestamptz);


-- ============================================================================
-- 7. CONTACTOS DE EMERGENCIA — mock: contactosEmergencia[1..5] (COMPLETO)
-- ============================================================================

INSERT INTO contactos_emergencia (
  contacto_emergencia_id, paciente_id, nombre_completo, parentesco,
  telefono, telefono_secundario, email, prioridad, activo
)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 1, 'Silvia Ramírez de López', 'Cónyuge', '7600-9988', NULL, 'silvia.r@email.com', 1, TRUE),
  (2, 1, 'Mario López', 'Padre', '7601-2233', NULL, NULL, 2, TRUE),
  (3, 2, 'Rosa Cruz', 'Madre', '7622-1010', NULL, NULL, 1, TRUE),
  (4, 3, 'Elena Molina', 'Hermano(a)', '7646-3030', NULL, NULL, 1, TRUE),
  (5, 10, 'Karla Castro', 'Madre', '7900-3344', '2255-6677', 'karla.castro@email.com', 1, TRUE);


-- ============================================================================
-- 8. HORARIOS MÉDICOS — mock: horarios[1..11] (COMPLETO, schema.sql solo 8)
-- ============================================================================

INSERT INTO horarios_medicos (
  horario_id, medico_id, dia_semana, hora_inicio, hora_fin, consultorio_id, activo
)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 1, 1, '08:00', '12:00', 1, TRUE),
  (2, 1, 1, '14:00', '17:00', 1, TRUE),
  (3, 1, 3, '08:00', '13:00', 1, TRUE),
  (4, 1, 5, '08:00', '12:00', 2, TRUE),
  (5, 2, 2, '09:00', '13:00', 3, TRUE),
  (6, 2, 4, '09:00', '13:00', 3, TRUE),
  (7, 3, 1, '07:30', '11:30', 4, TRUE),
  (8, 3, 2, '07:30', '11:30', 4, TRUE),
  (9, 3, 4, '14:00', '18:00', 4, TRUE),
  (10, 4, 3, '14:00', '18:00', 2, TRUE),
  (11, 4, 5, '13:00', '17:00', 2, TRUE);


-- ============================================================================
-- 9. MEDICAMENTOS — mock: medicamentos[1..12] (COMPLETO, schema.sql solo 8)
-- ============================================================================

INSERT INTO medicamentos (
  medicamento_id, nombre, principio_activo, presentacion, concentracion, activo
)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Acetaminofén', 'Paracetamol', 'Tableta', '500 mg', TRUE),
  (2, 'Amoxicilina', 'Amoxicilina', 'Cápsula', '500 mg', TRUE),
  (3, 'Ibuprofeno', 'Ibuprofeno', 'Tableta', '400 mg', TRUE),
  (4, 'Losartán', 'Losartán potásico', 'Tableta', '50 mg', TRUE),
  (5, 'Metformina', 'Metformina clorhidrato', 'Tableta', '850 mg', TRUE),
  (6, 'Omeprazol', 'Omeprazol', 'Cápsula', '20 mg', TRUE),
  (7, 'Loratadina', 'Loratadina', 'Tableta', '10 mg', TRUE),
  (8, 'Salbutamol', 'Salbutamol', 'Inhalador', '100 mcg/dosis', TRUE),
  (9, 'Ciprofloxacino', 'Ciprofloxacino', 'Tableta', '500 mg', TRUE),
  (10, 'Diclofenaco', 'Diclofenaco sódico', 'Ampolla', '75 mg/3 mL', TRUE),
  (11, 'Hidrocortisona', 'Hidrocortisona', 'Crema', '1%', TRUE),
  (12, 'Sales de rehidratación oral', 'Electrolitos', 'Sobre', '20.5 g', TRUE);


-- ============================================================================
-- 10. CITAS — mock: citas[100..116] (17 registros, schema.sql traía 0)
-- ----------------------------------------------------------------------------
-- Equivalencias con mock-db.ts:
--   dia(0)       = CURRENT_DATE
--   dia(N)       = CURRENT_DATE + N
--   lunes        = date_trunc('week', now())::date  (lunes de esta semana)
--   diaSemana(N) = lunes + N   (0=Lun ... 4=Vie)
-- ============================================================================

INSERT INTO citas (
  cita_id, paciente_id, medico_id, consultorio_id,
  fecha, hora, motivo, estado, observacion
)
OVERRIDING SYSTEM VALUE
VALUES
  (100, 6, 1, 1, CURRENT_DATE, '09:00', 'Control de presión arterial', 'Confirmada', NULL),
  (101, 2, 2, 3, CURRENT_DATE, '10:30', 'Control ginecológico anual', 'Confirmada', NULL),
  (102, 7, 1, 1, CURRENT_DATE, '11:00', 'Dolor de garganta y fiebre', 'Programada', NULL),
  (103, 10, 3, 4, CURRENT_DATE, '08:00', 'Control de crecimiento', 'Atendida', NULL),
  (104, 1, 1, 1, CURRENT_DATE, '14:30', 'Seguimiento cardiológico', 'Programada', NULL),
  (105, 12, 4, 2, CURRENT_DATE, '15:00', 'Lesión en la piel', 'Programada', NULL),
  (106, 3, 1, 1, (date_trunc('week', now())::date + 0), '08:30', 'Consulta general', 'Atendida', NULL),
  (107, 4, 2, 3, (date_trunc('week', now())::date + 1), '09:30', 'Control prenatal', 'Atendida', NULL),
  (108, 8, 4, 2, (date_trunc('week', now())::date + 2), '14:00', 'Acné persistente', 'Cancelada', NULL),
  (109, 9, 1, 1, (date_trunc('week', now())::date + 2), '09:00', 'Palpitaciones', 'Atendida', NULL),
  (110, 11, 2, 3, (date_trunc('week', now())::date + 3), '10:00', 'Consulta de rutina', 'Cancelada', NULL),
  (111, 5, 1, 2, (date_trunc('week', now())::date + 4), '10:00', 'Chequeo general', 'Programada', NULL),
  (112, 1, 4, 2, (CURRENT_DATE + 1), '14:30', 'Revisión de lunar', 'Programada', NULL),
  (113, 10, 3, 4, (CURRENT_DATE + 1), '08:20', 'Vacunación', 'Confirmada', NULL),
  (114, 12, 1, 1, (CURRENT_DATE + 2), '09:30', 'Dolor lumbar', 'Programada', NULL),
  (115, 6, 2, 3, (CURRENT_DATE + 3), '11:00', 'Consulta de pareja', 'Programada', NULL),
  (116, 7, 3, 4, (CURRENT_DATE + 4), '15:00', 'Control de asma', 'Programada', NULL);


-- ============================================================================
-- 11. ATENCIONES — mock: atenciones[1..2] (citaId 106 y 109)
-- ============================================================================

INSERT INTO atenciones (
  atencion_id, cita_id, paciente_id, medico_id,
  fecha_atencion, motivo_consulta, diagnostico, estado
)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 106, 3, 1,
    ((date_trunc('week', now())::date + 0) + TIME '08:35')::timestamptz,
    'Consulta general',
    'Diabetes mellitus tipo 2 (E11) — control metabólico irregular.',
    'Cerrada'),
  (2, 109, 9, 1,
    ((date_trunc('week', now())::date + 2) + TIME '09:10')::timestamptz,
    'Palpitaciones',
    'Hipertensión esencial (I10).',
    'Cerrada');


-- ============================================================================
-- 12. SIGNOS VITALES — mock: atencion.signosVitales (1 por atención)
-- ============================================================================

INSERT INTO signos_vitales (
  signos_vitales_id, atencion_id, presion_arterial, frecuencia_cardiaca,
  temperatura, saturacion_oxigeno, peso, talla, fecha_registro
)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 1, '138/86', 78, 36.7, 97, 84.5, 1.74,
    ((date_trunc('week', now())::date + 0) + TIME '08:40')::timestamptz),
  (2, 2, '145/92', 96, 36.4, 98, 68.2, 1.58,
    ((date_trunc('week', now())::date + 2) + TIME '09:15')::timestamptz);


-- ============================================================================
-- 13. NOTAS MÉDICAS — mock: atencion.notas
-- ============================================================================

INSERT INTO notas_medicas (
  nota_medica_id, atencion_id, nota, fecha, medico_nombre
)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 1,
    'Se ajusta dosis de metformina y se solicita hemoglobina glicosilada de control en 3 meses.',
    ((date_trunc('week', now())::date + 0) + TIME '08:55')::timestamptz,
    'Dr(a). Luis Alberto Martínez Rivas'),
  (2, 2,
    'Se indica electrocardiograma y control de presión domiciliaria por 7 días.',
    ((date_trunc('week', now())::date + 2) + TIME '09:30')::timestamptz,
    'Dr(a). Luis Alberto Martínez Rivas');


-- ============================================================================
-- 14. PRESCRIPCIONES + DETALLE — mock: prescripciones[1..2]
-- ============================================================================

INSERT INTO prescripciones (
  prescripcion_id, atencion_id, paciente_id, fecha, indicaciones_generales
)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 1, 3,
    ((date_trunc('week', now())::date + 0) + TIME '09:00')::timestamptz,
    'Control en 3 meses con laboratorios.'),
  (2, 2, 9,
    ((date_trunc('week', now())::date + 2) + TIME '09:35')::timestamptz,
    NULL);

INSERT INTO prescripciones_detalle (
  prescripcion_detalle_id, prescripcion_id, medicamento_id,
  dosis, frecuencia, duracion, via_administracion
)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 1, 5, '1 tableta', 'Cada 12 horas', '90 días', 'Oral'),
  (2, 1, 4, '1 tableta', 'Cada 24 horas', '90 días', 'Oral'),
  (3, 2, 4, '1 tableta', 'Cada 24 horas', '30 días', 'Oral');


-- ============================================================================
-- 15. SINCRONIZACIÓN DE SECUENCIAS (tablas GENERATED ALWAYS AS IDENTITY)
-- ============================================================================

SELECT setval(pg_get_serial_sequence('public.roles', 'rol_id'), COALESCE((SELECT max(rol_id) FROM public.roles), 1), TRUE);
SELECT setval(pg_get_serial_sequence('public.usuarios', 'usuario_id'), COALESCE((SELECT max(usuario_id) FROM public.usuarios), 1), TRUE);
SELECT setval(pg_get_serial_sequence('public.pacientes', 'paciente_id'), COALESCE((SELECT max(paciente_id) FROM public.pacientes), 1), TRUE);
SELECT setval(pg_get_serial_sequence('public.contactos_emergencia', 'contacto_emergencia_id'), COALESCE((SELECT max(contacto_emergencia_id) FROM public.contactos_emergencia), 1), TRUE);
SELECT setval(pg_get_serial_sequence('public.especialidades', 'especialidad_id'), COALESCE((SELECT max(especialidad_id) FROM public.especialidades), 1), TRUE);
SELECT setval(pg_get_serial_sequence('public.consultorios', 'consultorio_id'), COALESCE((SELECT max(consultorio_id) FROM public.consultorios), 1), TRUE);
SELECT setval(pg_get_serial_sequence('public.medicos', 'medico_id'), COALESCE((SELECT max(medico_id) FROM public.medicos), 1), TRUE);
SELECT setval(pg_get_serial_sequence('public.horarios_medicos', 'horario_id'), COALESCE((SELECT max(horario_id) FROM public.horarios_medicos), 1), TRUE);
SELECT setval(pg_get_serial_sequence('public.citas', 'cita_id'), COALESCE((SELECT max(cita_id) FROM public.citas), 1), TRUE);
SELECT setval(pg_get_serial_sequence('public.atenciones', 'atencion_id'), COALESCE((SELECT max(atencion_id) FROM public.atenciones), 1), TRUE);
SELECT setval(pg_get_serial_sequence('public.signos_vitales', 'signos_vitales_id'), COALESCE((SELECT max(signos_vitales_id) FROM public.signos_vitales), 1), TRUE);
SELECT setval(pg_get_serial_sequence('public.notas_medicas', 'nota_medica_id'), COALESCE((SELECT max(nota_medica_id) FROM public.notas_medicas), 1), TRUE);
SELECT setval(pg_get_serial_sequence('public.medicamentos', 'medicamento_id'), COALESCE((SELECT max(medicamento_id) FROM public.medicamentos), 1), TRUE);
SELECT setval(pg_get_serial_sequence('public.prescripciones', 'prescripcion_id'), COALESCE((SELECT max(prescripcion_id) FROM public.prescripciones), 1), TRUE);
SELECT setval(pg_get_serial_sequence('public.prescripciones_detalle', 'prescripcion_detalle_id'), COALESCE((SELECT max(prescripcion_detalle_id) FROM public.prescripciones_detalle), 1), TRUE);

COMMIT;


-- ============================================================================
-- 16. VERIFICACIÓN — conteos esperados del mock
--    roles 3 | usuarios 5 | pacientes 12 | contactos 5 | especialidades 7 |
--    consultorios 5 | medicos 5 | horarios 11 | citas 17 | atenciones 2 |
--    signos 2 | notas 2 | medicamentos 12 | prescripciones 2 | detalle 3
-- ============================================================================

SELECT 'roles' AS tabla, count(*) AS registros FROM roles
UNION ALL SELECT 'usuarios', count(*) FROM usuarios
UNION ALL SELECT 'pacientes', count(*) FROM pacientes
UNION ALL SELECT 'contactos_emergencia', count(*) FROM contactos_emergencia
UNION ALL SELECT 'especialidades', count(*) FROM especialidades
UNION ALL SELECT 'consultorios', count(*) FROM consultorios
UNION ALL SELECT 'medicos', count(*) FROM medicos
UNION ALL SELECT 'horarios_medicos', count(*) FROM horarios_medicos
UNION ALL SELECT 'citas', count(*) FROM citas
UNION ALL SELECT 'atenciones', count(*) FROM atenciones
UNION ALL SELECT 'signos_vitales', count(*) FROM signos_vitales
UNION ALL SELECT 'notas_medicas', count(*) FROM notas_medicas
UNION ALL SELECT 'medicamentos', count(*) FROM medicamentos
UNION ALL SELECT 'prescripciones', count(*) FROM prescripciones
UNION ALL SELECT 'prescripciones_detalle', count(*) FROM prescripciones_detalle
ORDER BY 1;
