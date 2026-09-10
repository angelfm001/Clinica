import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { StaffService } from '../../../core/services/staff.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Especialidad } from '../../../core/models/staff.model';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';

/** Catálogo de Especialidades médicas (MedicalAppointments.Staff). */
@Component({
  selector: 'app-especialidades-list',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent, EmptyStateComponent, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './especialidades-list.component.html',
})
export class EspecialidadesListComponent {
  private readonly staffService = inject(StaffService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly especialidades = signal<Especialidad[]>([]);
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<Especialidad | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.staffService.listSpecialties().subscribe((res) => {
      this.especialidades.set(res);
      this.loading.set(false);
    });
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset();
    this.modalOpen.set(true);
  }

  protected openEdit(e: Especialidad): void {
    this.editing.set(e);
    this.form.reset({ nombre: e.nombre });
    this.modalOpen.set(true);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const value = this.form.getRawValue();
    const current = this.editing();
    const request: Observable<unknown> = current
      ? this.staffService.updateSpecialty(current.especialidadId, { ...value, activo: current.activo })
      : this.staffService.createSpecialty(value);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(current ? 'Especialidad actualizada.' : 'Especialidad creada.');
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  protected async toggleActivo(e: Especialidad): Promise<void> {
    if (e.activo) {
      const confirmed = await this.confirm.ask({ title: 'Desactivar especialidad', message: `¿Desactivar "${e.nombre}"?`, tone: 'danger', confirmLabel: 'Desactivar' });
      if (!confirmed) return;
      this.staffService.deactivateSpecialty(e.especialidadId).subscribe(() => { this.toast.success('Especialidad desactivada.'); this.load(); });
    } else {
      this.staffService.updateSpecialty(e.especialidadId, { activo: true }).subscribe(() => { this.toast.success('Especialidad activada.'); this.load(); });
    }
  }
}
