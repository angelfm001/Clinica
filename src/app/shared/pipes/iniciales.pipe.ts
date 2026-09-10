import { Pipe, PipeTransform } from '@angular/core';

/** Extrae las iniciales de un nombre completo para usarlas en un avatar. */
@Pipe({ name: 'iniciales', standalone: true })
export class InicialesPipe implements PipeTransform {
  transform(nombreCompleto: string | null | undefined): string {
    if (!nombreCompleto) return '—';
    const partes = nombreCompleto.trim().split(/\s+/);
    const primeras = [partes[0], partes[1]].filter(Boolean).map((p) => p[0]);
    return primeras.join('').toUpperCase() || '—';
  }
}
