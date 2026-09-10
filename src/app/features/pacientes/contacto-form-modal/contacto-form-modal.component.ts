import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { PatientService } from '../../../core/services/patient.service';
import { ToastService } from '../../../core/services/toast.service';
import { ContactoEmergencia, PARENTESCOS } from '../../../core/models/patient.model';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';

/** Formulario compacto de Contacto de Emergencia, en modal. */
@Component({
  selector: 'app-contacto-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacto-form-modal.component.html',
})
export class ContactoFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly patientService = inject(PatientService);
  private readonly toast = inject(ToastService);

  readonly open = input(false);
  readonly pacienteId = input.required<number>();
  readonly contacto = input<ContactoEmergencia | null>(null);
  readonly close = output<void>();
  readonly saved = output<void>();

  protected readonly saving = signal(false);
  protected readonly parentescos = PARENTESCOS;

  protected readonly form = this.fb.nonNullable.group({
    nombreCompleto: ['', Validators.required],
    parentesco: ['', Validators.required],
    telefono: ['', Validators.required],
    telefonoSecundario: [''],
    email: ['', Validators.email],
    prioridad: [1, [Validators.required, Validators.min(1)]],
    activo: [true],
  });

  constructor() {
    effect(() => {
      const c = this.contacto();
      if (c) {
        this.form.reset({
          nombreCompleto: c.nombreCompleto, parentesco: c.parentesco ?? '', telefono: c.telefono,
          telefonoSecundario: c.telefonoSecundario ?? '', email: c.email ?? '', prioridad: c.prioridad, activo: c.activo,
        });
      } else if (this.open()) {
        this.form.reset({ prioridad: 1, activo: true });
      }
    });
  }

  protected get isEdit(): boolean {
    return !!this.contacto();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const value = this.form.getRawValue();
    const current = this.contacto();
    const request: Observable<unknown> = current
      ? this.patientService.updateContact(this.pacienteId(), current.contactoEmergenciaId, value)
      : this.patientService.createContact(this.pacienteId(), value);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(current ? 'Contacto actualizado.' : 'Contacto agregado.');
        this.saved.emit();
        this.close.emit();
      },
      error: () => this.saving.set(false),
    });
  }
}
