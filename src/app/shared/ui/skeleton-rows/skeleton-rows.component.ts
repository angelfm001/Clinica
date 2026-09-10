import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Filas de esqueleto (shimmer) mientras se resuelve una petición HTTP a una tabla. */
@Component({
  selector: 'ui-skeleton-rows',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (r of rowsArray(); track r) {
      <tr class="sk-row">
        @for (c of colsArray(); track c) {
          <td><div class="skeleton sk-bar"></div></td>
        }
      </tr>
    }
  `,
  styles: [`
    .sk-bar { height: 14px; width: 100%; max-width: 160px; }
    .sk-row td { padding: 15px 16px; }
  `],
})
export class SkeletonRowsComponent {
  readonly rows = input(5);
  readonly cols = input(5);

  protected rowsArray(): number[] { return Array.from({ length: this.rows() }, (_, i) => i); }
  protected colsArray(): number[] { return Array.from({ length: this.cols() }, (_, i) => i); }
}
