import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/ui/icon/icon.component';

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="info-page">
      <div class="info-card card animate-in">
        <div class="info-header">
          <div class="info-icon">
            <ui-icon name="info" [size]="28" [strokeWidth]="2.2" />
          </div>
          <div>
            <h1>Información del proyecto</h1>
            <p>Detalles académicos del prototipo</p>
          </div>
        </div>

        <div class="info-body">
          <div class="info-row">
            <span class="info-label">
              <ui-icon name="layers" [size]="15" />
              Tipo de proyecto
            </span>
            <span class="info-value">Prototipo sistema de citas médicas</span>
          </div>

          <div class="info-row">
            <span class="info-label">
              <ui-icon name="book" [size]="15" />
              Asignatura
            </span>
            <span class="info-value">.Net 2</span>
          </div>

          <div class="info-row integrantes">
            <span class="info-label">
              <ui-icon name="users" [size]="15" />
              Integrantes
            </span>
            <ul class="integrantes-list">
              <li><span class="dot"></span> Integrante1</li>
              <li><span class="dot"></span> Integrante2</li>
            </ul>
          </div>
        </div>

        <div class="info-footer">
          <a routerLink="/login" class="btn btn-secondary">
            <ui-icon name="arrowLeft" [size]="15" />
            Volver al login
          </a>
          <a routerLink="/inicio" class="btn btn-primary">
            Ir al inicio
            <ui-icon name="arrowRight" [size]="15" />
          </a>
        </div>
      </div>

      <p class="info-hint muted small">Ruta pública: <code>/info</code> — accesible sin autenticación</p>
    </div>
  `,
  styles: [`
    .info-page {
      min-height: 100vh;
      min-height: 100dvh;
      display: grid;
      place-items: center;
      place-content: center;
      padding: 32px 20px;
      background: var(--bg);
    }

    .info-card {
      width: 100%;
      max-width: 560px;
      overflow: hidden;
      animation: fade-up .3s ease both;
    }

    .info-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px 24px 20px;
      background: linear-gradient(135deg, var(--brand-600) 0%, var(--brand-800) 100%);
      color: #fff;
    }

    .info-icon {
      width: 52px;
      height: 52px;
      border-radius: 13px;
      display: grid;
      place-items: center;
      background: rgba(255,255,255,.16);
      border: 1px solid rgba(255,255,255,.22);
      flex: none;
    }

    .info-header h1 {
      font-size: 19px;
      font-weight: 800;
      letter-spacing: -.02em;
      line-height: 1.2;
    }

    .info-header p {
      font-size: 13px;
      opacity: .85;
      margin-top: 2px;
    }

    .info-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .info-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 14px 16px;
      background: var(--surface-2);
      border: 1px solid var(--border-soft);
      border-radius: var(--r-md);
    }

    .info-row.integrantes {
      gap: 10px;
    }

    .info-label {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: var(--text-muted);
    }

    .info-value {
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
    }

    .integrantes-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .integrantes-list li {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-soft);
      padding: 8px 12px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-full);
    }

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--brand-500);
      flex: none;
    }

    .info-footer {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 24px 22px;
      border-top: 1px solid var(--border-soft);
      flex-wrap: wrap;
    }

    .info-hint {
      margin-top: 16px;
      text-align: center;
    }

    .info-hint code {
      font-family: 'SFMono-Regular', Consolas, monospace;
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 12px;
    }

    @media (max-width: 520px) {
      .info-header { padding: 20px 18px 16px; }
      .info-body { padding: 18px; }
      .info-footer { padding: 14px 18px 18px; }
    }
  `],
})
export class InfoComponent {}
