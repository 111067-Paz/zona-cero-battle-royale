import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EstadoPartidaStore } from './estado-partida.store';

/**
 * HUD in-game estilo "Battle Bash" (PLAN §7.9, §15.3). Componente presentacional: lee signals del
 * store y se repinta SOLO cuando llega un snapshot o un evento, jamas por frame (zoneless).
 *
 * <p>Fase 2: HP + ALIVE (arriba-izquierda), KILLS (arriba-derecha), tarjeta de arma SIN municion
 * (abajo-derecha, R10/R31) y kill feed. El radar, GAS CLOSING y TIME llegan en la Fase 4.
 */
@Component({
  selector: 'app-hud',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (jugador(); as yo) {
      <div class="hud-superior-izq">
        <div class="panel-hp">
          <div class="retrato"></div>
          <div class="hp">
            <div class="hp__barra">
              <div class="hp__relleno" [style.width.%]="porcentajeHp(yo.hp)"></div>
            </div>
            <span class="hp__texto">HP {{ yo.hp }}/100</span>
          </div>
        </div>
        <span class="chip chip--negro">ALIVE: {{ vivos() }}</span>
      </div>

      <div class="hud-superior-der">
        <span class="chip chip--negro">KILLS: {{ yo.kills }}</span>
      </div>

      <div class="hud-inferior-der">
        <div class="tarjeta-arma">
          <span class="tarjeta-arma__nombre">{{ yo.arma }}</span>
        </div>
      </div>
    }

    @if (killFeed().length > 0) {
      <ul class="kill-feed">
        @for (linea of killFeed(); track linea.creadoEn) {
          <li class="kill-feed__linea">
            <span class="kill-feed__asesino">{{ corto(linea.asesino) }}</span>
            <span class="kill-feed__arma">☠ {{ linea.arma }}</span>
            <span class="kill-feed__victima">{{ corto(linea.victima) }}</span>
          </li>
        }
      </ul>
    }
  `,
  styles: [
    `
      :host {
        position: absolute;
        inset: 0;
        pointer-events: none;
        font-weight: 800;
        text-transform: uppercase;
      }
      .hud-superior-izq {
        position: absolute;
        top: 12px;
        left: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: flex-start;
      }
      .hud-superior-der {
        position: absolute;
        top: 12px;
        right: 12px;
      }
      .hud-inferior-der {
        position: absolute;
        bottom: 16px;
        right: 16px;
      }
      .chip {
        border: 3px solid var(--color-thick-border);
        border-radius: 10px;
        padding: 4px 10px;
        font-size: 13px;
        color: #eaf0ff;
      }
      .chip--negro {
        background: rgba(15, 26, 54, 0.85);
      }
      .panel-hp {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(15, 26, 54, 0.85);
        border: 3px solid var(--color-thick-border);
        border-radius: 12px;
        padding: 6px 10px 6px 6px;
      }
      .retrato {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 3px solid var(--color-thick-border);
        background: var(--color-radar-blue);
      }
      .hp {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .hp__barra {
        width: 150px;
        height: 12px;
        border: 3px solid var(--color-thick-border);
        border-radius: 8px;
        background: #2a1520;
        overflow: hidden;
      }
      .hp__relleno {
        height: 100%;
        background: var(--color-health-lime);
        transition: width 0.15s ease-out;
      }
      .hp__texto {
        font-size: 11px;
        color: #eaf0ff;
      }
      .tarjeta-arma {
        border: 3px solid var(--color-thick-border);
        border-radius: 12px;
        padding: 10px 18px;
        background: linear-gradient(180deg, #c0304f, #7a1a30);
        color: #fff;
      }
      .tarjeta-arma__nombre {
        font-size: 18px;
        letter-spacing: 1px;
      }
      .kill-feed {
        position: absolute;
        top: 56px;
        right: 12px;
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-items: flex-end;
      }
      .kill-feed__linea {
        display: flex;
        gap: 6px;
        align-items: center;
        background: rgba(15, 26, 54, 0.8);
        border: 3px solid var(--color-thick-border);
        border-radius: 8px;
        padding: 2px 8px;
        font-size: 12px;
        color: #eaf0ff;
      }
      .kill-feed__arma {
        color: #ffcc00;
      }
    `,
  ],
})
export class HudComponent {
  private readonly store = inject(EstadoPartidaStore);

  readonly jugador = this.store.jugadorPropio;
  readonly vivos = this.store.vivos;
  readonly killFeed = this.store.killFeed;

  porcentajeHp(hp: number): number {
    return Math.max(0, Math.min(100, hp));
  }

  corto(id: string): string {
    return id.slice(0, 4);
  }
}
