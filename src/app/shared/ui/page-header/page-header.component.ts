import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

/** Encabezado estándar de página: ícono + título + subtítulo + acciones proyectadas. */
@Component({
  selector: 'ui-page-header',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div class="title-block">
        <div class="title-icon"><ui-icon [name]="icon()" [size]="24" [strokeWidth]="2.1" /></div>
        <div>
          <h1>{{ title() }}</h1>
          @if (subtitle()) {
            <div class="subtitle">{{ subtitle() }}</div>
          }
        </div>
      </div>
      <div class="actions"><ng-content /></div>
    </div>
  `,
  styles: [`
    .page-head {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      flex-wrap: wrap; margin-bottom: 22px;
    }
    .title-block { display: flex; align-items: center; gap: 14px; }
    .title-icon {
      width: 46px; height: 46px; border-radius: var(--r-lg); flex: none;
      display: grid; place-items: center; color: var(--brand-600);
      background: var(--brand-50); border: 1px solid var(--brand-100);
    }
    [data-theme='dark'] .title-icon { background: rgba(9, 107, 224, .16); border-color: rgba(9, 107, 224, .3); }
    h1 { font-size: 24px; }
    .subtitle { color: var(--text-muted); font-size: 13.5px; margin-top: 3px; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; }
  `],
})
export class PageHeaderComponent {
  readonly icon = input('layers');
  readonly title = input('');
  readonly subtitle = input<string | undefined>(undefined);
}
