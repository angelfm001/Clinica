import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { PatientService } from '../../../core/services/patient.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { AuthService } from '../../../core/services/auth.service';
import { ContactoEmergencia, Paciente } from '../../../core/models/patient.model';
import { Cita } from '../../../core/models/appointment.model';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { EstadoCitaBadgeComponent } from '../../../shared/ui/estado-cita-badge/estado-cita-badge.component';
import { EdadPipe } from '../../../shared/pipes/edad.pipe';
import { InicialesPipe } from '../../../shared/pipes/iniciales.pipe';
import { PacienteFormModalComponent } from '../paciente-form-modal/paciente-form-modal.component';
import { ContactoFormModalComponent } from '../contacto-form-modal/contacto-form-modal.component';

type Tab = 'general' | 'contactos' | 'citas';

/** Detalle de un paciente: información, contactos de emergencia, citas y acceso al expediente clínico. */
@Component({
  selector: 'app-paciente-detalle',
  standalone: true,
  imports: [
    RouterLink, IconComponent, EmptyStateComponent, EstadoCitaBadgeComponent, EdadPipe, InicialesPipe,
    PacienteFormModalComponent, ContactoFormModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './paciente-detalle.component.html',
  styleUrl: './paciente-detalle.component.css',
})
export class PacienteDetalleComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly patientService = inject(PatientService);
  private readonly appointmentService = inject(AppointmentService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly paciente = signal<Paciente | null>(null);
  protected readonly contactos = signal<ContactoEmergencia[]>([]);
  protected readonly citas = signal<Cita[]>([]);
  protected readonly loadingCitas = signal(true);
  protected readonly tab = signal<Tab>('general');

  protected readonly editModalOpen = signal(false);
  protected readonly contactoModalOpen = signal(false);
  protected readonly editingContacto = signal<ContactoEmergencia | null>(null);

  private readonly pacienteId = Number(this.route.snapshot.paramMap.get('id'));

  /** El expediente lo edita el Médico; el Administrador lo consulta en modo lectura. */
  protected readonly puedeVerExpediente = this.auth.hasRol('Medico', 'Administrador');

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.patientService.getById(this.pacienteId).subscribe({
      next: (p) => {
        this.paciente.set(p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.loadContactos();
    this.loadCitas();
  }

  private loadCitas(): void {
    this.loadingCitas.set(true);
    this.appointmentService.list({ pacienteId: this.pacienteId }).subscribe({
      // Las más recientes primero.
      next: (res) => {
        this.citas.set([...res].reverse());
        this.loadingCitas.set(false);
      },
      error: () => this.loadingCitas.set(false),
    });
  }

  protected loadContactos(): void {
    this.patientService.listContacts(this.pacienteId).subscribe((res) => this.contactos.set(res));
  }

  protected setTab(t: Tab): void {
    this.tab.set(t);
  }

  protected openEdit(): void {
    this.editModalOpen.set(true);
  }

  protected onSaved(): void {
    this.load();
  }

  protected openNewContacto(): void {
    this.editingContacto.set(null);
    this.contactoModalOpen.set(true);
  }

  protected openEditContacto(c: ContactoEmergencia): void {
    this.editingContacto.set(c);
    this.contactoModalOpen.set(true);
  }

  protected async deleteContacto(c: ContactoEmergencia): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Eliminar contacto',
      message: `¿Eliminar a ${c.nombreCompleto} de los contactos de emergencia?`,
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.patientService.deleteContact(this.pacienteId, c.contactoEmergenciaId).subscribe(() => {
      this.toast.success('Contacto eliminado.');
      this.loadContactos();
    });
  }

  protected async toggleActivo(): Promise<void> {
    const p = this.paciente();
    if (!p) return;
    if (p.activo) {
      const confirmed = await this.confirm.ask({
        title: 'Desactivar paciente',
        message: `¿Desactivar a ${p.nombres} ${p.apellidos}?`,
        confirmLabel: 'Desactivar',
        tone: 'danger',
      });
      if (!confirmed) return;
      this.patientService.deactivate(p.pacienteId).subscribe(() => {
        this.toast.success('Paciente desactivado.');
        this.load();
      });
    }
  }

  protected goExpediente(): void {
    this.router.navigate(['/clinica/expediente', this.pacienteId]);
  }
}
