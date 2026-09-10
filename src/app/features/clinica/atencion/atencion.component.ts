import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AppointmentService } from '../../../core/services/appointment.service';
import { ClinicalCareService } from '../../../core/services/clinical-care.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Atencion } from '../../../core/models/clinical-care.model';
import { Cita } from '../../../core/models/appointment.model';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { InicialesPipe } from '../../../shared/pipes/iniciales.pipe';

type Tab = 'general' | 'signos' | 'notas';

/**
 * Ficha de Atención: pantalla principal de trabajo del médico durante la
 * consulta. Versión reducida: el motivo de consulta se muestra desde la Cita
 * (Appointment), el diagnóstico es texto libre dentro de la Atención (sin
 * catálogo CIE-10) y no hay pestañas de síntomas ni diagnósticos múltiples.
 */
@Component({
  selector: 'app-atencion',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IconComponent, InicialesPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './atencion.component.html',
  styleUrl: './atencion.component.css',
})
export class AtencionComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly appointmentService = inject(AppointmentService);
  private readonly clinicalCareService = inject(ClinicalCareService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly citaId = Number(this.route.snapshot.paramMap.get('citaId'));
  protected readonly loading = signal(true);
  protected readonly cita = signal<Cita | null>(null);
  protected readonly atencion = signal<Atencion | null>(null);
  protected readonly tab = signal<Tab>('general');

  protected readonly savingGeneral = signal(false);
  protected readonly savingVitals = signal(false);
  protected readonly savingNota = signal(false);
  protected readonly finalizando = signal(false);

  protected readonly generalForm = this.fb.nonNullable.group({
    diagnostico: [''],
  });

  protected readonly vitalsForm = this.fb.nonNullable.group({
    presionArterial: [''],
    frecuenciaCardiaca: [null as number | null],
    temperatura: [null as number | null],
    saturacionOxigeno: [null as number | null],
    peso: [null as number | null],
    talla: [null as number | null],
  });

  /** Refleja los valores en vivo del formulario (un FormControl no es un signal por sí solo). */
  private readonly vitalsValue = toSignal(this.vitalsForm.valueChanges, { initialValue: this.vitalsForm.getRawValue() });

  /** Calculado solo para mostrarlo en pantalla; no se persiste (no existe columna IMC en SignosVitales). */
  protected readonly imc = computed(() => {
    const { peso, talla } = this.vitalsValue();
    if (!peso || !talla) return null;
    return Number((peso / (talla * talla)).toFixed(1));
  });

  protected readonly nuevaNota = signal('');

  constructor() {
    this.cargarTodo();
  }

  private cargarTodo(): void {
    this.loading.set(true);
    this.appointmentService.get(this.citaId).subscribe({
      next: (cita) => {
        this.cita.set(cita);
        this.clinicalCareService.abrirAtencion({
          citaId: cita.citaId, pacienteId: cita.pacienteId, medicoId: cita.medicoId,
        }).subscribe({
          next: (atencion) => {
            this.atencion.set(atencion);
            this.generalForm.patchValue({ diagnostico: atencion.diagnostico ?? '' });
            if (atencion.signosVitales) {
              const sv = atencion.signosVitales;
              this.vitalsForm.patchValue({ ...sv, presionArterial: sv.presionArterial ?? '' });
            }
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  protected setTab(t: Tab): void {
    this.tab.set(t);
  }

  protected get cerrada(): boolean {
    return this.atencion()?.estado === 'Cerrada';
  }

  // ------------------------------------------------------------- Generales
  protected guardarGeneral(): void {
    const a = this.atencion();
    if (!a) return;
    this.savingGeneral.set(true);
    this.clinicalCareService.updateAtencion(a.atencionId, this.generalForm.getRawValue()).subscribe({
      next: () => {
        this.savingGeneral.set(false);
        this.toast.success('Diagnóstico guardado.');
        this.atencion.set({ ...a, ...this.generalForm.getRawValue() });
      },
      error: () => this.savingGeneral.set(false),
    });
  }

  // --------------------------------------------------------------- Signos
  protected guardarSignos(): void {
    const a = this.atencion();
    if (!a) return;
    this.savingVitals.set(true);
    this.clinicalCareService.saveVitals(a.atencionId, this.vitalsForm.getRawValue()).subscribe({
      next: (sv) => {
        this.savingVitals.set(false);
        this.toast.success('Signos vitales guardados.');
        this.atencion.set({ ...a, signosVitales: sv });
      },
      error: () => this.savingVitals.set(false),
    });
  }

  // ----------------------------------------------------------------- Notas
  protected guardarNota(): void {
    const a = this.atencion();
    const texto = this.nuevaNota().trim();
    if (!a || !texto) return;
    this.savingNota.set(true);
    this.clinicalCareService.addNota(a.atencionId, texto).subscribe({
      next: (nota) => {
        this.savingNota.set(false);
        this.nuevaNota.set('');
        this.atencion.set({ ...a, notas: [nota, ...a.notas] });
      },
      error: () => this.savingNota.set(false),
    });
  }

  // ------------------------------------------------------------- Acciones
  protected generarPrescripcion(): void {
    const a = this.atencion();
    if (!a) return;
    this.router.navigate(['/tratamientos/prescripcion/nueva'], { queryParams: { atencionId: a.atencionId } });
  }

  protected async finalizarAtencion(): Promise<void> {
    const a = this.atencion();
    if (!a) return;
    const confirmed = await this.confirm.ask({
      title: 'Finalizar atención',
      message: 'La cita pasará a estado "Atendida" y no podrás editar esta ficha. ¿Continuar?',
      confirmLabel: 'Finalizar',
    });
    if (!confirmed) return;
    this.finalizando.set(true);
    this.clinicalCareService.cerrarAtencion(a.atencionId).subscribe({
      next: () => {
        this.finalizando.set(false);
        this.toast.success('Atención finalizada. La cita fue marcada como Atendida.');
        this.router.navigateByUrl('/agenda');
      },
      error: () => this.finalizando.set(false),
    });
  }
}
