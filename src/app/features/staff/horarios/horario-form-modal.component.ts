import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { StaffService } from '../../../core/services/staff.service';
import { ToastService } from '../../../core/services/toast.service';
import { Consultorio, DIAS_SEMANA, DiaSemana, HorarioMedico } from '../../../core/models/staff.model';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';

/** Alta/edición de un bloque de horario semanal de un médico. */
@Component({
  selector: 'app-horario-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './horario-form-modal.component.html',
})
export class HorarioFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly staffService = inject(StaffService);
  private readonly toast = inject(ToastService);

  readonly open = input(false);
  readonly medicoId = input.required<number>();
  readonly consultorios = input<Consultorio[]>([]);
  readonly horario = input<HorarioMedico | null>(null);
  readonly close = output<void>();
  readonly saved = output<void>();

  protected readonly saving = signal(false);
  protected readonly dias = DIAS_SEMANA;

  protected readonly form = this.fb.nonNullable.group({
    diaSemana: [1, Validators.required],
    horaInicio: ['08:00', Validators.required],
    horaFin: ['12:00', Validators.required],
    consultorioId: [0, Validators.required],
  });

  constructor() {
    effect(() => {
      const h = this.horario();
      if (h) {
        this.form.reset({ diaSemana: h.diaSemana, horaInicio: h.horaInicio, horaFin: h.horaFin, consultorioId: h.consultorioId });
      } else if (this.open()) {
        this.form.reset({ diaSemana: 1, horaInicio: '08:00', horaFin: '12:00', consultorioId: this.consultorios()[0]?.consultorioId ?? 0 });
      }
    });
  }

  protected get isEdit(): boolean {
    return !!this.horario();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    if (value.horaFin <= value.horaInicio) {
      this.toast.error('La hora fin debe ser posterior a la hora de inicio.');
      return;
    }
    this.saving.set(true);
    const payload = { ...value, diaSemana: value.diaSemana as DiaSemana, medicoId: this.medicoId(), activo: true };
    const current = this.horario();
    const request: Observable<unknown> = current
      ? this.staffService.updateSchedule(this.medicoId(), current.horarioId, payload)
      : this.staffService.createSchedule(this.medicoId(), payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(current ? 'Horario actualizado.' : 'Horario agregado.');
        this.saved.emit();
        this.close.emit();
      },
      error: () => this.saving.set(false),
    });
  }
}
