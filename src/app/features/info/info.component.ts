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
      <!-- fondo decorativo oscuro -->
      <div class="bg-orbs" aria-hidden="true">
        <div class="orb orb--1"></div>
        <div class="orb orb--2"></div>
        <div class="orb orb--3"></div>
        <div class="grid"></div>
      </div>

      <div class="info-card animate-in">
        <div class="info-header">
          <div class="info-icon">
            <ui-icon name="info" [size]="26" [strokeWidth]="2.2" />
          </div>
          <div>
            <h1>Información del proyecto</h1>
            <p>Detalles académicos del prototipo</p>
          </div>
          <span class="badge-dark">
            <span class="dot-pulse"></span> .Net 2
          </span>
        </div>

        <div class="info-body">
          <div class="info-row">
            <span class="info-label">
              <ui-icon name="layers" [size]="14" />
              Tipo de proyecto
            </span>
            <span class="info-value">Prototipo sistema de citas médicas</span>
            <span class="info-desc">Plataforma para gestión de pacientes, agenda y expediente clínico.</span>
          </div>

          <div class="info-row">
            <span class="info-label">
              <ui-icon name="book" [size]="14" />
              Asignatura
            </span>
            <span class="info-value">.Net 2</span>
          </div>

          <div class="info-row integrantes">
            <span class="info-label">
              <ui-icon name="users" [size]="14" />
              Integrantes
            </span>
            <ul class="integrantes-list">
              <li><b><span class="dot"></span> Angel Alejandro Flores Miranda</b></li>
              <li><b><span class="dot"></span> Roberto Alexander Toloza Mendoza</b></li>
            </ul>
          </div>
        </div>

        <div class="info-footer">
          <a routerLink="/login" class="btn btn-ghost-dark">
            <ui-icon name="arrowLeft" [size]="15" />
            Volver al login
          </a>
          <a routerLink="/inicio" class="btn btn-primary">
            Ir al inicio
            <ui-icon name="arrowRight" [size]="15" />
          </a>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; }

    /* Forzado a tema oscuro: tokens aislados del tema global */
    .info-page {
      --bg: #0c1220;
      --surface: #131b2c;
      --surface-2: #182236;
      --surface-3: #1e293e;
      --text: #e8eefb;
      --text-soft: #b3c0d6;
      --text-muted: #8695ae;
      --border: #26324a;
      --border: #8723cf;
      --border-soft: #212c42;
      --border-strong: #33415e;
      --brand-500: #2f7bf5;
      --brand-600: #096be0;
      --brand-700: #0759bc;
      --shadow-lg: 0 20px 55px rgba(0,0,0,.6);

      position: relative;
      min-height: 100vh;
      min-height: 100dvh;
      display: grid;
      place-items: center;
      place-content: center;
      padding: 32px 20px;
      background: radial-gradient(1200px 600px at 70% -10%, rgba(47,123,245,.18), transparent 60%),
                  radial-gradient(900px 500px at -10% 100%, rgba(47,123,245,.12), transparent 60%),
                  var(--bg);
      color: var(--text);
      overflow: hidden;
      isolation: isolate;
    }

    .bg-orbs { position: absolute; inset: 0; overflow: hidden; z-index: 0; pointer-events: none; }
    .orb {
      position: absolute; border-radius: 50%; filter: blur(32px); opacity: .55;
    }
    .orb--1 { width: 520px; height: 520px; left: -120px; top: -160px; background: radial-gradient(circle at 30% 30%, rgba(47,123,245,.35), transparent 70%); }
    .orb--2 { width: 640px; height: 640px; right: -180px; bottom: -220px; background: radial-gradient(circle at 50% 50%, rgba(9,107,224,.22), transparent 70%); }
    .orb--3 { width: 360px; height: 360px; left: 45%; top: 55%; background: radial-gradient(circle, rgba(99,102,241,.18), transparent 70%); transform: translate(-50%,-50%); }
    .grid {
      position: absolute; inset: 0;
      background-image: linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
      background-size: 48px 48px;
      mask-image: radial-gradient(ellipse at 50% 50%, black 40%, transparent 75%);
      opacity: .6;
    }

    .info-card {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 560px;
      overflow: hidden;
      background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.015));
      border: 2px solid rgba(175, 114, 255, 0.14);
      border-radius: 18px;
      box-shadow: 0 20px 55px rgba(0,0,0,.55), 0 1px 0 rgba(255,255,255,.06) inset;
      backdrop-filter: blur(12px);
      animation: fade-up .35s ease both;
    }

    .info-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 22px 24px 18px;
      background: linear-gradient(135deg, #0f2a5a 0%, #0a1a36 100%);
      border-bottom: 1px solid rgba(255,255,255,.06);
      color: #fff;
      position: relative;
    }

    .info-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: rgba(47,123,245,.18);
      border: 1px solid rgba(47,123,245,.35);
      color: #6aa9ff;
      flex: none;
      box-shadow: 0 4px 16px rgba(9,107,224,.35);
    }

    .info-header h1 {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -.02em;
      line-height: 1.2;
      color: #eef5ff;
    }

    .info-header p {
      font-size: 13px;
      color: #8ea0c2;
      margin-top: 2px;
    }

    .badge-dark {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,.07);
      border: 1px solid rgba(255,255,255,.1);
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: .02em;
      color: #c9d8f5;
      white-space: nowrap;
    }

    .dot-pulse {
      width: 7px; height: 7px; border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 0 6px rgba(74,222,128,.14);
      animation: pulse 2s infinite;
    }

    @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(74,222,128,.25);} 70% { box-shadow: 0 0 0 7px rgba(74,222,128,0);} 100% { box-shadow: 0 0 0 0 rgba(74,222,128,0);} }

    .info-body {
      padding: 22px 22px 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      background: rgba(19,27,44,.55);
    }

    .info-row {
      display: flex;
      flex-direction: column;
      gap: 7px;
      padding: 14px 16px;
      background: rgba(255,255,255,.03);
      border: 1px solid rgba(255,255,255,.06);
      border-radius: 12px;
      transition: border-color .15s ease, background .15s ease;
    }

    .info-row:hover { background: rgba(255,255,255,.045); border-color: rgba(47,123,245,.25); }

    .info-label {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .07em;
      color: var(--text-muted);
    }

    .info-value {
      font-size: 15px;
      font-weight: 650;
      color: var(--text);
      letter-spacing: -.01em;
    }

    .info-desc {
      font-size: 12.5px;
      color: var(--text-muted);
      line-height: 1.45;
    }

    .integrantes-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 2px;
    }

    .integrantes-list li {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      font-weight: 500;
      color: #c2cfeb;
      padding: 9px 12px;
      background: rgba(255,255,255,.04);
      border: 1px solid rgba(255,255,255,.07);
      border-radius: 999px;
    }

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #6aa9ff;
      box-shadow: 0 0 8px rgba(47,123,245,.7);
      flex: none;
    }

    .info-footer {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 22px 18px;
      border-top: 1px solid rgba(255,255,255,.06);
      background: rgba(12,18,32,.6);
      flex-wrap: wrap;
    }

    .btn-ghost-dark {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 14px;
      border-radius: 9px;
      font-size: 13.5px; font-weight: 600;
      color: #b3c0d6;
      border: 1px solid rgba(255,255,255,.08);
      background: rgba(255,255,255,.03);
      transition: all .15s ease;
    }
    .btn-ghost-dark:hover { background: rgba(255,255,255,.07); color: #e8eefb; border-color: rgba(255,255,255,.12); }

    .btn-primary {
      display: inline-flex; align-items: center; gap: 8px;
    }

    .info-hint {
      position: relative;
      z-index: 1;
      margin-top: 14px;
      text-align: center;
      font-size: 12px;
      color: #6b7fa3;
    }

    .info-hint code {
      font-family: 'SFMono-Regular', Consolas, monospace;
      background: rgba(255,255,255,.06);
      border: 1px solid rgba(255,255,255,.08);
      color: #c9d8f5;
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 11.5px;
    }

    @media (max-width: 520px) {
      .info-header { padding: 18px 16px 14px; flex-wrap: wrap; }
      .badge-dark { margin-left: 62px; }
      .info-body { padding: 16px; }
      .info-footer { padding: 14px 16px 16px; }
    }
  `],
})
export class InfoComponent {}
