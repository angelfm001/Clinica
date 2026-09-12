import { Injectable, signal } from '@angular/core';

/**
 * Bus mínimo para que acciones de otras pantallas (p. ej. registrar un
 * paciente) avisen al header que debe recalcular sus recordatorios, sin
 * esperar a que el usuario abra la campana manualmente.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly _pacienteRegistrado = signal(0);
  readonly pacienteRegistrado = this._pacienteRegistrado.asReadonly();

  notificarPacienteRegistrado(): void {
    this._pacienteRegistrado.update((v) => v + 1);
  }
}
