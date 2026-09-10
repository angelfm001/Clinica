import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

export type StatTone = 'brand' | 'success' | 'purple' | 'warning' | 'danger' | 'teal';

/** Tarjeta de métrica (KPI) usada en el resumen del dashboard. */
@Component({
  selector: 'ui-stat-card',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="metric">
      <div class="metric-icon" [class]="'tone-' + tone()"><ui-icon [name]="icon()" [size]="21" /></div>
      <div class="metric-body">
        <small>{{ label() }}</small>
        <div class="value-row">
          <strong>{{ value() }}</strong>
          @if (trend()) {
            <span class="trend" [class.down]="trendDown()">{{ trend() }}</span>
          }
        </div>
        @if (note()) { <div class="note">{{ note() }}</div> }
      </div>
    </div>
  `,
  styles: [`
    .metric { display: flex; align-items: center; gap: 14px; padding: 17px; }
    .metric-icon {
      width: 50px; height: 50px; border-radius: var(--r-lg); flex: none;
      display: grid; place-items: center;
    }
    .tone-brand   { background: var(--info-bg);    color: var(--info); }
    .tone-success { background: var(--success-bg); color: var(--success); }
    .tone-purple  { background: var(--purple-bg);  color: var(--purple); }
    .tone-warning { background: var(--warning-bg); color: var(--warning); }
    .tone-danger  { background: var(--danger-bg);  color: var(--danger); }
    .tone-teal    { background: var(--teal-bg);    color: var(--teal); }
    .metric-body small { color: var(--text-muted); display: block; margin-bottom: 3px; font-size: 12px; }
    .value-row { display: flex; align-items: baseline; gap: 8px; }
    strong { font-size: 23px; letter-spacing: -.02em; }
    .trend { color: var(--success); font-size: 11.5px; font-weight: 700; }
    .trend.down { color: var(--danger); }
    .note { color: var(--text-muted); font-size: 11px; margin-top: 2px; }
  `],
})
export class StatCardComponent {
  readonly icon = input('activity');
  readonly tone = input<StatTone>('brand');
  readonly label = input('');
  readonly value = input<string | number>('');
  readonly trend = input<string | undefined>(undefined);
  readonly trendDown = input(false);
  readonly note = input<string | undefined>(undefined);
}
