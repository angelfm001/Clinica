import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { AppointmentService } from '../../../core/services/appointment.service';
import { AuthService } from '../../../core/services/auth.service';
import { ClinicalCareService } from '../../../core/services/clinical-care.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { PatientService } from '../../../core/services/patient.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  Alergia, Antecedente, Atencion, ExpedienteClinico, Prescripcion, SEVERIDADES_ALERGIA, SeveridadAlergia,
  TIPOS_ALERGIA, TIPOS_ANTECEDENTE, TipoAlergia, TipoAntecedente,
} from '../../../core/models/clinical-care.model';
import { PARENTESCOS, Paciente } from '../../../core/models/patient.model';
import { Cita } from '../../../core/models/appointment.model';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { EstadoCitaBadgeComponent } from '../../../shared/ui/estado-cita-badge/estado-cita-badge.component';
import { InicialesPipe } from '../../../shared/pipes/iniciales.pipe';
import { EdadPipe } from '../../../shared/pipes/edad.pipe';

type Tab = 'resumen' | 'habitos' | 'citas' | 'historial';

/**
 * Expediente clínico de un paciente (uno por paciente, en ClinicalCare):
 * alergias, antecedentes y hábitos, más el historial de atenciones y las
 * prescripciones emitidas, y sus citas (Appointment). Al abrir la vista,
 * ClinicalCare crea el expediente si el paciente aún no tenía. El Médico lo
 * edita; el Administrador lo consulta en modo lectura.
 */
@Component({
  selector: 'app-expediente',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink, IconComponent, EmptyStateComponent, EstadoCitaBadgeComponent,
    InicialesPipe, EdadPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './expediente.component.html',
  styleUrl: './expediente.component.css',
})
export class ExpedienteComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly clinicalCareService = inject(ClinicalCareService);
  private readonly appointmentService = inject(AppointmentService);
  private readonly auth = inject(AuthService);
  private readonly patientService = inject(PatientService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly tiposAlergia = TIPOS_ALERGIA;
  protected readonly severidades = SEVERIDADES_ALERGIA;
  protected readonly tiposAntecedente = TIPOS_ANTECEDENTE;
  protected readonly parentescos = PARENTESCOS;

  protected readonly pacienteId = Number(this.route.snapshot.paramMap.get('pacienteId'));
  protected readonly loading = signal(true);
  protected readonly paciente = signal<Paciente | null>(null);
  protected readonly expediente = signal<ExpedienteClinico | null>(null);
  protected readonly atenciones = signal<Atencion[]>([]);
  protected readonly prescripciones = signal<Prescripcion[]>([]);
  protected readonly citas = signal<Cita[]>([]);
  protected readonly loadingCitas = signal(true);

  /** Solo el Médico modifica el expediente; el Administrador lo ve en modo lectura. */
  protected readonly puedeEditar = this.auth.hasRol('Medico');
  protected readonly tab = signal<Tab>('resumen');

  protected readonly atencionExpandida = signal<number | null>(null);
  protected readonly recetaExpandida = signal<number | null>(null);

  protected readonly mostrarFormAlergia = signal(false);
  protected readonly mostrarFormAntecedente = signal(false);
  protected readonly savingAlergia = signal(false);
  protected readonly savingAntecedente = signal(false);
  protected readonly savingHabitos = signal(false);

  protected readonly alergias = computed(() => this.expediente()?.alergias ?? []);
  protected readonly alergiasSeveras = computed(() => this.alergias().filter((a) => a.severidad === 'Severa'));

  /** Antecedentes agrupados en el orden del catálogo de tipos; los grupos vacíos se omiten. */
  protected readonly antecedentesPorTipo = computed(() => {
    const items = this.expediente()?.antecedentes ?? [];
    return TIPOS_ANTECEDENTE
      .map((t) => ({ ...t, items: items.filter((a) => a.tipo === t.valor) }))
      .filter((g) => g.items.length);
  });

  protected readonly alergiaForm = this.fb.nonNullable.group({
    sustancia: ['', [Validators.required, Validators.maxLength(150)]],
    tipo: ['Medicamento' as TipoAlergia],
    severidad: ['Moderada' as SeveridadAlergia],
    reaccion: ['', Validators.maxLength(500)],
  });

  protected readonly antecedenteForm = this.fb.nonNullable.group({
    tipo: ['Patologico' as TipoAntecedente],
    descripcion: ['', [Validators.required, Validators.maxLength(500)]],
    parentesco: [''],
    fechaDiagnostico: [''],
  });

  protected readonly habitosForm = this.fb.nonNullable.group({
    tabaquismo: ['', Validators.maxLength(200)],
    consumoAlcohol: ['', Validators.maxLength(200)],
    actividadFisica: ['', Validators.maxLength(200)],
    alimentacion: ['', Validators.maxLength(200)],
    observaciones: ['', Validators.maxLength(2000)],
  });

  /** Para limitar el selector de fecha de diagnóstico a hoy. */
  protected readonly hoy = new Date().toISOString().slice(0, 10);

  constructor() {
    this.patientService.getById(this.pacienteId).subscribe((p) => this.paciente.set(p));
    this.clinicalCareService.listByPaciente(this.pacienteId).subscribe((res) => this.prescripciones.set(res));
    this.appointmentService.list({ pacienteId: this.pacienteId }).subscribe({
      // Las más recientes primero.
      next: (res) => {
        this.citas.set([...res].reverse());
        this.loadingCitas.set(false);
      },
      error: () => this.loadingCitas.set(false),
    });
    if (!this.puedeEditar) this.habitosForm.disable();
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      // El expediente no debe impedir ver el historial si ClinicalCare rechaza abrirlo
      // (por ejemplo, si Patient no responde): el interceptor de errores ya avisa con un toast.
      expediente: this.clinicalCareService.getExpediente(this.pacienteId).pipe(catchError(() => of(null))),
      atenciones: this.clinicalCareService.getAtencionesPaciente(this.pacienteId).pipe(catchError(() => of([] as Atencion[]))),
    }).subscribe(({ expediente, atenciones }) => {
      this.setExpediente(expediente);
      this.atenciones.set(atenciones);
      this.loading.set(false);
    });
  }

  private setExpediente(expediente: ExpedienteClinico | null): void {
    this.expediente.set(expediente);
    if (!expediente) return;
    this.habitosForm.reset({
      tabaquismo: expediente.tabaquismo ?? '',
      consumoAlcohol: expediente.consumoAlcohol ?? '',
      actividadFisica: expediente.actividadFisica ?? '',
      alimentacion: expediente.alimentacion ?? '',
      observaciones: expediente.observaciones ?? '',
    });
  }

  protected setTab(tab: Tab): void {
    this.tab.set(tab);
  }

  protected etiquetaTipoAntecedente(tipo: TipoAntecedente): string {
    return TIPOS_ANTECEDENTE.find((t) => t.valor === tipo)?.etiqueta ?? tipo;
  }

  protected claseSeveridad(severidad: SeveridadAlergia): string {
    return severidad === 'Severa' ? 'badge-danger' : severidad === 'Moderada' ? 'badge-warning' : 'badge-neutral';
  }

  // ---------------------------------------------------------------- Alergias
  protected toggleFormAlergia(): void {
    this.mostrarFormAlergia.update((v) => !v);
    this.alergiaForm.reset();
  }

  protected guardarAlergia(): void {
    if (this.alergiaForm.invalid) {
      this.alergiaForm.markAllAsTouched();
      return;
    }
    this.savingAlergia.set(true);
    this.clinicalCareService.addAlergia(this.pacienteId, this.alergiaForm.getRawValue()).subscribe({
      next: (alergia) => {
        this.actualizarExpediente((e) => ({ ...e, alergias: ordenarAlergias([...e.alergias, alergia]) }));
        this.toast.success(`Alergia a ${alergia.sustancia} registrada.`);
        this.savingAlergia.set(false);
        this.toggleFormAlergia();
      },
      error: () => this.savingAlergia.set(false),
    });
  }

  protected async eliminarAlergia(alergia: Alergia): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Quitar alergia',
      message: `¿Quitar la alergia a ${alergia.sustancia} del expediente?`,
      confirmLabel: 'Quitar',
      tone: 'danger',
    });
    if (!ok) return;
    this.clinicalCareService.deleteAlergia(this.pacienteId, alergia.alergiaId).subscribe(() => {
      this.actualizarExpediente((e) => ({ ...e, alergias: e.alergias.filter((a) => a.alergiaId !== alergia.alergiaId) }));
      this.toast.success('Alergia eliminada del expediente.');
    });
  }

  // ---------------------------------------------------------------- Antecedentes
  protected toggleFormAntecedente(): void {
    this.mostrarFormAntecedente.update((v) => !v);
    this.antecedenteForm.reset();
  }

  protected guardarAntecedente(): void {
    const value = this.antecedenteForm.getRawValue();
    if (this.antecedenteForm.invalid || (value.tipo === 'Familiar' && !value.parentesco)) {
      this.antecedenteForm.markAllAsTouched();
      if (value.tipo === 'Familiar' && !value.parentesco) this.toast.warning('Indica el parentesco del familiar.');
      return;
    }
    this.savingAntecedente.set(true);
    this.clinicalCareService.addAntecedente(this.pacienteId, value).subscribe({
      next: (antecedente) => {
        this.actualizarExpediente((e) => ({ ...e, antecedentes: [antecedente, ...e.antecedentes] }));
        this.toast.success('Antecedente registrado.');
        this.savingAntecedente.set(false);
        this.toggleFormAntecedente();
      },
      error: () => this.savingAntecedente.set(false),
    });
  }

  protected async eliminarAntecedente(antecedente: Antecedente): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Quitar antecedente',
      message: `¿Quitar "${antecedente.descripcion}" del expediente?`,
      confirmLabel: 'Quitar',
      tone: 'danger',
    });
    if (!ok) return;
    this.clinicalCareService.deleteAntecedente(this.pacienteId, antecedente.antecedenteId).subscribe(() => {
      this.actualizarExpediente((e) => ({
        ...e,
        antecedentes: e.antecedentes.filter((a) => a.antecedenteId !== antecedente.antecedenteId),
      }));
      this.toast.success('Antecedente eliminado del expediente.');
    });
  }

  // ---------------------------------------------------------------- Hábitos
  protected guardarHabitos(): void {
    if (this.habitosForm.invalid) {
      this.habitosForm.markAllAsTouched();
      return;
    }
    this.savingHabitos.set(true);
    this.clinicalCareService.updateHabitos(this.pacienteId, this.habitosForm.getRawValue()).subscribe({
      next: (expediente) => {
        this.setExpediente(expediente);
        this.toast.success('Hábitos y observaciones guardados.');
        this.savingHabitos.set(false);
      },
      error: () => this.savingHabitos.set(false),
    });
  }

  private actualizarExpediente(fn: (e: ExpedienteClinico) => ExpedienteClinico): void {
    this.expediente.update((e) => (e ? fn(e) : e));
  }

  protected toggleAtencion(id: number): void {
    this.atencionExpandida.update((cur) => (cur === id ? null : id));
  }

  protected toggleReceta(id: number): void {
    this.recetaExpandida.update((cur) => (cur === id ? null : id));
  }

  protected imprimirPrescripcion(rx: Prescripcion): void {
    const p = this.paciente();
    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) return;
    const rows = rx.detalles.map((d) => `
      <tr>
        <td>${d.medicamentoNombre}</td>
        <td>${d.dosis}</td>
        <td>${d.frecuencia}</td>
        <td>${d.duracion}</td>
        <td>${d.viaAdministracion}</td>
      </tr>`).join('');
    w.document.write(`
      <html>
        <head>
          <title>Receta RX-${rx.prescripcionId}</title>
          <style>
            body{font-family:'Inter',Arial,sans-serif;color:#172033;padding:32px;line-height:1.5}
            h1{font-size:20px;margin:0 0 4px}
            .muted{color:#7b8799;font-size:12px}
            .header{border-bottom:2px solid #096be0;padding-bottom:12px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-start}
            table{width:100%;border-collapse:collapse;margin-top:14px;font-size:13px}
            th{text-align:left;background:#f1f5fa;padding:8px 10px;border-bottom:1px solid #e2e7ef;font-size:11px;letter-spacing:.03em;text-transform:uppercase;color:#4c5a72}
            td{padding:9px 10px;border-bottom:1px solid #edf0f4}
            .footer{margin-top:22px;border-top:1px solid #e2e7ef;padding-top:12px;font-size:11px;color:#7b8799}
            @media print { body{padding:20px} }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Citas Médicas · Receta</h1>
              <div class="muted">RX-${rx.prescripcionId} · ${new Date(rx.fecha).toLocaleString('es-SV')}</div>
              <div style="margin-top:8px"><strong>Paciente:</strong> ${p ? `${p.nombres} ${p.apellidos}` : rx.pacienteNombre} ${p ? `· ${p.numeroDocumento}` : ''}</div>
              <div><strong>Médico:</strong> ${rx.medicoNombre ?? ''}</div>
              ${rx.indicacionesGenerales ? `<div style="margin-top:6px"><strong>Indicaciones:</strong> ${rx.indicacionesGenerales}</div>` : ''}
            </div>
            <div style="text-align:right">
              <div style="font-weight:700;color:#096be0;font-size:13px">Sistema de Gestión</div>
              <div class="muted">${p?.codigoPaciente ?? ''}</div>
            </div>
          </div>
          <table>
            <thead><tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Duración</th><th>Vía</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="footer">Impreso el ${new Date().toLocaleString('es-SV')} · Este documento es válido como receta médica. · Citas Médicas</div>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  }
}

const PESO_SEVERIDAD: Record<SeveridadAlergia, number> = { Severa: 0, Moderada: 1, Leve: 2 };

/** Mismo orden que devuelve ClinicalCare: severas primero, luego por sustancia. */
function ordenarAlergias(alergias: Alergia[]): Alergia[] {
  return [...alergias].sort(
    (a, b) => PESO_SEVERIDAD[a.severidad] - PESO_SEVERIDAD[b.severidad] || a.sustancia.localeCompare(b.sustancia),
  );
}
