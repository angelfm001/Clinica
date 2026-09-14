import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { PatientService } from '../../../core/services/patient.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Paciente, Sexo, TipoDocumento } from '../../../core/models/patient.model';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { SkeletonRowsComponent } from '../../../shared/ui/skeleton-rows/skeleton-rows.component';
import { EdadPipe } from '../../../shared/pipes/edad.pipe';
import { InicialesPipe } from '../../../shared/pipes/iniciales.pipe';
import { PacienteFormModalComponent } from '../paciente-form-modal/paciente-form-modal.component';

/** Listado paginado y buscable de pacientes (MedicalAppointments.Patient). */
@Component({
  selector: 'app-pacientes-list',
  standalone: true,
  imports: [
    IconComponent, PageHeaderComponent, PaginationComponent, EmptyStateComponent,
    SkeletonRowsComponent, EdadPipe, InicialesPipe, PacienteFormModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pacientes-list.component.html',
  styleUrl: './pacientes-list.component.css',
})
export class PacientesListComponent {
  private readonly patientService = inject(PatientService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(true);
  protected readonly pacientes = signal<Paciente[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly search = signal('');

  protected readonly filtrosAbiertos = signal(false);
  protected readonly filtroActivo = signal<'todos' | 'true' | 'false'>('todos');
  protected readonly filtroSexo = signal<Sexo | ''>('');
  protected readonly filtroTipoDocumento = signal<TipoDocumento | ''>('');
  protected readonly filtrosActivos = computed(
    () => this.filtroActivo() !== 'todos' || !!this.filtroSexo() || !!this.filtroTipoDocumento(),
  );

  protected readonly modalOpen = signal(false);
  protected readonly editingPaciente = signal<Paciente | null>(null);

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(debounceTime(350), distinctUntilChanged()).subscribe((term) => {
      this.search.set(term);
      this.page.set(1);
      this.load();
    });
    this.load();

    if (this.route.snapshot.queryParamMap.get('nuevo')) {
      this.openCreate();
    }
  }

  private load(): void {
    this.loading.set(true);
    this.patientService.list({
      page: this.page(),
      pageSize: this.pageSize(),
      search: this.search(),
      activo: this.filtroActivo() === 'todos' ? undefined : this.filtroActivo() === 'true',
      sexo: this.filtroSexo() || undefined,
      tipoDocumento: this.filtroTipoDocumento() || undefined,
    }).subscribe({
      next: (res) => {
        this.pacientes.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
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
    this.filtroSexo.set('');
    this.filtroTipoDocumento.set('');
    this.onFiltroChange();
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
    this.editingPaciente.set(null);
    this.modalOpen.set(true);
  }

  protected openEdit(paciente: Paciente, event?: Event): void {
    event?.stopPropagation();
    this.editingPaciente.set(paciente);
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  protected onSaved(): void {
    this.load();
  }

  protected goToDetail(paciente: Paciente): void {
    this.router.navigate(['/pacientes', paciente.pacienteId]);
  }

  protected async deactivate(paciente: Paciente, event: Event): Promise<void> {
    event.stopPropagation();
    const confirmed = await this.confirm.ask({
      title: 'Desactivar paciente',
      message: `¿Desactivar a ${paciente.nombres} ${paciente.apellidos}? Podrás reactivarlo más adelante editando su ficha.`,
      confirmLabel: 'Desactivar',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.patientService.deactivate(paciente.pacienteId).subscribe(() => {
      this.toast.success('Paciente desactivado.');
      this.load();
    });
  }

  protected exportCsv(): void {
    const rows = [
      ['Paciente', 'Documento', 'Teléfono', 'Fecha nacimiento', 'Estado'],
      ...this.pacientes().map((p) => [
        `${p.nombres} ${p.apellidos}`, `${p.tipoDocumento} ${p.numeroDocumento}`,
        p.telefono ?? '', p.fechaNacimiento, p.activo ? 'Activo' : 'Inactivo',
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pacientes.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.toast.info('Exportación generada.');
  }
}
