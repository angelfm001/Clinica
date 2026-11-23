# Interfaz clinica

## Conexión con el backend

La interfaz consume los 5 microservicios de `MedicalAppointments` (carpeta `src` del repositorio padre).

1. Levantar el backend y la interfaz: desde la raíz del repositorio, `.\scripts\levantar-todo.ps1`
   (o cada API con `dotnet run --project <Api> --launch-profile http` y aquí `npm start`).
2. Abrir `http://localhost:4200` e iniciar sesión con uno de los usuarios de demostración (uno por rol,
   sembrados en Development; también están como accesos rápidos en el login):

| Usuario | Contraseña | Rol | Puede |
|---|---|---|---|
| `admin` | `Admin123!` | Administrador | Pacientes, agendar citas, Personal y medicamentos (crear/editar), usuarios, reportes |
| `recepcion` | `Recepcion123!` | Recepcion | Pacientes, agendar y cambiar estado de citas, ver Personal, reportes |
| `medico` | `Medico123!` | Medico | Pacientes, cambiar estado de citas, Clínica (atención, expediente, prescripciones), ver medicamentos |

`medico` está enlazado al médico que siembra Staff (`Seed:Medico` en su `appsettings.Development.json`, con horario de lunes a viernes).
La interfaz solo muestra a cada rol lo que su microservicio le permite (por ejemplo, la atención clínica es exclusiva del rol Médico en ClinicalCare).

`ng serve` usa `proxy.conf.json` para reenviar `/api/<servicio>/...` al puerto de cada API, así que no hace falta CORS:

| Ruta en la interfaz | Microservicio | Puerto |
|---|---|---|
| `/api/security` | Security | 5248 |
| `/api/patient` | Patient | 5244 |
| `/api/staff` | Staff | 5250 |
| `/api/appointment` | Appointment | 5246 |
| `/api/clinical-care` | ClinicalCare | 5252 |

Los servicios de `src/app/core/services` traducen entre los DTOs del backend (sobre `HttpResponse<T>`, `id`, `EnAtencion`, día 0 = domingo…) y los modelos de la interfaz, así que los componentes no dependen del formato del backend.

Para agregar otro médico con acceso: como administrador, crearlo en *Personal* con sus horarios y luego, en *Usuarios y Roles*, una cuenta con rol `Medico` vinculada a ese médico.

---

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.22.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

