# Guía detallada — Crear la base de datos desde 0 en Supabase (ClinicaPort)

Esta app usa **UNA SOLA base de datos** en Supabase (Postgres) para todo:
usuarios/roles, pacientes, staff, citas, atenciones, medicamentos y prescripciones.
Ya no hay 5 microservicios ni mock.

Tiempo estimado: 10–15 minutos.

\---

## Parte 1 — Crear cuenta y proyecto en Supabase

1. Entra a **https://supabase.com** y crea una cuenta (puedes usar GitHub).
2. Clic en **New project** (o `New organization` primero si no tienes ninguna).
3. Completa:

   * **Organization:** crea una o elige la que tengas (ej. `Mi Clinica`).
   * **Name:** ej. `ClinicaPort`.
   * **Database Password:** inventa una contraseña fuerte y **guárdala** (solo se usa para conexión directa a Postgres, no la necesita la app).
   * **Region:** elige la más cercana a ti. Para El Salvador / LATAM sirve `East US (North Virginia)` o `South America (São Paulo)`.
   * **Plan:** Free.



4. Clic en **Create new project** y espera 1–3 minutos a que diga `Project is ready`.

> Solo necesitas \*\*UN proyecto\*\*. No crees uno por módulo: todas las tablas van en el esquema `public` de ese único proyecto.

\---

## Parte 2 — Crear las tablas (ejecutar `supabase/schema.sql`)

1. En el menú lateral del proyecto ve a **SQL Editor** (icono `</>`).
2. Clic en **New query**.
3. En tu PC abre el archivo del proyecto:

   * `supabase/schema.sql`
4. **Copia TODO el contenido** y pégalo en el editor de Supabase.
5. Clic en **Run** (o `Ctrl + Enter`).
6. Debe decir `Success. No rows returned`.

### Qué crea ese script

* 15 tablas: `roles`, `usuarios`, `pacientes`, `contactos\_emergencia`, `especialidades`, `consultorios`, `medicos`, `horarios\_medicos`, `citas`, `atenciones`, `signos\_vitales`, `notas\_medicas`, `medicamentos`, `prescripciones`, `prescripciones\_detalle`.
* Relaciones (FK), índice anti-doble-reserva en `citas` (mismo médico + fecha + hora).
* **RLS activado** con política abierta `proto\_all` en cada tabla (prototipo: permite operar con la `anon key`).
* Datos de prueba (seeds): 3 roles, 5 usuarios, 8 pacientes, especialidades, consultorios, médicos, horarios y medicamentos.

### Verificar que quedó bien

1. Ve a **Table Editor** (icono tabla) → esquema `public`.
2. Debes ver las 15 tablas listadas.
3. Abre `roles`: debe tener `Administrador`, `Medico`, `Recepcion`.
4. Abre `usuarios`: debes ver `admin`, `lmartinez`, `asolis`, `amartinez`, `jportillo`.
5. Abre `pacientes`: debes ver `PAC-0001`, `PAC-0002`, etc.

Si alguna tabla falta, vuelve al SQL Editor y ejecuta el script de nuevo (es idempotente: borra y recrea).

\---

## Parte 3 — Dónde está y cómo copiar la API de Supabase

La app solo necesita **2 datos**: `Project URL` y `anon public key`.

### En el dashboard nuevo de Supabase

1. Abajo a la izquierda clic en el icono de **engranaje (Settings)**.
2. Entra a **API** (o `Project Settings > API`).
3. Copia:

   * **Project URL:** se ve como `https://abcdefghijk.supabase.co`
   * **anon public key:** en la sección `API Keys` → key `anon` / `public` (es larga, empieza con `eyJ...`).

> ⚠️ Usa la \*\*`anon`\*\*, NO la `service\_role`. La `service\_role` salta toda seguridad y nunca debe ir en el frontend.

### En el dashboard clásico (si ves otra interfaz)

`Settings (engranaje) > API > Project URL + Project API keys > anon key`.

\---

## Parte 4 — Configurar la API en el código Angular

Hay **2 archivos** y ambos llevan los mismos valores:

### 1\. Desarrollo: `src/environments/environment.ts`

```ts
export const environment = {
  production: false,
  supabase: {
    url: 'https://TU-PROYECTO.supabase.co',  // ← pega tu Project URL
    anonKey: 'TU-ANON-PUBLIC-KEY',            // ← pega tu anon key
  },
  ...
};
```

### 2\. Producción: `src/environments/environment.prod.ts`

```ts
export const environment = {
  production: true,
  supabase: {
    url: 'https://TU-PROYECTO.supabase.co',  // ← MISMO valor
    anonKey: 'TU-ANON-PUBLIC-KEY',            // ← MISMO valor
  },
  ...
};
```

Cómo los usa la app:

* `src/app/core/services/supabase-client.service.ts` lee `environment.supabase` y crea el cliente con `createClient(url, anonKey)`.
* Todos los servicios (`auth`, `patient`, `staff`, `appointment`, `clinical-care`, `security-admin`) usan ese cliente. Ningún componente llama URLs de microservicios.

Guarda los archivos. Si ves en consola el aviso `\[Supabase] Configura environment.supabase...`, es que aún dejaste `TU-PROYECTO`.

\---

## Parte 5 — Probar que funciona

1. En la terminal del proyecto:

```powershell
   npm install
   npm start
   ```

2. Abre `http://localhost:4200/login`.
3. Inicia sesión con un usuario seed (contraseña de todos: `demo1234`):

   * `admin` → Administrador
   * `lmartinez` → Médico
   * `amartinez` → Recepción
4. Ve a **Configuración** (menú admin): debe decir `Supabase conectado` y mostrar tu URL.
5. Prueba crear un paciente, una cita y abrir una atención. Si guarda sin error, la DB está bien conectada.

\---

## Parte 6 — Solución de problemas

|Síntoma|Causa probable|Qué hacer|
|-|-|-|
|Consola: `\[Supabase] Configura...`|No pegaste URL/key|Revisa Parte 4, guarda y recarga con `Ctrl + Shift + R`|
|Login dice `Usuario o contraseña incorrectos` con `admin/demo1234`|No se ejecutaron los seeds|Ve a Table Editor → `usuarios`. Si está vacía, ejecuta `supabase/schema.sql` de nuevo|
|Error `Failed to fetch` / `TypeError: fetch failed`|URL mal copiada o proyecto pausado|Verifica la URL (sin `/` final), y en Supabase que el proyecto esté `Active` (los free se pausan por inactividad: clic `Resume`)|
|Error `new row violates row-level security policy`|Faltan las políticas `proto\_all`|El `schema.sql` ya las crea. Si creaste tablas a mano, ejecuta solo el bloque `create policy "proto\_all"...` del script|
|Error `duplicate key value` / 409 al crear paciente o cita|Unicidad funcionando bien|Paciente: ese `numero\_documento` ya existe. Cita: ese médico ya tiene cita a esa fecha+hora|
|Cambié la key y sigue fallando|Caché del navegador|Cierra sesión, borra `sessionStorage` (o botón `Limpiar sesión` en Configuración) y recarga|
|Quiero empezar de cero otra vez|—|Ejecuta `supabase/schema.sql` de nuevo: borra todo y deja seeds limpios|

\---

## Parte 7 — Notas de seguridad (importante)

* Las políticas `proto\_all` (`using (true) with check (true)`) son **solo para prototipo/desarrollo**: cualquiera con tu `anon key` puede leer/escribir.
* Para producción real:

  1. Activa **Authentication** de Supabase (email/password o OAuth).
  2. Quita `contrasena` en claro de `usuarios` y vincula con `auth.users`.
  3. Reemplaza `proto\_all` por políticas por rol (ej. solo `Administrador` puede tocar `usuarios`).
* Nunca subas tu `service\_role key` al frontend ni a Git público.

\---

## Resumen rápido (checklist)

* \[ ] Proyecto Supabase creado (1 solo).
* \[ ] `supabase/schema.sql` ejecutado en SQL Editor → `Success`.
* \[ ] Tablas y seeds visibles en Table Editor.
* \[ ] `Project URL` + `anon key` copiados desde `Settings > API`.
* \[ ] Pegados en `environment.ts` Y en `environment.prod.ts`.
* \[ ] `npm start` → login `admin / demo1234` funciona.

