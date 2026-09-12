import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { PatientService } from '../../../core/services/patient.service';
import { ToastService } from '../../../core/services/toast.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import { Paciente, PacienteInput } from '../../../core/models/patient.model';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';

/**
 * Formulario de alta/edición de Paciente, en modal (secciones: datos
 * personales y contacto), tal como pide la especificación de Patient.
 */
@Component({
  selector: 'app-paciente-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './paciente-form-modal.component.html',
})
export class PacienteFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly patientService = inject(PatientService);
  private readonly toast = inject(ToastService);
  private readonly notificaciones = inject(NotificacionesService);

  readonly open = input(false);
  readonly paciente = input<Paciente | null>(null);
  readonly close = output<void>();
  readonly saved = output<Paciente>();

  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    tipoDocumento: ['DUI', Validators.required],
    numeroDocumento: ['', Validators.required],
    fechaNacimiento: ['', Validators.required],
    sexo: ['', Validators.required],
    estadoCivil: [''],
    tipoSangre: [''],
    telefono: [''],
    telefonoSecundario: [''],
    email: ['', Validators.email],
    direccion: [''],
    ciudad: [''],
    pais: ['El Salvador'],
    ocupacion: [''],
    activo: [true],
  });

  constructor() {
    effect(() => {
      const p = this.paciente();
      if (p) {
        this.form.reset({
          nombres: p.nombres, apellidos: p.apellidos, tipoDocumento: p.tipoDocumento,
          numeroDocumento: p.numeroDocumento, fechaNacimiento: p.fechaNacimiento, sexo: p.sexo,
          estadoCivil: p.estadoCivil ?? '', tipoSangre: p.tipoSangre ?? '', telefono: p.telefono ?? '',
          telefonoSecundario: p.telefonoSecundario ?? '', email: p.email ?? '', direccion: p.direccion ?? '',
          ciudad: p.ciudad ?? '', pais: p.pais ?? 'El Salvador', ocupacion: p.ocupacion ?? '', activo: p.activo,
        });
      } else if (this.open()) {
        this.form.reset({ tipoDocumento: 'DUI', pais: 'El Salvador', activo: true });
      }
    });
  }

  protected get isEdit(): boolean {
    return !!this.paciente();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const value = this.form.getRawValue() as PacienteInput;
    const current = this.paciente();

    if (current) {
      this.patientService.update(current.pacienteId, value).subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('Paciente actualizado correctamente.');
          this.saved.emit({ ...current, ...value });
          this.close.emit();
        },
        error: () => this.saving.set(false),
      });
    } else {
      this.patientService.create(value).subscribe({
        next: (res) => {
          this.saving.set(false);
          this.toast.success('Paciente registrado correctamente.');
          this.notificaciones.notificarPacienteRegistrado();
          this.saved.emit(res);
          this.close.emit();
        },
        error: () => this.saving.set(false),
      });
    }
  }
}
