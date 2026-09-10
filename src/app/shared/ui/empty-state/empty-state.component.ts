import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

/** Estado vacío consistente para tablas/listas sin resultados. */
@Component({
  selector: 'ui-empty-state',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty">
      <div class="empty-icon"><ui-icon [name]="icon()" [size]="26" /></div>
      <p class="title">{{ title() }}</p>
      @if (subtitle()) { <p class="subtitle">{{ subtitle() }}</p> }
      <ng-content />
    </div>
  `,
  styles: [`
    .empty { text-align: center; padding: 48px 24px; }
    .empty-icon {
      width: 58px; height: 58px; border-radius: 50%; margin: 0 auto 14px;
      display: grid; place-items: center; background: var(--surface-3); color: var(--text-muted);
    }
    .title { font-weight: 600; font-size: 14.5px; }
    .subtitle { color: var(--text-muted); font-size: 13px; margin-top: 4px; }
  `],
})
export class EmptyStateComponent {
  readonly icon = input('search');
  readonly title = input('Sin resultados');
  readonly subtitle = input<string | undefined>(undefined);
}
