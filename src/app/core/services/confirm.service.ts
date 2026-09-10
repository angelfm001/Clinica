import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'brand';
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

/**
 * Diálogo de confirmación global (reemplaza `window.confirm` con un modal
 * consistente con el design system). `<app-confirm-host>` se monta una vez en
 * `AppComponent` y reacciona a `state()`.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly state = signal<ConfirmState | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.state.set({ ...options, resolve });
    });
  }

  resolve(value: boolean): void {
    this.state()?.resolve(value);
    this.state.set(null);
  }
}
