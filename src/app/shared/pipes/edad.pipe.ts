import { Pipe, PipeTransform } from '@angular/core';

/** Calcula la edad en años a partir de una fecha de nacimiento ISO ('yyyy-MM-dd'). */
@Pipe({ name: 'edad', standalone: true })
export class EdadPipe implements PipeTransform {
  transform(fechaNacimiento: string | null | undefined): string {
    if (!fechaNacimiento) return '—';
    const nacimiento = new Date(fechaNacimiento);
    if (Number.isNaN(nacimiento.getTime())) return '—';
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return `${edad} años`;
  }
}
