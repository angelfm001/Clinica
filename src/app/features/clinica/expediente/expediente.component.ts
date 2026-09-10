import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ClinicalCareService } from '../../../core/services/clinical-care.service';
import { PatientService } from '../../../core/services/patient.service';
import { Atencion, Prescripcion } from '../../../core/models/clinical-care.model';
import { Paciente } from '../../../core/models/patient.model';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { InicialesPipe } from '../../../shared/pipes/iniciales.pipe';
import { EdadPipe } from '../../../shared/pipes/edad.pipe';

/**
 * Expediente clínico de un paciente. Versión reducida: no existe un
 * "Expediente_Clínico" separado ni antecedentes/alergias/hábitos como
 * entidades propias — el historial se obtiene directamente de las
 * Atenciones registradas del paciente (ClinicalCare), más sus Prescripciones.
 */
@Component({
  selector: 'app-expediente',
  standalone: true,
  imports: [RouterLink, IconComponent, EmptyStateComponent, InicialesPipe, EdadPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './expediente.component.html',
  styleUrl: './expediente.component.css',
})
export class ExpedienteComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly clinicalCareService = inject(ClinicalCareService);
  private readonly patientService = inject(PatientService);

  protected readonly pacienteId = Number(this.route.snapshot.paramMap.get('pacienteId'));
  protected readonly loading = signal(true);
  protected readonly paciente = signal<Paciente | null>(null);
  protected readonly atenciones = signal<Atencion[]>([]);
  protected readonly prescripciones = signal<Prescripcion[]>([]);

  protected readonly atencionExpandida = signal<number | null>(null);
  protected readonly recetaExpandida = signal<number | null>(null);

  constructor() {
    this.patientService.getById(this.pacienteId).subscribe((p) => this.paciente.set(p));
    this.clinicalCareService.listByPaciente(this.pacienteId).subscribe((res) => this.prescripciones.set(res));
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.clinicalCareService.getAtencionesPaciente(this.pacienteId).subscribe({
      next: (res) => {
        this.atenciones.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected toggleAtencion(id: number): void {
    this.atencionExpandida.update((cur) => (cur === id ? null : id));
  }

  protected toggleReceta(id: number): void {
    this.recetaExpandida.update((cur) => (cur === id ? null : id));
  }

  protected imprimirPrescripcion(rx: Prescripcion): void {
    const p = this.paciente();
    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) return;
    const rows = rx.detalles.map((d) => `
      <tr>
        <td>${d.medicamentoNombre}</td>
        <td>${d.dosis}</td>
        <td>${d.frecuencia}</td>
        <td>${d.duracion}</td>
        <td>${d.viaAdministracion}</td>
      </tr>`).join('');
    w.document.write(`
      <html>
        <head>
          <title>Receta RX-${rx.prescripcionId}</title>
          <style>
            body{font-family:'Inter',Arial,sans-serif;color:#172033;padding:32px;line-height:1.5}
            h1{font-size:20px;margin:0 0 4px}
            .muted{color:#7b8799;font-size:12px}
            .header{border-bottom:2px solid #096be0;padding-bottom:12px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-start}
            table{width:100%;border-collapse:collapse;margin-top:14px;font-size:13px}
            th{text-align:left;background:#f1f5fa;padding:8px 10px;border-bottom:1px solid #e2e7ef;font-size:11px;letter-spacing:.03em;text-transform:uppercase;color:#4c5a72}
            td{padding:9px 10px;border-bottom:1px solid #edf0f4}
            .footer{margin-top:22px;border-top:1px solid #e2e7ef;padding-top:12px;font-size:11px;color:#7b8799}
            @media print { body{padding:20px} }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Citas Médicas · Receta</h1>
              <div class="muted">RX-${rx.prescripcionId} · ${new Date(rx.fecha).toLocaleString('es-SV')}</div>
              <div style="margin-top:8px"><strong>Paciente:</strong> ${p ? `${p.nombres} ${p.apellidos}` : rx.pacienteNombre} ${p ? `· ${p.numeroDocumento}` : ''}</div>
              <div><strong>Médico:</strong> ${rx.medicoNombre ?? ''}</div>
              ${rx.indicacionesGenerales ? `<div style="margin-top:6px"><strong>Indicaciones:</strong> ${rx.indicacionesGenerales}</div>` : ''}
            </div>
            <div style="text-align:right">
              <div style="font-weight:700;color:#096be0;font-size:13px">Sistema de Gestión</div>
              <div class="muted">${p?.codigoPaciente ?? ''}</div>
            </div>
          </div>
          <table>
            <thead><tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Duración</th><th>Vía</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="footer">Impreso el ${new Date().toLocaleString('es-SV')} · Este documento es válido como receta médica. · Citas Médicas</div>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  }
}
