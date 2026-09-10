import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

/** Paginación numérica reutilizable para cualquier listado paginado del backend. */
@Component({
  selector: 'ui-pagination',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagination">
      <span class="muted small">
        Mostrando {{ from() }} a {{ to() }} de {{ total() }} registro{{ total() === 1 ? '' : 's' }}
      </span>
      <div class="pages">
        <button class="page" [disabled]="page() <= 1" (click)="go(page() - 1)" aria-label="Anterior">
          <ui-icon name="chevronLeft" [size]="15" />
        </button>
        @for (p of pagesToShow(); track p) {
          @if (p === -1) {
            <span class="ellipsis">…</span>
          } @else {
            <button class="page" [class.current]="p === page()" (click)="go(p)">{{ p }}</button>
          }
        }
        <button class="page" [disabled]="page() >= totalPages()" (click)="go(page() + 1)" aria-label="Siguiente">
          <ui-icon name="chevronRight" [size]="15" />
        </button>
      </div>
      <label class="page-size">
        Registros por página
        <select class="select" [value]="pageSize()" (change)="onSizeChange($event)">
          <option [value]="10">10</option>
          <option [value]="25">25</option>
          <option [value]="50">50</option>
        </select>
      </label>
    </div>
  `,
  styles: [`
    .pagination {
      padding: 14px 18px; display: flex; align-items: center; justify-content: space-between;
      gap: 14px; flex-wrap: wrap; border-top: 1px solid var(--border-soft);
    }
    .pages { display: flex; gap: 5px; }
    .page {
      width: 32px; height: 32px; border: 1px solid var(--border-strong); background: var(--surface);
      border-radius: var(--r-sm); font-size: 12.5px; color: var(--text-soft);
      display: inline-grid; place-items: center; transition: all .15s ease;
    }
    .page:hover:not(:disabled) { border-color: var(--brand-400); color: var(--brand-700); }
    .page:disabled { opacity: .4; cursor: not-allowed; }
    .page.current { background: var(--brand-600); border-color: var(--brand-600); color: #fff; font-weight: 600; }
    .ellipsis { width: 32px; text-align: center; color: var(--text-muted); }
    .page-size { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-muted); }
    .page-size select { width: auto; padding: 6px 26px 6px 10px; font-size: 12.5px; }
  `],
})
export class PaginationComponent {
  readonly page = input(1);
  readonly pageSize = input(10);
  readonly total = input(0);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  protected readonly from = computed(() => (this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1));
  protected readonly to = computed(() => Math.min(this.total(), this.page() * this.pageSize()));

  protected pagesToShow(): number[] {
    const total = this.totalPages();
    const current = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set<number>([1, total, current, current - 1, current + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
    const withGaps: number[] = [];
    sorted.forEach((p, i) => {
      if (i > 0 && p - sorted[i - 1] > 1) withGaps.push(-1);
      withGaps.push(p);
    });
    return withGaps;
  }

  protected go(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.page()) this.pageChange.emit(page);
  }

  protected onSizeChange(event: Event): void {
    this.pageSizeChange.emit(Number((event.target as HTMLSelectElement).value));
  }
}
