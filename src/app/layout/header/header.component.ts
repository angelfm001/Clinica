import { ChangeDetectionStrategy, Component, HostListener, effect, inject, output, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, forkJoin } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { AppointmentService } from '../../core/services/appointment.service';
import { PatientService } from '../../core/services/patient.service';
import { NotificacionesService } from '../../core/services/notificaciones.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { InicialesPipe } from '../../shared/pipes/iniciales.pipe';

interface Recordatorio {
  tipo: 'cita' | 'paciente';
  icon: string;
  texto: string;
  detalle: string;
  onClick: () => void;
}

const HELP_FALLBACK = 'Sin información de ayuda registrada para esta pantalla.';
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Texto relativo tipo "Hace 10 min" a partir de una fecha ISO. */
function tiempoRelativo(fechaIso: string): string {
  const minutos = Math.max(0, Math.floor((Date.now() - new Date(fechaIso).getTime()) / 60000));
  if (minutos < 1) return 'Ahora mismo';
  if (minutos < 60) return `Hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} h`;
  return `Hace ${Math.floor(horas / 24)} d`;
}

/** Header superior: menú móvil, búsqueda global, tema, ayuda contextual, notificaciones y perfil. */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [IconComponent, InicialesPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly appointmentService = inject(AppointmentService);
  private readonly patientService = inject(PatientService);
  private readonly notificaciones = inject(NotificacionesService);

  readonly menuClick = output<void>();

  protected readonly profileOpen = signal(false);
  protected readonly notifOpen = signal(false);
  protected readonly helpOpen = signal(false);
  protected readonly helpText = signal(HELP_FALLBACK);
  protected readonly recordatorios = signal<Recordatorio[]>([]);
  /** IDs de pacientes cuya notificación ya se revisó; no deben reaparecer, pero un paciente nuevo posterior sí. */
  private readonly pacientesDescartados = new Set<number>();

  constructor() {
    // Recalcula al construir y cada vez que se registra un paciente en
    // cualquier pantalla (ver NotificacionesService), sin esperar a que el
    // usuario abra la campana para enterarse.
    effect(() => {
      this.notificaciones.pacienteRegistrado();
      this.cargarRecordatorios();
    });
    // El título de la pestaña ya cambia por ruta (ver `title:` en cada *.routes.ts);
    // aquí reaprovechamos `data.help` de la ruta activa para el popover de ayuda.
    // Se recalcula tanto al construir (ya con la navegación inicial resuelta,
    // pero con lectura defensiva por si algún nodo aún no tiene snapshot) como
    // en cada navegación posterior.
    this.refreshHelpText();
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.refreshHelpText());
  }

  private refreshHelpText(): void {
    try {
      let route: ActivatedRoute | null = this.activatedRoute.root;
      while (route?.firstChild) route = route.firstChild;
      const help = route?.snapshot?.data?.['help'] as string | undefined;
      this.helpText.set(help ?? HELP_FALLBACK);
    } catch {
      // La ruta activa puede no estar completamente resuelta en el instante
      // de esta lectura (p. ej. justo durante una redirección); nunca debe
      // romper el header por un simple texto de ayuda.
      this.helpText.set(HELP_FALLBACK);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      document.getElementById('global-search')?.focus();
    }
    if (e.key === 'Escape') {
      this.profileOpen.set(false);
      this.notifOpen.set(false);
      this.helpOpen.set(false);
    }
  }

  protected toggleProfile(): void {
    this.notifOpen.set(false);
    this.helpOpen.set(false);
    this.profileOpen.update((v) => !v);
  }

  protected toggleNotif(): void {
    this.profileOpen.set(false);
    this.helpOpen.set(false);
    const abriendo = !this.notifOpen();
    this.notifOpen.set(abriendo);
    if (abriendo) this.cargarRecordatorios();
  }

  /**
   * Recordatorios reales (no decorativos): citas `Programada` de mañana sin
   * confirmar y pacientes registrados hoy, ambos con navegación directa a la
   * pantalla donde se origina cada alerta.
   */
  private cargarRecordatorios(): void {
    const manana = iso(new Date(Date.now() + 86400000));
    const hoy = iso(new Date());

    forkJoin({
      citas: this.appointmentService.list({ desde: manana, hasta: manana, estado: 'Programada' }),
      pacientes: this.patientService.list({ page: 1, pageSize: 50 }),
    }).subscribe(({ citas, pacientes }) => {
      const porConfirmar: Recordatorio[] = citas.slice(0, 5).map((c) => ({
        tipo: 'cita',
        icon: 'calendar',
        texto: `Cita con ${c.pacienteNombre} sin confirmar (mañana ${c.hora})`,
        detalle: `${c.medicoNombre} · ${c.especialidadNombre ?? ''}`.trim(),
        onClick: () => {
          this.notifOpen.set(false);
          this.router.navigate(['/agenda'], { queryParams: { citaId: c.citaId } });
        },
      }));

      const nuevosPacientes = pacientes.items.filter(
        (p) => p.fechaRegistro.slice(0, 10) === hoy && !this.pacientesDescartados.has(p.pacienteId),
      );
      const idsMostrados = nuevosPacientes.map((p) => p.pacienteId);

      const nuevos: Recordatorio[] = nuevosPacientes.map((p) => ({
        tipo: 'paciente' as const,
        icon: 'userPlus',
        texto: `Nuevo paciente registrado: ${p.nombres} ${p.apellidos}`,
        detalle: tiempoRelativo(p.fechaRegistro),
        onClick: () => {
          this.notifOpen.set(false);
          // Al revisar un paciente nuevo se dan por vistas todas las
          // notificaciones de pacientes nuevos ya mostradas (no solo la
          // clicada); un paciente registrado después sí debe notificar.
          idsMostrados.forEach((id) => this.pacientesDescartados.add(id));
          this.recordatorios.update((rs) => rs.filter((r) => r.tipo !== 'paciente'));
          this.router.navigate(['/pacientes', p.pacienteId]);
        },
      }));

      this.recordatorios.set([...porConfirmar, ...nuevos]);
    });
  }

  protected toggleHelp(): void {
    this.profileOpen.set(false);
    this.notifOpen.set(false);
    this.helpOpen.update((v) => !v);
  }

  protected goProfile(): void {
    this.profileOpen.set(false);
    this.router.navigateByUrl('/perfil');
  }

  protected logout(): void {
    this.profileOpen.set(false);
    this.auth.logout();
  }
}
