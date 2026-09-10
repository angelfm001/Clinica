import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

/**
 * Shell de modal reutilizable. El contenido (formulario, tabla, etc.) se
 * proyecta con `<ng-content>`; el llamador controla la visibilidad con `open`.
 */
@Component({
  selector: 'ui-modal',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="backdrop no-print" (click)="onBackdrop()">
        <div class="modal" [style.width]="width()" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h2>{{ title() }}</h2>
            <button class="icon-btn bare" type="button" (click)="close.emit()" aria-label="Cerrar">
              <ui-icon name="x" [size]="20" />
            </button>
          </div>
          <div class="modal-body">
            <ng-content />
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .backdrop {
      position: fixed; inset: 0; background: rgba(10, 20, 38, .48);
      display: flex; align-items: center; justify-content: center; z-index: 250;
      padding: 20px; animation: fade-in .15s ease both;
    }
    .modal {
      width: min(640px, 100%); max-height: min(88vh, 820px);
      background: var(--surface); border-radius: var(--r-xl);
      box-shadow: var(--shadow-lg); display: flex; flex-direction: column;
      animation: pop .18s ease both; overflow: hidden;
    }
    .modal-head {
      padding: 18px 22px; border-bottom: 1px solid var(--border-soft);
      display: flex; align-items: center; justify-content: space-between; flex: none;
    }
    .modal-head h2 { font-size: 17px; }
    .modal-body { overflow-y: auto; padding: 22px; }
    @media (max-width: 640px) {
      .modal { width: 100%; max-height: 92vh; border-radius: var(--r-lg); }
      .modal-body { padding: 16px; }
    }
  `],
})
export class ModalComponent {
  readonly open = input(false);
  readonly title = input('');
  readonly width = input('640px');
  readonly closeOnBackdrop = input(true);
  readonly close = output<void>();

  protected onBackdrop(): void {
    if (this.closeOnBackdrop()) this.close.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.close.emit();
  }
}
