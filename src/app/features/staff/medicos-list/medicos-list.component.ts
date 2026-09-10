import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { StaffService } from '../../../core/services/staff.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Especialidad, Medico } from '../../../core/models/staff.model';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { SkeletonRowsComponent } from '../../../shared/ui/skeleton-rows/skeleton-rows.component';
import { InicialesPipe } from '../../../shared/pipes/iniciales.pipe';
import { MedicoFormModalComponent } from '../medico-form-modal/medico-form-modal.component';

/** Listado de médicos con especialidades (chips) y acceso a su gestión de horarios. */
@Component({
  selector: 'app-medicos-list',
  standalone: true,
  imports: [IconComponent, PaginationComponent, EmptyStateComponent, SkeletonRowsComponent, InicialesPipe, MedicoFormModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './medicos-list.component.html',
})
export class MedicosListComponent {
  private readonly staffService = inject(StaffService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly medicos = signal<Medico[]>([]);
  protected readonly especialidades = signal<Especialidad[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly search = signal('');

  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<Medico | null>(null);

  private readonly search$ = new Subject<string>();

  constructor() {
    this.staffService.listSpecialties().subscribe((res) => this.especialidades.set(res));
    this.search$.pipe(debounceTime(350), distinctUntilChanged()).subscribe((term) => {
      this.search.set(term);
      this.page.set(1);
      this.load();
    });
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.staffService.listDoctors({ page: this.page(), pageSize: this.pageSize(), search: this.search() }).subscribe({
      next: (res) => {
        this.medicos.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected onSearchInput(value: string): void {
    this.search$.next(value);
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
    this.modalOpen.set(true);
  }

  protected openEdit(m: Medico): void {
    this.editing.set(m);
    this.modalOpen.set(true);
  }

  protected onSaved(): void {
    this.load();
  }

  protected goHorarios(m: Medico): void {
    this.router.navigate(['/staff/medicos', m.medicoId, 'horarios']);
  }

  protected async deactivate(m: Medico): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Desactivar médico',
      message: `¿Desactivar a Dr(a). ${m.nombres} ${m.apellidos}?`,
      confirmLabel: 'Desactivar',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.staffService.deactivateDoctor(m.medicoId).subscribe(() => {
      this.toast.success('Médico desactivado.');
      this.load();
    });
  }
}
