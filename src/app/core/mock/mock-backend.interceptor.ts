/**
 * Interceptor HTTP que simula los 5 microservicios en memoria.
 *
 * Solo se registra cuando `environment.useMock === true` (ver `app.config.ts`).
 * Intercepta por patrón de URL (independiente del host: funciona igual si las
 * llamadas van directo a cada microservicio o a través del API Gateway) y
 * responde con la forma exacta que produce el backend real (mismo modelo,
 * mismos códigos HTTP, mismo `ProblemDetails` en errores), de modo que apagar
 * el mock es un cambio de una sola línea en `environment.ts`.
 *
 * Refleja la planificación reducida a 5 módulos: Security (solo Usuarios y
 * Roles, sin Permisos/Sesiones/Auditoría), Patient (sin cambios), Staff (una
 * especialidad por médico), Appointment (sin Estados_Cita ni Turnos) y
 * ClinicalCare (fusiona MedicalRecord + Treatment, sin expediente,
 * antecedentes, alergias, hábitos ni catálogos de síntomas/CIE-10).
 */
import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

import * as db from './mock-db';
import { LoginResponse } from '../models/security.model';
import { Paciente } from '../models/patient.model';
import { Medico } from '../models/staff.model';
import { Cita, EstadoCita } from '../models/appointment.model';
import { Atencion, Prescripcion } from '../models/clinical-care.model';

const LATENCY = 260;
let nextId = 1000;
const genId = () => ++nextId;

/**
 * Clona el cuerpo antes de responder, igual que lo haría una serialización
 * HTTP real: sin esto, el cliente recibiría la MISMA referencia que sigue
 * viva en `mock-db`, y una mutación posterior del "servidor" (ej. un
 * `array.push/unshift` sobre una colección anidada) se reflejaría también en
 * el objeto que el cliente ya tiene, duplicando datos en cualquier merge
 * optimista (`{ ...a, notas: [nueva, ...a.notas] }` y similares).
 */
function ok<T>(body: T, status = 200): Observable<HttpEvent<any>> {
  const cloned = body === undefined ? body : (JSON.parse(JSON.stringify(body)) as T);
  return of(new HttpResponse({ status, body: cloned })).pipe(delay(LATENCY));
}

function created<T>(body: T): Observable<HttpEvent<any>> {
  return ok(body, 201);
}

function noContent(): Observable<HttpEvent<any>> {
  return of(new HttpResponse({ status: 204 })).pipe(delay(LATENCY));
}

function fail(status: number, detail: string): Observable<never> {
  return throwError(
    () => new HttpErrorResponse({ status, error: { title: detail, status, detail } }),
  ).pipe(delay(LATENCY)) as Observable<never>;
}

function paginate<T>(items: T[], search: string | null, page: number, pageSize: number, matcher: (i: T, q: string) => boolean) {
  const q = (search ?? '').toLowerCase().trim();
  const filtered = q ? items.filter((i) => matcher(i, q)) : items;
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  return { items: filtered.slice(start, start + pageSize), total, page, pageSize };
}

function scorePaciente(p: Paciente, q: string): number {
  const qn = q.toLowerCase().trim();
  const full = `${p.nombres} ${p.apellidos}`.toLowerCase();
  const nombres = p.nombres.toLowerCase();
  const apellidos = p.apellidos.toLowerCase();
  const doc = p.numeroDocumento.toLowerCase();
  if (full === qn) return 100;
  if (full.startsWith(qn)) return 90;
  if (nombres.startsWith(qn) || apellidos.startsWith(qn)) return 80;
  if (full.split(/\s+/).some(w => w.startsWith(qn))) return 70;
  if (full.includes(qn)) return 60;
  if (doc.includes(qn)) return 40;
  if ((p.telefono ?? '').includes(qn)) return 30;
  return 10;
}

/** Segmentos de una URL relativa al host+puerto, sin query string. */
function segments(url: string): string[] {
  const path = url.split('?')[0];
  return path.replace(/^https?:\/\/[^/]+/, '').split('/').filter(Boolean);
}

/** Único estado que sigue bloqueando el horario de un médico (sin "No asistió"/"En espera"). */
const ESTADOS_QUE_OCUPAN_SLOT: EstadoCita[] = ['Programada', 'Confirmada', 'En atencion', 'Atendida'];

export function mockBackendInterceptor(req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> {
  // `req.url` NUNCA incluye el query string (Angular lo guarda aparte en
  // `req.params` y solo lo serializa en `req.urlWithParams`); leer `req.url`
  // aquí haría que todo filtro/búsqueda enviado como HttpParams (page,
  // pageSize, search, desde, hasta, medicoId, estado…) se ignorara en
  // silencio y el mock devolviera siempre el primer lote sin filtrar.
  const seg = segments(req.urlWithParams);
  const qp = new URLSearchParams(req.urlWithParams.split('?')[1] ?? '');
  const method = req.method;

  try {
    // ------------------------------------------------------------- Security
    if (seg[0] === 'auth' && seg[1] === 'login' && method === 'POST') {
      const { nombreUsuario, contrasena } = req.body ?? {};
      const usuario = db.usuarios.find(
        (u) => u.nombreUsuario.toLowerCase() === String(nombreUsuario ?? '').toLowerCase(),
      );
      if (!usuario) return fail(401, 'Usuario o contraseña incorrectos.');
      if (!usuario.activo) return fail(403, 'El usuario está desactivado.');
      if (!contrasena) return fail(401, 'Usuario o contraseña incorrectos.');
      const response: LoginResponse = {
        token: `mock.${btoa(usuario.nombreUsuario)}.${Date.now()}`,
        expiraEn: new Date(Date.now() + 8 * 3600_000).toISOString(),
        usuario: {
          usuarioId: usuario.usuarioId,
          nombreUsuario: usuario.nombreUsuario,
          nombreCompleto: usuario.nombreCompleto,
          email: usuario.email,
          rol: usuario.rol,
          medicoId: usuario.medicoId ?? null,
        },
      };
      usuario.ultimoAcceso = new Date().toISOString();
      return created(response);
    }
    if (seg[0] === 'auth' && seg[1] === 'logout' && method === 'POST') return noContent();

    if (seg[0] === 'users') {
      if (seg.length === 1 && method === 'GET') {
        const search = qp.get('search');
        const result = paginate(db.usuarios, search, Number(qp.get('page') ?? 1), Number(qp.get('pageSize') ?? 10),
          (u, q) => u.nombreCompleto.toLowerCase().includes(q) || u.nombreUsuario.toLowerCase().includes(q));
        return ok(result);
      }
      if (seg.length === 1 && method === 'POST') {
        const body = req.body;
        if (db.usuarios.some((u) => u.nombreUsuario === body.nombreUsuario)) return fail(409, 'El nombre de usuario ya existe.');
        const rol = db.roles.find((r) => r.rolId === Number(body.rolId));
        const nuevo = {
          usuarioId: genId(), nombreUsuario: body.nombreUsuario, nombreCompleto: body.nombreCompleto,
          email: body.email, rolId: Number(body.rolId), rol: (rol?.nombre ?? 'Recepcion') as any,
          medicoId: body.medicoId ?? null,
          activo: body.activo ?? true, ultimoAcceso: null, fechaCreacion: new Date().toISOString(),
        };
        db.usuarios.unshift(nuevo);
        return created(nuevo);
      }
      const id = Number(seg[1]);
      if (seg.length === 2 && method === 'PUT') {
        const u = db.usuarios.find((x) => x.usuarioId === id);
        if (!u) return fail(404, 'Usuario no encontrado.');
        const rol = db.roles.find((r) => r.rolId === Number(req.body.rolId));
        Object.assign(u, { ...req.body, rol: rol?.nombre ?? u.rol });
        return noContent();
      }
      if (seg.length === 3 && seg[2] === 'estado' && method === 'PATCH') {
        const u = db.usuarios.find((x) => x.usuarioId === id);
        if (!u) return fail(404, 'Usuario no encontrado.');
        u.activo = req.body.activo;
        return noContent();
      }
    }

    if (seg[0] === 'roles' && seg.length === 1 && method === 'GET') return ok(db.roles);

    // -------------------------------------------------------------- Patient
    if (seg[0] === 'patients') {
      if (seg.length === 1 && method === 'GET') {
        const ids = qp.get('ids');
        if (ids) {
          const idList = ids.split(',').map(Number);
          return ok(db.pacientes.filter((p) => idList.includes(p.pacienteId)));
        }
        const activo = qp.get('activo');
        const sexo = qp.get('sexo');
        const tipoDocumento = qp.get('tipoDocumento');
        const base = db.pacientes.filter((p) =>
          (activo === null || p.activo === (activo === 'true')) &&
          (!sexo || p.sexo === sexo) &&
          (!tipoDocumento || p.tipoDocumento === tipoDocumento)
        );

        const search = qp.get('search');
        const rawQ = (search ?? '').toLowerCase().trim();
        if (rawQ) {
          let filtered = base.filter((p) =>
            `${p.nombres} ${p.apellidos}`.toLowerCase().includes(rawQ) ||
            p.numeroDocumento.toLowerCase().includes(rawQ) ||
            (p.telefono ?? '').includes(rawQ)
          );
          filtered = filtered.sort((a, b) => {
            const sa = scorePaciente(a, rawQ);
            const sb = scorePaciente(b, rawQ);
            if (sb !== sa) return sb - sa;
            return `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`);
          });
          const page = Number(qp.get('page') ?? 1);
          const pageSize = Number(qp.get('pageSize') ?? 10);
          const start = (page - 1) * pageSize;
          return ok({ items: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize });
        }
        const result = paginate(base, search, Number(qp.get('page') ?? 1), Number(qp.get('pageSize') ?? 10),
          (p, q) => `${p.nombres} ${p.apellidos}`.toLowerCase().includes(q) || p.numeroDocumento.toLowerCase().includes(q) || (p.telefono ?? '').includes(q));
        return ok(result);
      }
      if (seg.length === 1 && method === 'POST') {
        const body: Partial<Paciente> = req.body;
        if (db.pacientes.some((p) => p.numeroDocumento === body.numeroDocumento)) {
          return fail(409, 'Ya existe un paciente con ese número de documento.');
        }
        const nuevo: Paciente = {
          pacienteId: genId(),
          codigoPaciente: `PAC-${String(db.pacientes.length + 1).padStart(4, '0')}`,
          fechaRegistro: new Date().toISOString(),
          contactosEmergencia: [],
          ...body,
        } as Paciente;
        db.pacientes.unshift(nuevo);
        return created(nuevo);
      }

      if (seg[1] === 'search' && method === 'GET') {
        const doc = qp.get('numeroDocumento') ?? '';
        const found = db.pacientes.find((p) => p.numeroDocumento === doc);
        return found ? ok(found) : fail(404, 'No existe un paciente con ese documento.');
      }

      const pacienteId = Number(seg[1]);
      const paciente = db.pacientes.find((p) => p.pacienteId === pacienteId);

      if (seg.length === 2 && method === 'GET') return paciente ? ok(paciente) : fail(404, 'Paciente no encontrado.');
      if (seg.length === 2 && method === 'PUT') {
        if (!paciente) return fail(404, 'Paciente no encontrado.');
        Object.assign(paciente, req.body);
        return noContent();
      }
      if (seg.length === 2 && method === 'DELETE') {
        if (!paciente) return fail(404, 'Paciente no encontrado.');
        paciente.activo = false;
        return noContent();
      }

      if (seg[2] === 'EmergencyContacts') {
        if (seg.length === 3 && method === 'GET') {
          return ok(db.contactosEmergencia.filter((c) => c.pacienteId === pacienteId).sort((a, b) => a.prioridad - b.prioridad));
        }
        if (seg.length === 3 && method === 'POST') {
          if (!paciente) return fail(404, 'Paciente no encontrado.');
          const nuevo = { contactoEmergenciaId: genId(), pacienteId, activo: true, ...req.body };
          db.contactosEmergencia.push(nuevo);
          return created(nuevo);
        }
        const contactoId = Number(seg[3]);
        if (seg.length === 4 && method === 'PUT') {
          const c = db.contactosEmergencia.find((x) => x.contactoEmergenciaId === contactoId);
          if (!c) return fail(404, 'Contacto no encontrado.');
          Object.assign(c, req.body);
          return noContent();
        }
        if (seg.length === 4 && method === 'DELETE') {
          const idx = db.contactosEmergencia.findIndex((x) => x.contactoEmergenciaId === contactoId);
          if (idx === -1) return fail(404, 'Contacto no encontrado.');
          db.contactosEmergencia.splice(idx, 1);
          return noContent();
        }
      }
    }
    if (seg[0] === 'EmergencyContacts' && method === 'GET') return ok(db.contactosEmergencia);

    // ---------------------------------------------------------------- Staff
    if (seg[0] === 'doctors' || seg[0] === 'medicos') {
      if (seg.length === 1 && method === 'GET') {
        const ids = qp.get('ids');
        if (ids) {
          const idList = ids.split(',').map(Number);
          return ok(db.medicos.filter((m) => idList.includes(m.medicoId)));
        }
        const search = qp.get('search');
        const result = paginate(db.medicos, search, Number(qp.get('page') ?? 1), Number(qp.get('pageSize') ?? 10),
          (m, q) => `${m.nombres} ${m.apellidos}`.toLowerCase().includes(q)
            || (m.especialidadNombre ?? '').toLowerCase().includes(q));
        return ok(result);
      }
      if (seg.length === 1 && method === 'POST') {
        const especialidad = db.especialidades.find((e) => e.especialidadId === Number(req.body.especialidadId));
        const nuevo: Medico = { medicoId: genId(), especialidadNombre: especialidad?.nombre ?? '', ...req.body };
        db.medicos.unshift(nuevo);
        return created(nuevo);
      }
      const medicoId = Number(seg[1]);
      const medico = db.medicos.find((m) => m.medicoId === medicoId);
      if (seg.length === 2 && method === 'GET') return medico ? ok(medico) : fail(404, 'Médico no encontrado.');
      if (seg.length === 2 && method === 'PUT') {
        if (!medico) return fail(404, 'Médico no encontrado.');
        const especialidad = db.especialidades.find((e) => e.especialidadId === Number(req.body.especialidadId));
        Object.assign(medico, { ...req.body, especialidadNombre: especialidad?.nombre ?? medico.especialidadNombre });
        return noContent();
      }
      if (seg.length === 2 && method === 'DELETE') {
        if (!medico) return fail(404, 'Médico no encontrado.');
        medico.activo = false;
        return noContent();
      }
      if (seg[2] === 'schedules') {
        if (seg.length === 3 && method === 'GET') return ok(db.horarios.filter((h) => h.medicoId === medicoId));
        if (seg.length === 3 && method === 'POST') {
          const nuevo = { horarioId: genId(), medicoId, activo: true, ...req.body };
          db.horarios.push(nuevo);
          return created(nuevo);
        }
        const horarioId = Number(seg[3]);
        if (seg.length === 4 && method === 'PUT') {
          const h = db.horarios.find((x) => x.horarioId === horarioId);
          if (!h) return fail(404, 'Horario no encontrado.');
          Object.assign(h, req.body);
          return noContent();
        }
        if (seg.length === 4 && method === 'DELETE') {
          const idx = db.horarios.findIndex((x) => x.horarioId === horarioId);
          if (idx === -1) return fail(404, 'Horario no encontrado.');
          db.horarios.splice(idx, 1);
          return noContent();
        }
      }
    }

    if (seg[0] === 'specialties') {
      if (seg.length === 1 && method === 'GET') return ok(db.especialidades);
      if (seg.length === 1 && method === 'POST') {
        const nuevo = { especialidadId: genId(), activo: true, ...req.body };
        db.especialidades.push(nuevo);
        return created(nuevo);
      }
      const id = Number(seg[1]);
      if (seg.length === 2 && method === 'PUT') {
        const e = db.especialidades.find((x) => x.especialidadId === id);
        if (!e) return fail(404, 'Especialidad no encontrada.');
        Object.assign(e, req.body);
        return noContent();
      }
      if (seg.length === 2 && method === 'DELETE') {
        const e = db.especialidades.find((x) => x.especialidadId === id);
        if (!e) return fail(404, 'Especialidad no encontrada.');
        e.activo = false;
        return noContent();
      }
    }

    if (seg[0] === 'clinics' || seg[0] === 'consultorios') {
      if (seg.length === 1 && method === 'GET') return ok(db.consultorios);
      if (seg.length === 1 && method === 'POST') {
        const nuevo = { consultorioId: genId(), activo: true, ...req.body };
        db.consultorios.push(nuevo);
        return created(nuevo);
      }
      const id = Number(seg[1]);
      if (seg.length === 2 && method === 'PUT') {
        const c = db.consultorios.find((x) => x.consultorioId === id);
        if (!c) return fail(404, 'Consultorio no encontrado.');
        Object.assign(c, req.body);
        return noContent();
      }
      if (seg.length === 2 && method === 'DELETE') {
        const c = db.consultorios.find((x) => x.consultorioId === id);
        if (!c) return fail(404, 'Consultorio no encontrado.');
        c.activo = false;
        return noContent();
      }
    }

    // --------------------------------------------------------- Appointment
    if (seg[0] === 'appointments' || seg[0] === 'citas') {
      if (seg.length === 1 && method === 'GET') {
        let items = [...db.citas];
        const desde = qp.get('desde'), hasta = qp.get('hasta'), medicoId = qp.get('medicoId');
        const pacienteId = qp.get('pacienteId'), estado = qp.get('estado');
        if (desde) items = items.filter((c) => c.fecha >= desde);
        if (hasta) items = items.filter((c) => c.fecha <= hasta);
        if (medicoId) items = items.filter((c) => c.medicoId === Number(medicoId));
        if (pacienteId) items = items.filter((c) => c.pacienteId === Number(pacienteId));
        if (estado) items = items.filter((c) => c.estado === estado);
        items.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
        return ok(items);
      }
      if (seg.length === 1 && method === 'POST') {
        const body = req.body;
        const paciente = db.pacientes.find((p) => p.pacienteId === Number(body.pacienteId));
        const medico = db.medicos.find((m) => m.medicoId === Number(body.medicoId));
        if (!paciente) return fail(404, 'El paciente indicado no existe (Patient).');
        if (!medico) return fail(404, 'El médico indicado no existe (Staff).');
        const ocupado = db.citas.some((c) => c.medicoId === medico.medicoId && c.fecha === body.fecha && c.hora === body.hora
          && ESTADOS_QUE_OCUPAN_SLOT.includes(c.estado));
        if (ocupado) return fail(409, 'El médico ya tiene una cita agendada en ese horario.');
        const consultorio = db.consultorios.find((c) => c.consultorioId === Number(body.consultorioId));
        const nueva: Cita = {
          citaId: genId(),
          pacienteId: paciente.pacienteId,
          pacienteNombre: `${paciente.nombres} ${paciente.apellidos}`,
          pacienteDocumento: paciente.numeroDocumento,
          medicoId: medico.medicoId,
          medicoNombre: `Dr(a). ${medico.nombres} ${medico.apellidos}`,
          especialidadNombre: medico.especialidadNombre ?? '',
          consultorioId: consultorio?.consultorioId ?? 0,
          consultorioNombre: consultorio?.nombre ?? '',
          fecha: body.fecha, hora: body.hora,
          motivo: body.motivo ?? null, estado: 'Programada', observacion: null,
        };
        db.citas.push(nueva);
        return created(nueva);
      }
      // "/appointments/slots" también tiene 2 segmentos: se resuelve antes de
      // tratar seg[1] como un citaId, o el branch de abajo lo confundiría con
      // un ID inexistente (Number('slots') === NaN) y devolvería 404.
      if (seg[1] === 'slots' && method === 'GET') {
        // Slots simulados: cada 30 min entre 08:00 y 17:00, marcando ocupados.
        const fecha = qp.get('fecha')!;
        const medicoIdQ = Number(qp.get('medicoId'));
        const ocupadas = new Set(db.citas.filter((c) => c.medicoId === medicoIdQ && c.fecha === fecha
          && ESTADOS_QUE_OCUPAN_SLOT.includes(c.estado)).map((c) => c.hora));
        const slots = [];
        for (let h = 8; h < 17; h++) {
          for (const m of [0, 30]) {
            const hora = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            slots.push({ hora, disponible: !ocupadas.has(hora), consultorioId: 1 });
          }
        }
        return ok(slots);
      }

      const citaId = Number(seg[1]);
      const cita = db.citas.find((c) => c.citaId === citaId);
      if (seg.length === 2 && method === 'GET') return cita ? ok(cita) : fail(404, 'Cita no encontrada.');
      if (seg.length === 2 && method === 'PUT') {
        if (!cita) return fail(404, 'Cita no encontrada.');
        Object.assign(cita, req.body);
        return noContent();
      }
      if (seg[2] === 'estado' && method === 'PATCH') {
        if (!cita) return fail(404, 'Cita no encontrada.');
        cita.estado = req.body.estado as EstadoCita;
        return ok(cita);
      }
      if (seg[2] === 'cancelar' && method === 'POST') {
        if (!cita) return fail(404, 'Cita no encontrada.');
        cita.estado = 'Cancelada';
        cita.observacion = req.body?.motivo ?? cita.observacion;
        return ok(cita);
      }
    }

    // ------------------------------------------------------------ ClinicalCare
    if (seg[0] === 'consultations') {
      if (seg[1] === 'by-cita' && method === 'GET') {
        const citaId = Number(seg[2]);
        const existente = db.atenciones.find((a) => a.citaId === citaId);
        return existente ? ok(existente) : fail(404, 'No existe una atención abierta para esta cita.');
      }
      if (seg[1] === 'patient' && method === 'GET') {
        const pacienteId = Number(seg[2]);
        const items = db.atenciones.filter((a) => a.pacienteId === pacienteId).sort((a, b) => b.fechaAtencion.localeCompare(a.fechaAtencion));
        return ok(items);
      }
      if (seg.length === 1 && method === 'POST') {
        const body = req.body;
        const existente = db.atenciones.find((a) => a.citaId === Number(body.citaId));
        if (existente) return ok(existente);
        const paciente = db.pacientes.find((p) => p.pacienteId === Number(body.pacienteId));
        const medico = db.medicos.find((m) => m.medicoId === Number(body.medicoId));
        const cita = db.citas.find((c) => c.citaId === Number(body.citaId));
        const nueva: Atencion = {
          atencionId: genId(), citaId: Number(body.citaId), pacienteId: body.pacienteId,
          pacienteNombre: paciente ? `${paciente.nombres} ${paciente.apellidos}` : '',
          medicoId: body.medicoId, medicoNombre: medico ? `Dr(a). ${medico.nombres} ${medico.apellidos}` : '',
          fechaAtencion: new Date().toISOString(), motivoConsulta: cita?.motivo ?? null,
          diagnostico: null, estado: 'Abierta',
          signosVitales: null, notas: [],
        };
        db.atenciones.push(nueva);
        if (cita) cita.estado = 'En atencion';
        return created(nueva);
      }
      const atencionId = Number(seg[1]);
      const atencion = db.atenciones.find((a) => a.atencionId === atencionId);
      if (seg.length === 2 && method === 'GET') return atencion ? ok(atencion) : fail(404, 'Atención no encontrada.');
      if (seg.length === 2 && method === 'PUT') {
        if (!atencion) return fail(404, 'Atención no encontrada.');
        Object.assign(atencion, req.body);
        return noContent();
      }
      if (!atencion) return fail(404, 'Atención no encontrada.');
      if (seg[2] === 'vitals' && method === 'PUT') {
        atencion.signosVitales = { ...req.body, atencionId, fechaRegistro: new Date().toISOString() };
        return ok(atencion.signosVitales);
      }
      if (seg[2] === 'notes' && method === 'POST') {
        const nota = { notaMedicaId: genId(), atencionId, fecha: new Date().toISOString(), ...req.body };
        atencion.notas.unshift(nota);
        return created(nota);
      }
      if (seg[2] === 'close' && method === 'POST') {
        atencion.estado = 'Cerrada';
        const cita = db.citas.find((c) => c.citaId === atencion.citaId);
        if (cita) cita.estado = 'Atendida';
        return ok(atencion);
      }
    }

    if (seg[0] === 'medications') {
      if (seg.length === 1 && method === 'GET') {
        const search = qp.get('search');
        const result = paginate(db.medicamentos, search, Number(qp.get('page') ?? 1), Number(qp.get('pageSize') ?? 10),
          (m, q) => m.nombre.toLowerCase().includes(q) || m.principioActivo.toLowerCase().includes(q));
        return ok(result);
      }
      if (seg.length === 1 && method === 'POST') {
        const nuevo = { medicamentoId: genId(), activo: true, ...req.body };
        db.medicamentos.unshift(nuevo);
        return created(nuevo);
      }
      const id = Number(seg[1]);
      if (seg.length === 2 && method === 'PUT') {
        const m = db.medicamentos.find((x) => x.medicamentoId === id);
        if (!m) return fail(404, 'Medicamento no encontrado.');
        Object.assign(m, req.body);
        return noContent();
      }
      if (seg.length === 2 && method === 'DELETE') {
        const m = db.medicamentos.find((x) => x.medicamentoId === id);
        if (!m) return fail(404, 'Medicamento no encontrado.');
        m.activo = false;
        return noContent();
      }
    }

    if (seg[0] === 'prescriptions') {
      if (seg[1] === 'patient' && method === 'GET') {
        const pacienteId = Number(seg[2]);
        return ok(db.prescripciones.filter((p) => p.pacienteId === pacienteId).sort((a, b) => b.fecha.localeCompare(a.fecha)));
      }
      if (seg.length === 1 && method === 'POST') {
        const body = req.body;
        const paciente = db.pacientes.find((p) => p.pacienteId === Number(body.pacienteId));
        const atencion = db.atenciones.find((a) => a.atencionId === Number(body.atencionId));
        const nueva: Prescripcion = {
          prescripcionId: genId(),
          atencionId: body.atencionId, pacienteId: body.pacienteId,
          pacienteNombre: paciente ? `${paciente.nombres} ${paciente.apellidos}` : '',
          medicoNombre: atencion?.medicoNombre ?? '',
          fecha: new Date().toISOString(), indicacionesGenerales: body.indicacionesGenerales ?? null,
          detalles: (body.detalles ?? []).map((d: any) => ({
            ...d,
            prescripcionDetalleId: genId(),
            medicamentoNombre: db.medicamentos.find((m) => m.medicamentoId === Number(d.medicamentoId))?.nombre ?? '',
          })),
        };
        db.prescripciones.unshift(nueva);
        return created(nueva);
      }
      const id = Number(seg[1]);
      if (seg.length === 2 && method === 'GET') {
        const p = db.prescripciones.find((x) => x.prescripcionId === id);
        return p ? ok(p) : fail(404, 'Prescripción no encontrada.');
      }
    }
  } catch (e) {
    return fail(500, (e as Error)?.message ?? 'Error interno simulado.');
  }

  // No coincide con ningún patrón mockeado: se deja pasar (útil para assets, fonts, etc.)
  return next(req);
}
