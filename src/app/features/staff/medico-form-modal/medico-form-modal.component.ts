import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { StaffService } from '../../../core/services/staff.service';
import { ToastService } from '../../../core/services/toast.service';
import { Especialidad, Medico } from '../../../core/models/staff.model';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';

/** Alta/edición de Médico. Una sola especialidad principal por médico (sin tabla N a N). */
@Component({
  selector: 'app-medico-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './medico-form-modal.component.html',
})
export class MedicoFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly staffService = inject(StaffService);
  private readonly toast = inject(ToastService);

  readonly open = input(false);
  readonly medico = input<Medico | null>(null);
  readonly especialidades = input<Especialidad[]>([]);
  readonly close = output<void>();
  readonly saved = output<void>();

  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    licencia: ['', Validators.required],
    especialidadId: [0, [Validators.required, Validators.min(1)]],
    telefono: [''],
    email: ['', Validators.email],
    activo: [true],
  });

  constructor() {
    effect(() => {
      const m = this.medico();
      if (m) {
        this.form.reset({
          nombres: m.nombres, apellidos: m.apellidos, licencia: m.licencia, especialidadId: m.especialidadId,
          telefono: m.telefono ?? '', email: m.email ?? '', activo: m.activo,
        });
      } else if (this.open()) {
        this.form.reset({ activo: true, especialidadId: 0 });
      }
    });
  }

  protected get isEdit(): boolean {
    return !!this.medico();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const value = this.form.getRawValue();
    const current = this.medico();
    const request: Observable<unknown> = current
      ? this.staffService.updateDoctor(current.medicoId, value)
      : this.staffService.createDoctor(value);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(current ? 'Médico actualizado.' : 'Médico registrado.');
        this.saved.emit();
        this.close.emit();
      },
      error: () => this.saving.set(false),
    });
  }
}
