import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PersonajeRetratoComponent } from '../../shared/personaje-retrato.component';
import { ConexionPartidaService } from './conexion-partida.service';
import { EntradaService } from './entrada.service';
import { EstadoPartidaStore } from './estado-partida.store';

/**
 * HUD in-game Rediseñado estilo AAA Comercial (UIX y Accesibilidad Avanzada).
 * Mantiene el centro de apuntado 100% despejado y organiza la información por zonas perimetrales.
 */
@Component({
  selector: 'app-hud',
  standalone: true,
  imports: [PersonajeRetratoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Crosshair / Retícula Central -->
    <div class="crosshair" aria-hidden="true"><i></i></div>

    <!-- Viñeta de daño por estar fuera de la zona -->
    @if (fueraDeZona()) {
      <div class="vignette is-on"></div>
    }

    <!-- HUD Core Shell -->
    <div class="hud">

      @if (jugador(); as yo) {
        <!-- TOP LEFT — Estado Vital del Jugador -->
        <section class="zone-vitals" aria-label="Estado del jugador">
          <div class="panel vitals-card">
            <div class="avatar">
              <app-personaje-retrato [personaje]="yo.personaje" [tamano]="36" />
              <span class="ping-led" [class.is-warn]="ping() !== null && ping()! > 120" title="Estado de conexión"></span>
            </div>
            <div class="vitals-meta">
              <div class="vitals-row">
                <div class="vitals-name">Jugador {{ yo.id.slice(0, 6) }}</div>
                <div class="vitals-hp-text mono">{{ yo.hp }} / 100</div>
              </div>
              <div class="bar-track" role="progressbar" [attr.aria-valuenow]="yo.hp" aria-valuemin="0" aria-valuemax="100" aria-label="Vida">
                <div class="bar-fill" [class.is-low]="yo.hp <= 30" [style.width.%]="porcentajeHp(yo.hp)"></div>
              </div>
              <div class="bar-track shield-track" role="progressbar" aria-valuenow="40" aria-valuemin="0" aria-valuemax="100" aria-label="Escudo">
                <div class="bar-fill shield-fill" style="width: 40%;"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- TOP CENTER — Strip de Estado de la Partida -->
        <section class="zone-match" aria-label="Estado de la partida">
          <div class="panel match-strip panel-solid">
            <div class="match-cell">
              <span class="label-caps">Vivos</span>
              <span class="match-value mono ok">{{ vivos() }}</span>
            </div>
            <div class="match-cell">
              <span class="label-caps">Tiempo</span>
              <span class="match-value mono">{{ tiempoTranscurrido() }}</span>
            </div>
            <div class="match-cell">
              <span class="label-caps">Bajas</span>
              <span class="match-value mono warn">{{ yo.kills }}</span>
            </div>
          </div>
        </section>

        <!-- TOP RIGHT — Kill Feed & Chip de Kills -->
        <section class="zone-feed" aria-label="Registro de bajas">
          <div class="feed-header">
            <div class="chip kills">
              <span class="dot"></span>
              <span class="mono">×{{ yo.kills }} KILLS</span>
            </div>
          </div>
          @if (killFeed().length > 0) {
            <div class="feed-list">
              @for (linea of killFeed(); track linea.creadoEn) {
                <div class="feed-item" [class.is-self]="linea.asesino === yo.id || linea.victima === yo.id">
                  <span class="feed-who left" [class.self]="linea.asesino === yo.id">{{ corto(linea.asesino) }}</span>
                  <span class="feed-mid">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M3 12h11l3-3h4M14 12l3 3M7 12V9m0 3v3" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    {{ linea.arma }}
                  </span>
                  <span class="feed-who right" [class.self]="linea.victima === yo.id">{{ corto(linea.victima) }}</span>
                </div>
              }
            </div>
          }
        </section>

        <!-- BANNER DE ADVERTENCIA DE ZONA -->
        @if (zona(); as z) {
          <div class="zone-warn is-on" role="status">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 9v4m0 4h.01M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" stroke-linejoin="round"/>
            </svg>
            @if (z.ticksParaProximoCambio > 0) {
              Zona Cerrando · {{ gasClosing(z) }}
            } @else {
              ¡ZONA EN RADIO MÍNIMO!
            }
          </div>
        }

        <!-- PROMPT POINTER LOCK -->
        @if (!entrada.capturaActiva()) {
          <button type="button" class="prompt-lock is-on interactive" (click)="solicitarCaptura()">
            <span class="title">Click para capturar el mouse</span>
            <span class="hint">El centro de la pantalla queda libre para apuntar. Los controles de partida viven en los bordes.</span>
            <span class="key-row" aria-hidden="true">
              <span>W A S D</span>
              <span>Mouse</span>
              <span>Click</span>
            </span>
          </button>
        }

        <!-- BOTTOM LEFT — Minimapa y Conectividad -->
        <section class="zone-map" aria-label="Minimapa">
          @if (zona(); as z) {
            <div class="minimap panel">
              <div class="zone-circle-next" [style.left.px]="zonaCx(z)" [style.top.px]="zonaCy(z)" [style.width.px]="zonaRProxima(z) * 2" [style.height.px]="zonaRProxima(z) * 2"></div>
              <div class="zone-circle" [style.left.px]="zonaCx(z)" [style.top.px]="zonaCy(z)" [style.width.px]="zonaR(z) * 2" [style.height.px]="zonaR(z) * 2"></div>
              <div class="map-player"></div>
            </div>
          }
          <div class="status-row">
            <div class="status-pill">
              <span class="led"></span>
              <span>Conectado</span>
            </div>
            <div class="status-pill">
              <span class="mono">{{ ping() === null ? '--' : ping() + 'ms' }}</span>
            </div>
            <div class="status-pill">
              <span class="mono">Vista 3D</span>
            </div>
          </div>
        </section>

        <!-- BOTTOM CENTER — Selector de Armas & Munición -->
        <section class="zone-combat" aria-label="Arma y munición">
          <div class="weapon-rack">
            <div class="weapon-slot active interactive">
              <span class="weapon-key">1</span>
              <div class="weapon-body">
                <div class="weapon-name">{{ yo.arma }}</div>
                <div class="weapon-sub mono">Semi · Táctica</div>
              </div>
              <div class="ammo">
                <div class="ammo-mag mono">12</div>
                <div class="ammo-res mono">/ <span>48</span></div>
              </div>
            </div>
          </div>
        </section>

        <!-- BOTTOM RIGHT — Botiquín & Utilidades -->
        <aside class="zone-util" aria-label="Utilidades">
          <div class="util-stack">
            <button type="button" class="util-btn is-accent interactive" (click)="usarBotiquin()">
              <span>+ Botiquín ({{ yo.botiquines }})</span>
              <kbd>Q</kbd>
            </button>
            <div class="util-btn">
              <span>Inventario</span>
              <kbd>Tab</kbd>
            </div>
          </div>
        </aside>
      }

    </div>
  `,
  styles: [
    `
      :host {
        position: absolute;
        inset: 0;
        pointer-events: none;
        user-select: none;
        font-family: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
        color: oklch(0.96 0.01 250);
        -webkit-font-smoothing: antialiased;
      }

      /* Variables Locales de Diseño */
      :host {
        --bg: oklch(0.16 0.02 250);
        --surface: oklch(0.22 0.025 250);
        --fg: oklch(0.96 0.01 250);
        --muted: oklch(0.72 0.02 250);
        --border: oklch(0.42 0.03 250 / 0.55);
        --accent: oklch(0.72 0.16 55);
        --hp: oklch(0.72 0.17 145);
        --hp-low: oklch(0.65 0.2 25);
        --shield: oklch(0.72 0.12 230);
        --danger: oklch(0.62 0.2 25);
        --ok: oklch(0.72 0.15 150);
        --kill: oklch(0.78 0.16 85);
        --panel: oklch(0.18 0.025 250 / 0.78);
        --panel-solid: oklch(0.2 0.025 250 / 0.92);
        --shadow: 0 8px 28px oklch(0.1 0.02 250 / 0.45);
        --font-mono: "IBM Plex Mono", ui-monospace, Consolas, monospace;
        --r: 10px;
        --r-sm: 6px;
        --safe-x: 20px;
        --safe-y: 16px;
      }

      .interactive {
        pointer-events: auto !important;
        cursor: pointer;
      }

      .mono {
        font-family: var(--font-mono);
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.01em;
      }

      .label-caps {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
        line-height: 1.2;
      }

      /* Panel Glassmorphism Base */
      .panel {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: var(--r);
        backdrop-filter: blur(14px) saturate(1.15);
        -webkit-backdrop-filter: blur(14px) saturate(1.15);
        box-shadow: var(--shadow);
      }

      .panel-solid {
        background: var(--panel-solid);
      }

      /* Crosshair Retícula Central */
      .crosshair {
        position: absolute;
        left: 50%; top: 50%;
        width: 18px; height: 18px;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 5;
      }
      .crosshair::before,
      .crosshair::after {
        content: "";
        position: absolute;
        background: oklch(0.98 0.01 250 / 0.85);
        box-shadow: 0 0 0 1px oklch(0.15 0.02 250 / 0.35);
      }
      .crosshair::before {
        left: 50%; top: 0; bottom: 0; width: 2px; transform: translateX(-50%);
      }
      .crosshair::after {
        top: 50%; left: 0; right: 0; height: 2px; transform: translateY(-50%);
      }
      .crosshair i {
        position: absolute;
        inset: 6px;
        border: 1.5px solid oklch(0.98 0.01 250 / 0.55);
        border-radius: 50%;
      }

      /* Viñeta de daño */
      .vignette {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 8;
        opacity: 0;
        transition: opacity 0.3s ease;
        background: radial-gradient(ellipse at center, transparent 45%, oklch(0.4 0.18 25 / 0.45) 100%);
      }
      .vignette.is-on {
        opacity: 1;
      }

      /* HUD Container Shell */
      .hud {
        position: absolute;
        inset: 0;
        z-index: 10;
      }

      /* TOP LEFT — Vitals */
      .zone-vitals {
        position: absolute;
        top: var(--safe-y);
        left: var(--safe-x);
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: min(280px, 28vw);
        z-index: 12;
      }
      .vitals-card {
        padding: 10px 12px 12px;
        display: grid;
        grid-template-columns: 40px 1fr;
        gap: 10px;
        align-items: center;
      }
      .avatar {
        width: 40px; height: 40px;
        border-radius: 10px;
        background: radial-gradient(circle at 35% 30%, oklch(0.78 0.1 220), oklch(0.45 0.08 240));
        border: 1px solid oklch(1 0 0 / 0.12);
        display: grid;
        place-items: center;
        position: relative;
      }
      .ping-led {
        position: absolute;
        right: -3px; bottom: -3px;
        width: 10px; height: 10px;
        border-radius: 50%;
        background: var(--ok);
        border: 2px solid var(--surface);
        box-shadow: 0 0 0 1px oklch(0.72 0.15 150 / 0.4);
      }
      .ping-led.is-warn {
        background: var(--accent);
      }
      .vitals-meta { min-width: 0; }
      .vitals-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 6px;
      }
      .vitals-name {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.01em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .vitals-hp-text {
        font-size: 12px;
        font-weight: 500;
        color: var(--muted);
      }
      .bar-track {
        height: 8px;
        border-radius: 999px;
        background: oklch(0.12 0.02 250 / 0.65);
        overflow: hidden;
        border: 1px solid oklch(1 0 0 / 0.06);
      }
      .bar-fill {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, oklch(0.58 0.14 145), var(--hp));
        box-shadow: 0 0 12px oklch(0.72 0.17 145 / 0.35);
        transition: width 0.25s ease, background 0.25s ease;
      }
      .bar-fill.is-low {
        background: linear-gradient(90deg, oklch(0.5 0.18 25), var(--hp-low));
        box-shadow: 0 0 12px oklch(0.65 0.2 25 / 0.4);
      }
      .shield-track { margin-top: 5px; height: 5px; }
      .shield-fill {
        background: linear-gradient(90deg, oklch(0.55 0.1 230), var(--shield));
        box-shadow: none;
      }

      /* TOP CENTER — Match Strip */
      .zone-match {
        position: absolute;
        top: var(--safe-y);
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: stretch;
        gap: 0;
        z-index: 12;
        max-width: calc(100% - 560px);
      }
      .match-strip {
        display: flex;
        align-items: center;
        gap: 0;
        padding: 0;
        overflow: hidden;
      }
      .match-cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 8px 18px;
        min-width: 88px;
        position: relative;
      }
      .match-cell + .match-cell::before {
        content: "";
        position: absolute;
        left: 0; top: 20%; bottom: 20%;
        width: 1px;
        background: oklch(1 0 0 / 0.1);
      }
      .match-value {
        font-size: 18px;
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1.1;
      }
      .match-value.warn { color: var(--accent); }
      .match-value.ok { color: var(--ok); }

      /* TOP RIGHT — Kill Feed */
      .zone-feed {
        position: absolute;
        top: var(--safe-y);
        right: var(--safe-x);
        width: min(260px, 24vw);
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 6px;
        z-index: 12;
      }
      .feed-header {
        display: flex;
        justify-content: flex-end;
        gap: 6px;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        border: 1px solid var(--border);
        background: var(--panel-solid);
        backdrop-filter: blur(10px);
      }
      .chip .dot {
        width: 6px; height: 6px;
        border-radius: 50%;
        background: var(--accent);
      }
      .chip.kills .dot { background: var(--kill); }
      .feed-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        width: 100%;
        max-height: 168px;
        overflow: hidden;
      }
      .feed-item {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 6px;
        padding: 7px 10px;
        border-radius: var(--r-sm);
        background: var(--panel);
        border: 1px solid oklch(1 0 0 / 0.08);
        backdrop-filter: blur(10px);
        font-size: 12px;
        line-height: 1.2;
      }
      .feed-item.is-self {
        border-color: oklch(0.72 0.16 55 / 0.45);
        background: oklch(0.28 0.04 55 / 0.35);
      }
      .feed-who {
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .feed-who.left { text-align: right; color: var(--fg); }
      .feed-who.right { text-align: left; color: var(--muted); }
      .feed-who.self { color: var(--accent); }
      .feed-mid {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--muted);
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .feed-mid svg { width: 12px; height: 12px; color: var(--kill); flex-shrink: 0; }

      /* PROMPT POINTER LOCK */
      .prompt-lock {
        position: absolute;
        left: 50%;
        top: 38%;
        transform: translate(-50%, -50%);
        z-index: 20;
        display: none;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        text-align: center;
        max-width: 360px;
        padding: 16px 22px;
        border-radius: 12px;
        background: var(--panel-solid);
        border: 1px solid var(--border);
        box-shadow: var(--shadow);
        pointer-events: auto;
        cursor: pointer;
        color: var(--fg);
        backdrop-filter: blur(14px);
      }
      .prompt-lock.is-on { display: flex; }
      .prompt-lock .title {
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .prompt-lock .hint {
        font-size: 12px;
        color: var(--muted);
        line-height: 1.45;
        max-width: 28ch;
      }
      .prompt-lock .key-row {
        display: flex;
        gap: 6px;
        margin-top: 2px;
      }
      .prompt-lock .key-row span {
        font-family: var(--font-mono);
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 5px;
        border: 1px solid oklch(1 0 0 / 0.12);
        background: oklch(0.14 0.02 250 / 0.6);
        color: var(--muted);
      }

      /* BANNER DE ZONA */
      .zone-warn {
        position: absolute;
        left: 50%;
        top: 78px;
        transform: translateX(-50%);
        z-index: 15;
        display: none;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        border-radius: 999px;
        background: oklch(0.28 0.06 25 / 0.85);
        border: 1px solid oklch(0.65 0.18 25 / 0.5);
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: oklch(0.92 0.05 25);
        box-shadow: var(--shadow);
      }
      .zone-warn.is-on { display: inline-flex; }
      .zone-warn svg { width: 14px; height: 14px; flex-shrink: 0; }

      /* BOTTOM LEFT — Minimap */
      .zone-map {
        position: absolute;
        left: var(--safe-x);
        bottom: var(--safe-y);
        z-index: 12;
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: flex-start;
      }
      .minimap {
        width: 148px;
        height: 148px;
        border-radius: 14px;
        position: relative;
        overflow: hidden;
        border: 1px solid var(--border);
        box-shadow: var(--shadow);
        background:
          radial-gradient(circle at 40% 55%, oklch(0.45 0.08 240) 0 28%, transparent 29%),
          radial-gradient(circle at 70% 35%, oklch(0.42 0.1 145) 0 18%, transparent 19%),
          linear-gradient(160deg, oklch(0.32 0.05 145), oklch(0.26 0.04 220));
      }
      .zone-circle {
        position: absolute;
        transform: translate(-50%, -50%);
        border: 1.5px solid oklch(0.65 0.18 145);
        border-radius: 50%;
        background: oklch(0.65 0.18 145 / 0.15);
        pointer-events: none;
      }
      .zone-circle-next {
        position: absolute;
        transform: translate(-50%, -50%);
        border: 1.5px dashed oklch(0.85 0.18 85 / 0.8);
        border-radius: 50%;
        pointer-events: none;
      }
      .map-player {
        position: absolute;
        left: 50%; top: 50%;
        width: 8px; height: 8px;
        border-radius: 50%;
        background: var(--fg);
        box-shadow: 0 0 0 2px oklch(0.2 0.02 250), 0 0 10px oklch(1 0 0 / 0.35);
        transform: translate(-50%, -50%);
      }
      .status-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 9px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        background: var(--panel-solid);
        border: 1px solid var(--border);
        color: var(--muted);
      }
      .status-pill .led {
        width: 6px; height: 6px;
        border-radius: 50%;
        background: var(--ok);
        box-shadow: 0 0 8px oklch(0.72 0.15 150 / 0.7);
      }

      /* BOTTOM CENTER — Weapon / Combat */
      .zone-combat {
        position: absolute;
        left: 50%;
        bottom: var(--safe-y);
        transform: translateX(-50%);
        z-index: 12;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        width: min(360px, 46vw);
      }
      .weapon-rack {
        display: flex;
        align-items: stretch;
        gap: 8px;
        width: 100%;
        justify-content: center;
      }
      .weapon-slot {
        flex: 1 1 auto;
        min-width: 0;
        padding: 10px 14px;
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 10px;
        align-items: center;
        border-radius: var(--r);
        border: 1px solid oklch(0.72 0.16 55 / 0.65);
        background: oklch(0.26 0.04 55 / 0.4);
        box-shadow: var(--shadow), inset 0 0 0 1px oklch(0.72 0.16 55 / 0.12);
        backdrop-filter: blur(14px);
      }
      .weapon-key {
        width: 22px; height: 22px;
        border-radius: 5px;
        border: 1px solid oklch(0.72 0.16 55 / 0.4);
        background: oklch(0.15 0.02 250 / 0.55);
        display: grid;
        place-items: center;
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: 600;
        color: var(--accent);
      }
      .weapon-body { min-width: 0; }
      .weapon-name {
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        line-height: 1.15;
        white-space: nowrap;
        color: var(--fg);
      }
      .weapon-sub {
        margin-top: 2px;
        font-size: 11px;
        color: var(--muted);
        letter-spacing: 0.02em;
      }
      .ammo {
        text-align: right;
        font-family: var(--font-mono);
        line-height: 1;
      }
      .ammo-mag {
        font-size: 28px;
        font-weight: 600;
        letter-spacing: -0.03em;
      }
      .ammo-res {
        margin-top: 3px;
        font-size: 12px;
        color: var(--muted);
        font-weight: 500;
      }
      .ammo-res span { color: var(--fg); }

      /* BOTTOM RIGHT — Utility */
      .zone-util {
        position: absolute;
        right: var(--safe-x);
        bottom: var(--safe-y);
        z-index: 12;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
      }
      .util-stack {
        display: flex;
        flex-direction: column;
        gap: 6px;
        align-items: stretch;
      }
      .util-btn {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-width: 140px;
        padding: 9px 12px;
        border-radius: var(--r-sm);
        border: 1px solid var(--border);
        background: var(--panel);
        backdrop-filter: blur(12px);
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.03em;
        color: var(--fg);

        /* Reset button styles when rendered as button element */
        outline: none;
        font-family: inherit;
        text-transform: none;
      }
      .util-btn kbd {
        font-family: var(--font-mono);
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.04em;
        color: var(--muted);
        padding: 2px 5px;
        border-radius: 4px;
        border: 1px solid oklch(1 0 0 / 0.1);
        background: oklch(0.12 0.02 250 / 0.45);
      }
      .util-btn.is-accent {
        border-color: oklch(0.72 0.16 55 / 0.45);
        background: oklch(0.28 0.05 55 / 0.35);
      }
      .util-btn.is-accent span:first-child { color: var(--accent); }
    `,
  ],
})
export class HudComponent {
  private static readonly RADAR_ALCANCE = 150;
  private static readonly RADAR_RADIO_PX = 48;

  private readonly store = inject(EstadoPartidaStore);
  protected readonly entrada = inject(EntradaService);
  private readonly conexion = inject(ConexionPartidaService);

  readonly jugador = this.store.jugadorPropio;
  readonly vivos = this.store.vivos;
  readonly killFeed = this.store.killFeed;
  readonly ping = this.store.rttMs;
  readonly bytesSnapshot = computed(() => {
    const bytes = this.conexion.ultimoSnapshotBytes();
    return bytes === null ? '--' : bytes + ' B';
  });

  readonly zona = computed(() => this.store.ultimoSnapshot()?.zona ?? null);

  readonly fueraDeZona = computed(() => {
    const yo = this.jugador();
    const z = this.zona();
    if (yo === null || z === null) {
      return false;
    }
    return Math.hypot(yo.x - z.cx, yo.y - z.cy) > z.radio;
  });

  readonly tiempoTranscurrido = computed(() => {
    const snapshot = this.store.ultimoSnapshot();
    const tickRate = this.store.config()?.tickRate;
    if (snapshot === null || snapshot === undefined || !tickRate) {
      return '00:00';
    }
    const segundos = Math.max(0, snapshot.tick - snapshot.tickInicio) / tickRate;
    return this.formatoMinutos(segundos);
  });

  porcentajeHp(hp: number): number {
    return Math.max(0, Math.min(100, hp));
  }

  corto(id: string): string {
    return id.slice(0, 4);
  }

  solicitarCaptura(): void {
    this.entrada.solicitarCaptura();
  }

  usarBotiquin(): void {
    this.entrada.usarBotiquin();
  }

  gasClosing(zona: { ticksParaProximoCambio: number }): string {
    const tickRate = this.store.config()?.tickRate ?? 30;
    return this.formatoMinutos(zona.ticksParaProximoCambio / tickRate);
  }

  zonaCx(zona: { cx: number }): number {
    const yo = this.jugador();
    if (yo === null) {
      return 75;
    }
    return 75 + this.aEscalaRadar(zona.cx - yo.x);
  }

  zonaCy(zona: { cy: number }): number {
    const yo = this.jugador();
    if (yo === null) {
      return 75;
    }
    return 75 + this.aEscalaRadar(zona.cy - yo.y);
  }

  zonaR(zona: { radio: number }): number {
    return this.aEscalaRadar(zona.radio);
  }

  zonaRProxima(zona: { radioProximo: number }): number {
    return this.aEscalaRadar(zona.radioProximo);
  }

  private aEscalaRadar(unidadesDeMundo: number): number {
    return (unidadesDeMundo / HudComponent.RADAR_ALCANCE) * HudComponent.RADAR_RADIO_PX;
  }

  private formatoMinutos(segundosTotales: number): string {
    const totales = Math.max(0, Math.round(segundosTotales));
    const minutos = Math.floor(totales / 60);
    const segundos = totales % 60;
    return `${this.conCero(minutos)}:${this.conCero(segundos)}`;
  }

  private conCero(valor: number): string {
    return valor < 10 ? `0${valor}` : `${valor}`;
  }
}
