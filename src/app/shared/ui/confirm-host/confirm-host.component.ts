import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ConfirmService } from '../../../core/services/confirm.service';
import { IconComponent } from '../icon/icon.component';

/** Host único del `ConfirmService`, montado en `AppComponent`. */
@Component({
  selector: 'app-confirm-host',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (confirm.state(); as s) {
      <div class="backdrop no-print" (click)="confirm.resolve(false)">
        <div class="dialog" [class.danger]="s.tone === 'danger'" (click)="$event.stopPropagation()">
          <div class="dialog-icon" [class.danger]="s.tone === 'danger'">
            <ui-icon [name]="s.tone === 'danger' ? 'alertTriangle' : 'info'" [size]="22" />
          </div>
          <h3>{{ s.title }}</h3>
          <p>{{ s.message }}</p>
          <div class="actions">
            <button class="btn btn-secondary" (click)="confirm.resolve(false)">{{ s.cancelLabel ?? 'Cancelar' }}</button>
            <button
              class="btn"
              [class.btn-danger]="s.tone === 'danger'"
              [class.btn-primary]="s.tone !== 'danger'"
              (click)="confirm.resolve(true)"
            >{{ s.confirmLabel ?? 'Confirmar' }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .backdrop {
      position: fixed; inset: 0; background: rgba(10, 20, 38, .48);
      display: grid; place-items: center; z-index: 300; padding: 20px;
      animation: fade-in .15s ease both;
    }
    .dialog {
      width: min(380px, 100%); background: var(--surface); border-radius: var(--r-xl);
      box-shadow: var(--shadow-lg); padding: 26px; text-align: center;
      animation: pop .18s ease both;
    }
    .dialog-icon {
      width: 52px; height: 52px; border-radius: 50%; margin: 0 auto 14px;
      display: grid; place-items: center; background: var(--brand-50); color: var(--brand-600);
    }
    .dialog-icon.danger { background: var(--danger-bg); color: var(--danger); }
    h3 { font-size: 16.5px; margin-bottom: 8px; }
    p { color: var(--text-soft); font-size: 13.5px; line-height: 1.55; }
    .actions { display: flex; gap: 10px; margin-top: 22px; }
    .actions .btn { flex: 1; }
  `],
})
export class ConfirmHostComponent {
  protected readonly confirm = inject(ConfirmService);
}
