import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { SecurityAdminService } from '../../../core/services/security-admin.service';
import { StaffService } from '../../../core/services/staff.service';
import { ToastService } from '../../../core/services/toast.service';
import { Rol, Usuario } from '../../../core/models/security.model';
import { Medico } from '../../../core/models/staff.model';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { SkeletonRowsComponent } from '../../../shared/ui/skeleton-rows/skeleton-rows.component';
import { InicialesPipe } from '../../../shared/pipes/iniciales.pipe';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';

/** Listado y gestión de Usuarios del sistema (MedicalAppointments.Security). */
@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent, PageHeaderComponent, PaginationComponent, EmptyStateComponent, SkeletonRowsComponent, InicialesPipe, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './usuarios-list.component.html',
})
export class UsuariosListComponent {
  private readonly securityAdmin = inject(SecurityAdminService);
  private readonly staffService = inject(StaffService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly roles = signal<Rol[]>([]);
  protected readonly medicos = signal<Medico[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly search = signal('');

  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<Usuario | null>(null);
  protected readonly saving = signal(false);

  private readonly search$ = new Subject<string>();

  protected readonly form = this.fb.nonNullable.group({
    nombreUsuario: ['', Validators.required],
    nombreCompleto: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    contrasena: [''],
    rolId: [0, Validators.required],
    medicoId: [null as number | null],
    activo: [true],
  });

  /** El rol "Médico" habilita el selector para vincular la cuenta a un registro de Staff. */
  protected readonly esRolMedico = computed(() => {
    const rolId = this.form.controls.rolId.value;
    return this.roles().find((r) => r.rolId === Number(rolId))?.nombre === 'Medico';
  });

  constructor() {
    this.securityAdmin.listRoles().subscribe((res) => this.roles.set(res));
    this.staffService.listDoctors({ page: 1, pageSize: 100 }).subscribe((res) => this.medicos.set(res.items));
    this.search$.pipe(debounceTime(350), distinctUntilChanged()).subscribe((term) => {
      this.search.set(term);
      this.page.set(1);
      this.load();
    });
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.securityAdmin.listUsuarios({ page: this.page(), pageSize: this.pageSize(), search: this.search() }).subscribe({
      next: (res) => {
        this.usuarios.set(res.items);
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
    this.form.reset({ rolId: this.roles()[0]?.rolId ?? 0, medicoId: null, activo: true });
    this.form.controls.contrasena.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.controls.contrasena.updateValueAndValidity();
    this.modalOpen.set(true);
  }

  protected openEdit(u: Usuario): void {
    this.editing.set(u);
    this.form.reset({ nombreUsuario: u.nombreUsuario, nombreCompleto: u.nombreCompleto, email: u.email, rolId: u.rolId, medicoId: u.medicoId ?? null, activo: u.activo, contrasena: '' });
    this.form.controls.contrasena.clearValidators();
    this.form.controls.contrasena.updateValueAndValidity();
    this.modalOpen.set(true);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const value = this.form.getRawValue();
    const payload = { ...value, medicoId: this.esRolMedico() ? value.medicoId : null };
    const current = this.editing();
    const request: Observable<unknown> = current
      ? this.securityAdmin.updateUsuario(current.usuarioId, payload)
      : this.securityAdmin.createUsuario(payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(current ? 'Usuario actualizado.' : 'Usuario creado.');
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  protected toggleEstado(u: Usuario): void {
    this.securityAdmin.setUsuarioEstado(u.usuarioId, !u.activo).subscribe(() => {
      this.toast.success(u.activo ? 'Usuario desactivado.' : 'Usuario activado.');
      this.load();
    });
  }

  protected formatFecha(fecha: string | null | undefined): string {
    if (!fecha) return 'Nunca';
    return fecha.slice(0, 16).replace('T', ' ');
  }

  protected medicoVinculado(u: Usuario): string | null {
    if (!u.medicoId) return null;
    const m = this.medicos().find((x) => x.medicoId === u.medicoId);
    return m ? `Dr(a). ${m.nombres} ${m.apellidos}` : null;
  }

  protected rolBadgeClass(rol: string): string {
    switch (rol) {
      case 'Administrador': return 'badge-purple';
      case 'Medico': return 'badge-info';
      default: return 'badge-warning';
    }
  }
}
