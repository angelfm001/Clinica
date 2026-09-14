import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { ClinicalCareService } from '../../../core/services/clinical-care.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Medicamento } from '../../../core/models/clinical-care.model';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { SkeletonRowsComponent } from '../../../shared/ui/skeleton-rows/skeleton-rows.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';

/** Catálogo de Medicamentos (MedicalAppointments.ClinicalCare). */
@Component({
  selector: 'app-medicamentos-list',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent, PageHeaderComponent, PaginationComponent, EmptyStateComponent, SkeletonRowsComponent, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './medicamentos-list.component.html',
})
export class MedicamentosListComponent {
  private readonly clinicalCareService = inject(ClinicalCareService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly medicamentos = signal<Medicamento[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly search = signal('');

  protected readonly filtrosAbiertos = signal(false);
  protected readonly filtroActivo = signal<'todos' | 'true' | 'false'>('todos');
  protected readonly filtrosActivos = computed(() => this.filtroActivo() !== 'todos');

  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<Medicamento | null>(null);
  protected readonly saving = signal(false);

  private readonly search$ = new Subject<string>();

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    principioActivo: ['', Validators.required],
    presentacion: ['', Validators.required],
    concentracion: ['', Validators.required],
  });

  constructor() {
    this.search$.pipe(debounceTime(350), distinctUntilChanged()).subscribe((term) => {
      this.search.set(term);
      this.page.set(1);
      this.load();
    });
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.clinicalCareService.listMedicamentos({
      page: this.page(),
      pageSize: this.pageSize(),
      search: this.search(),
      activo: this.filtroActivo() === 'todos' ? undefined : this.filtroActivo() === 'true',
    }).subscribe({
      next: (res) => {
        this.medicamentos.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected onSearchInput(value: string): void {
    this.search$.next(value);
  }

  protected toggleFiltros(): void {
    this.filtrosAbiertos.update((v) => !v);
  }

  protected onFiltroChange(): void {
    this.page.set(1);
    this.load();
  }

  protected limpiarFiltros(): void {
    this.filtroActivo.set('todos');
    this.onFiltroChange();
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
    this.load();
  }

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.load();
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset();
    this.modalOpen.set(true);
  }

  protected openEdit(m: Medicamento): void {
    this.editing.set(m);
    this.form.reset({ nombre: m.nombre, principioActivo: m.principioActivo, presentacion: m.presentacion, concentracion: m.concentracion });
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
      ? this.clinicalCareService.updateMedicamento(current.medicamentoId, { ...value, activo: current.activo })
      : this.clinicalCareService.createMedicamento({ ...value, activo: true });
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(current ? 'Medicamento actualizado.' : 'Medicamento agregado al catálogo.');
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  protected async deactivate(m: Medicamento): Promise<void> {
    const confirmed = await this.confirm.ask({ title: 'Desactivar medicamento', message: `¿Desactivar "${m.nombre}" del catálogo?`, tone: 'danger', confirmLabel: 'Desactivar' });
    if (!confirmed) return;
    this.clinicalCareService.deactivateMedicamento(m.medicamentoId).subscribe(() => {
      this.toast.success('Medicamento desactivado.');
      this.load();
    });
  }
}
