import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { StaffService } from '../../../core/services/staff.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { Consultorio, DIAS_SEMANA, DiaSemana, HorarioMedico, Medico } from '../../../core/models/staff.model';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { HorarioFormModalComponent } from './horario-form-modal.component';

interface Bloque {
  horario: HorarioMedico;
  top: number;
  height: number;
}

const START_HOUR = 7;
const END_HOUR = 19;

/** Vista de calendario semanal (grilla 7×franjas) con los horarios configurados. */
@Component({
  selector: 'app-horarios',
  standalone: true,
  imports: [RouterLink, IconComponent, HorarioFormModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './horarios.component.html',
  styleUrl: './horarios.component.css',
})
export class HorariosComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly staffService = inject(StaffService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly medicoId = Number(this.route.snapshot.paramMap.get('id'));
  protected readonly medico = signal<Medico | null>(null);
  protected readonly consultorios = signal<Consultorio[]>([]);
  protected readonly horarios = signal<HorarioMedico[]>([]);

  protected readonly dias = DIAS_SEMANA;
  protected readonly horas = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<HorarioMedico | null>(null);

  constructor() {
    this.staffService.getDoctor(this.medicoId).subscribe((m) => this.medico.set(m));
    this.staffService.listClinics().subscribe((res) => this.consultorios.set(res));
    this.load();
  }

  private load(): void {
    this.staffService.listSchedules(this.medicoId).subscribe((res) => this.horarios.set(res));
  }

  protected bloquesDelDia(dia: DiaSemana): Bloque[] {
    const totalMinutes = (END_HOUR - START_HOUR) * 60;
    return this.horarios()
      .filter((h) => h.diaSemana === dia)
      .map((h) => {
        const [hi, mi] = h.horaInicio.split(':').map(Number);
        const [hf, mf] = h.horaFin.split(':').map(Number);
        const startMin = (hi - START_HOUR) * 60 + mi;
        const endMin = (hf - START_HOUR) * 60 + mf;
        return {
          horario: h,
          top: (startMin / totalMinutes) * 100,
          height: ((endMin - startMin) / totalMinutes) * 100,
        };
      });
  }

  protected nombreConsultorio(id: number): string {
    return this.consultorios().find((c) => c.consultorioId === id)?.nombre ?? '—';
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.modalOpen.set(true);
  }

  protected openEdit(h: HorarioMedico): void {
    this.editing.set(h);
    this.modalOpen.set(true);
  }

  protected onSaved(): void {
    this.load();
  }

  protected async eliminar(h: HorarioMedico): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Eliminar horario',
      message: `¿Eliminar el bloque de ${h.horaInicio} a ${h.horaFin}?`,
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.staffService.deleteSchedule(this.medicoId, h.horarioId).subscribe(() => {
      this.toast.success('Horario eliminado.');
      this.load();
    });
  }
}
