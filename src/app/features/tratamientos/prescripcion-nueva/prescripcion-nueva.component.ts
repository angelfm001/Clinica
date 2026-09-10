import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ClinicalCareService } from '../../../core/services/clinical-care.service';
import { ToastService } from '../../../core/services/toast.service';
import { Atencion, Medicamento, PrescripcionDetalle, VIAS_ADMINISTRACION, ViaAdministracion } from '../../../core/models/clinical-care.model';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';

interface FilaDetalle extends PrescripcionDetalle {
  query: string;
  sugerencias: Medicamento[];
}

/**
 * Nueva Prescripción: encabezado heredado de la atención (el motivo de
 * consulta vive en la Cita) + tabla editable de medicamentos con
 * Dosis/Frecuencia/Duración/Vía, tal como define PrescripcionDetalle.
 */
@Component({
  selector: 'app-prescripcion-nueva',
  standalone: true,
  imports: [IconComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prescripcion-nueva.component.html',
  styleUrl: './prescripcion-nueva.component.css',
})
export class PrescripcionNuevaComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clinicalCareService = inject(ClinicalCareService);
  private readonly toast = inject(ToastService);

  protected readonly atencionId = Number(this.route.snapshot.queryParamMap.get('atencionId'));
  protected readonly loading = signal(true);
  protected readonly atencion = signal<Atencion | null>(null);
  protected readonly indicacionesGenerales = signal('');
  protected readonly filas = signal<FilaDetalle[]>([]);
  protected readonly saving = signal(false);
  protected readonly vias: ViaAdministracion[] = VIAS_ADMINISTRACION;

  constructor() {
    if (!this.atencionId) {
      this.loading.set(false);
      return;
    }
    this.clinicalCareService.getAtencion(this.atencionId).subscribe({
      next: (a) => {
        this.atencion.set(a);
        this.loading.set(false);
        this.agregarFila();
      },
      error: () => this.loading.set(false),
    });
  }

  protected agregarFila(): void {
    this.filas.update((list) => [...list, this.filaVacia()]);
  }

  private filaVacia(): FilaDetalle {
    return { medicamentoId: 0, dosis: '', frecuencia: '', duracion: '', viaAdministracion: 'Oral', query: '', sugerencias: [] };
  }

  protected eliminarFila(index: number): void {
    this.filas.update((list) => list.filter((_, i) => i !== index));
  }

  protected buscarMedicamento(index: number, term: string): void {
    this.filas.update((list) => list.map((f, i) => (i === index ? { ...f, query: term, medicamentoId: 0 } : f)));
    if (term.trim().length < 2) return;
    this.clinicalCareService.listMedicamentos({ page: 1, pageSize: 6, search: term }).subscribe((res) => {
      this.filas.update((list) => list.map((f, i) => (i === index ? { ...f, sugerencias: res.items } : f)));
    });
  }

  protected seleccionarMedicamento(index: number, m: Medicamento): void {
    this.filas.update((list) => list.map((f, i) => (i === index ? { ...f, medicamentoId: m.medicamentoId, query: m.nombre, sugerencias: [] } : f)));
  }

  protected updateFila(index: number, field: keyof FilaDetalle, value: unknown): void {
    this.filas.update((list) => list.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
  }

  protected get puedeGuardar(): boolean {
    return this.filas().length > 0 && this.filas().every((f) => f.medicamentoId && f.dosis && f.frecuencia && f.duracion);
  }

  protected guardar(): void {
    const a = this.atencion();
    if (!a || !this.puedeGuardar) {
      this.toast.error('Completa todos los campos de cada medicamento antes de guardar.');
      return;
    }
    this.saving.set(true);
    const detalles: PrescripcionDetalle[] = this.filas().map(({ query, sugerencias, ...rest }) => rest);
    this.clinicalCareService.createPrescripcion({
      atencionId: a.atencionId, pacienteId: a.pacienteId,
      indicacionesGenerales: this.indicacionesGenerales() || null, detalles,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Prescripción guardada correctamente.');
        this.router.navigate(['/clinica/atencion', a.citaId]);
      },
      error: () => this.saving.set(false),
    });
  }
}
