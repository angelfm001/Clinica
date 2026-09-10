import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { StaffService } from '../../../core/services/staff.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Consultorio } from '../../../core/models/staff.model';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';

/** Catálogo de Consultorios (espacios físicos de atención). */
@Component({
  selector: 'app-consultorios-list',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent, EmptyStateComponent, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './consultorios-list.component.html',
})
export class ConsultoriosListComponent {
  private readonly staffService = inject(StaffService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly consultorios = signal<Consultorio[]>([]);
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<Consultorio | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    ubicacion: [''],
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.staffService.listClinics().subscribe((res) => {
      this.consultorios.set(res);
      this.loading.set(false);
    });
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset();
    this.modalOpen.set(true);
  }

  protected openEdit(c: Consultorio): void {
    this.editing.set(c);
    this.form.reset({ nombre: c.nombre, ubicacion: c.ubicacion ?? '' });
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
      ? this.staffService.updateClinic(current.consultorioId, { ...value, activo: current.activo })
      : this.staffService.createClinic(value);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(current ? 'Consultorio actualizado.' : 'Consultorio creado.');
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  protected async toggleActivo(c: Consultorio): Promise<void> {
    if (c.activo) {
      const confirmed = await this.confirm.ask({ title: 'Desactivar consultorio', message: `¿Desactivar "${c.nombre}"?`, tone: 'danger', confirmLabel: 'Desactivar' });
      if (!confirmed) return;
      this.staffService.deactivateClinic(c.consultorioId).subscribe(() => { this.toast.success('Consultorio desactivado.'); this.load(); });
    } else {
      this.staffService.updateClinic(c.consultorioId, { activo: true }).subscribe(() => { this.toast.success('Consultorio activado.'); this.load(); });
    }
  }
}
