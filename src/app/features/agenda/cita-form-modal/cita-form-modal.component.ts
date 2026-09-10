import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { PatientService } from '../../../core/services/patient.service';
import { StaffService } from '../../../core/services/staff.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ToastService } from '../../../core/services/toast.service';
import { Paciente } from '../../../core/models/patient.model';
import { Especialidad, Medico } from '../../../core/models/staff.model';
import { SlotDisponible } from '../../../core/models/appointment.model';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { InicialesPipe } from '../../../shared/pipes/iniciales.pipe';

/**
 * Formulario de Nueva Cita: autocomplete de paciente contra Patient, médico
 * filtrado por especialidad contra Staff, y slots calculados combinando los
 * horarios del médico con las citas ya ocupadas.
 */
@Component({
  selector: 'app-cita-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, IconComponent, InicialesPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cita-form-modal.component.html',
})
export class CitaFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly patientService = inject(PatientService);
  private readonly staffService = inject(StaffService);
  private readonly appointmentService = inject(AppointmentService);
  private readonly toast = inject(ToastService);

  readonly open = input(false);
  readonly fechaInicial = input<string | null>(null);
  readonly close = output<void>();
  readonly saved = output<void>();

  protected readonly saving = signal(false);
  protected readonly especialidades = signal<Especialidad[]>([]);
  protected readonly medicosTodos = signal<Medico[]>([]);
  protected readonly slots = signal<SlotDisponible[]>([]);
  protected readonly loadingSlots = signal(false);

  protected readonly pacienteQuery = signal('');
  protected readonly pacienteResultados = signal<Paciente[]>([]);
  protected readonly pacienteSeleccionado = signal<Paciente | null>(null);
  protected readonly buscandoPaciente = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    especialidadId: [0, Validators.required],
    medicoId: [0, Validators.required],
    fecha: ['', Validators.required],
    hora: ['', Validators.required],
    motivo: [''],
  });

  protected readonly medicosFiltrados = computed(() => {
    const espId = this.form.controls.especialidadId.value;
    if (!espId) return this.medicosTodos();
    return this.medicosTodos().filter((m) => m.especialidadId === Number(espId));
  });

  constructor() {
    this.staffService.listSpecialties().subscribe((res) => this.especialidades.set(res.filter((e) => e.activo)));
    this.staffService.listDoctors({ page: 1, pageSize: 100 }).subscribe((res) => this.medicosTodos.set(res.items.filter((m) => m.activo)));

    effect(() => {
      if (this.open()) {
        this.form.reset({ especialidadId: 0, medicoId: 0, fecha: this.fechaInicial() ?? new Date().toISOString().slice(0, 10), hora: '', motivo: '' });
        this.pacienteSeleccionado.set(null);
        this.pacienteQuery.set('');
        this.pacienteResultados.set([]);
        this.slots.set([]);
      }
    });
  }

  protected buscarPaciente(term: string): void {
    this.pacienteQuery.set(term);
    this.pacienteSeleccionado.set(null);
    if (term.trim().length < 2) {
      this.pacienteResultados.set([]);
      return;
    }
    this.buscandoPaciente.set(true);
    this.patientService.list({ page: 1, pageSize: 6, search: term }).subscribe((res) => {
      this.pacienteResultados.set(res.items);
      this.buscandoPaciente.set(false);
    });
  }

  protected seleccionarPaciente(p: Paciente): void {
    this.pacienteSeleccionado.set(p);
    this.pacienteQuery.set(`${p.nombres} ${p.apellidos}`);
    this.pacienteResultados.set([]);
  }

  protected limpiarPaciente(): void {
    this.pacienteSeleccionado.set(null);
    this.pacienteQuery.set('');
  }

  protected onEspecialidadChange(): void {
    this.form.patchValue({ medicoId: 0 });
    this.slots.set([]);
    this.form.patchValue({ hora: '' });
  }

  protected onMedicoOFechaChange(): void {
    const medicoId = Number(this.form.controls.medicoId.value);
    const fecha = this.form.controls.fecha.value;
    this.form.patchValue({ hora: '' });
    if (!medicoId || !fecha) {
      this.slots.set([]);
      return;
    }
    this.loadingSlots.set(true);
    this.appointmentService.slots(medicoId, fecha).subscribe({
      next: (res) => {
        this.slots.set(res);
        this.loadingSlots.set(false);
      },
      error: () => this.loadingSlots.set(false),
    });
  }

  protected pick(hora: string): void {
    this.form.patchValue({ hora });
  }

  protected submit(): void {
    const paciente = this.pacienteSeleccionado();
    if (!paciente || this.form.invalid || !this.form.controls.hora.value) {
      this.form.markAllAsTouched();
      if (!paciente) this.toast.error('Selecciona un paciente de la lista.');
      return;
    }
    this.saving.set(true);
    const value = this.form.getRawValue();
    // Consultorio simplificado: se asume el mismo consultorio 1 para el prototipo
    // (Appointment solo persiste el ConsultorioId, no la especialidad).
    const consultorioId = 1;
    this.appointmentService.create({
      pacienteId: paciente.pacienteId,
      medicoId: Number(value.medicoId),
      consultorioId,
      fecha: value.fecha,
      hora: value.hora,
      motivo: value.motivo || null,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Cita agendada correctamente.');
        this.saved.emit();
        this.close.emit();
      },
      error: () => this.saving.set(false),
    });
  }
}
