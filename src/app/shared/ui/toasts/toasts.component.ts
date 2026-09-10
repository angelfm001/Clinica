import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../icon/icon.component';

const ICON_BY_TYPE: Record<string, string> = {
  success: 'checkCircle', error: 'alertCircle', warning: 'alertTriangle', info: 'info',
};

/** Contenedor global de notificaciones, montado una vez en `AppComponent`. */
@Component({
  selector: 'app-toasts',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-stack no-print">
      @for (t of toasts.toasts(); track t.id) {
        <div class="toast" [class]="'toast-' + t.type">
          <ui-icon [name]="iconFor(t.type)" [size]="19" />
          <span class="toast-msg">{{ t.message }}</span>
          <button class="toast-close" (click)="toasts.dismiss(t.id)" aria-label="Cerrar notificación">
            <ui-icon name="x" [size]="15" />
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed; top: 20px; right: 20px; z-index: 200;
      display: flex; flex-direction: column; gap: 10px; width: min(380px, calc(100vw - 32px));
    }
    .toast {
      display: flex; align-items: flex-start; gap: 10px;
      background: var(--surface); border: 1px solid var(--border);
      border-left: 4px solid var(--brand-600);
      border-radius: var(--r-md); padding: 13px 14px;
      box-shadow: var(--shadow-md);
      animation: slide-left .25s ease both;
      color: var(--text);
    }
    .toast-success { border-left-color: var(--success); color: var(--text); }
    .toast-error   { border-left-color: var(--danger); }
    .toast-warning { border-left-color: var(--warning); }
    .toast-info    { border-left-color: var(--info); }
    .toast-success ui-icon:first-child { color: var(--success); }
    .toast-error ui-icon:first-child { color: var(--danger); }
    .toast-warning ui-icon:first-child { color: var(--warning); }
    .toast-info ui-icon:first-child { color: var(--info); }
    .toast-msg { flex: 1; font-size: 13px; line-height: 1.45; padding-top: 1px; }
    .toast-close { color: var(--text-muted); flex: none; }
    .toast-close:hover { color: var(--text); }
    @media (max-width: 480px) {
      .toast-stack { left: 16px; right: 16px; width: auto; }
    }
  `],
})
export class ToastsComponent {
  protected readonly toasts = inject(ToastService);

  protected iconFor(type: string): string {
    return ICON_BY_TYPE[type] ?? 'info';
  }
}
