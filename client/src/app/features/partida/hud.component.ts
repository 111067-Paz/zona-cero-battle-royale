import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PersonajeRetratoComponent } from '../../shared/personaje-retrato.component';
import { EntradaService } from './entrada.service';
import { EstadoPartidaStore } from './estado-partida.store';

/**
 * HUD in-game estilo "Battle Bash" (PLAN §7.9, §15.3). Componente presentacional: lee signals del
 * store y se repinta SOLO cuando llega un snapshot o un evento, jamas por frame (zoneless).
 *
 * <p>Fase 4: suma el radar (solo zona + posicion propia, R30 — SIN puntos de enemigos), GAS CLOSING,
 * TIME (desde tickInicio, R27) y el quick-slot de botiquin (contador + click para usar, R28).
 */
@Component({
  selector: 'app-hud',
  standalone: true,
  imports: [PersonajeRetratoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (fueraDeZona()) {
      <div class="vignette"></div>
    }
    @if (jugador(); as yo) {
      <div class="hud-superior-izq">
        <div class="panel-hp">
          <div class="retrato">
            <app-personaje-retrato [personaje]="yo.personaje" [tamano]="28" />
          </div>
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
        <span class="chip chip--negro">TIME: {{ tiempoTranscurrido() }}</span>
        <span class="chip chip--negro">KILLS: {{ yo.kills }}</span>
        <span class="chip chip--negro">PING: {{ ping() === null ? '--' : ping() + 'ms' }}</span>
      </div>

      <div class="hud-inferior-izq">
        @if (zona(); as z) {
          <svg class="radar" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="48" class="radar__fondo" />
            <circle [attr.cx]="zonaCx(z)" [attr.cy]="zonaCy(z)" [attr.r]="zonaR(z)" class="radar__zona" />
            <circle cx="50" cy="50" r="3" class="radar__yo" />
          </svg>
          <span class="chip chip--negro">GAS CLOSING: {{ gasClosing(z) }}</span>
        }
      </div>

      <div class="hud-inferior-der">
        <div class="tarjeta-arma">
          <span class="tarjeta-arma__nombre">{{ yo.arma }}</span>
        </div>
        <button type="button" class="quick-slot" (click)="usarBotiquin()">
          <span class="quick-slot__icono">✚</span>
          <span class="quick-slot__contador">{{ yo.botiquines }}</span>
        </button>
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
        font-weight: 800;
        text-transform: uppercase;
      }
      .hud-superior-izq,
      .hud-superior-der,
      .hud-inferior-izq,
      .hud-inferior-der {
        position: absolute;
        display: flex;
        gap: 8px;
        pointer-events: none;
      }
      .hud-superior-izq {
        top: 12px;
        left: 12px;
        flex-direction: column;
        align-items: flex-start;
      }
      .hud-superior-der {
        top: 12px;
        right: 12px;
        flex-direction: column;
        align-items: flex-end;
      }
      .hud-inferior-izq {
        bottom: 16px;
        left: 16px;
        flex-direction: column;
        align-items: flex-start;
      }
      .hud-inferior-der {
        bottom: 16px;
        right: 16px;
        flex-direction: column;
        align-items: flex-end;
        gap: 10px;
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
        overflow: hidden;
        display: grid;
        place-items: center;
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
      .radar {
        width: 96px;
        height: 96px;
        border: 3px solid var(--color-thick-border);
        border-radius: 50%;
        background: #0b1530;
      }
      .radar__fondo {
        fill: var(--color-radar-blue);
        opacity: 0.35;
      }
      .radar__zona {
        fill: none;
        stroke: #4ade80;
        stroke-width: 2;
      }
      .radar__yo {
        fill: #ffffff;
        stroke: var(--color-thick-border);
        stroke-width: 1;
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
      .quick-slot {
        pointer-events: auto;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        border: 3px solid var(--color-thick-border);
        border-radius: 50px;
        padding: 6px 14px;
        background: rgba(15, 26, 54, 0.85);
        color: var(--color-health-lime);
        font-weight: 800;
        font-size: 16px;
      }
      .quick-slot__icono {
        font-size: 18px;
      }
      .kill-feed {
        position: absolute;
        top: 90px;
        right: 12px;
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-items: flex-end;
        pointer-events: none;
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
      .vignette {
        position: absolute;
        inset: 0;
        pointer-events: none;
        box-shadow: inset 0 0 60px 20px rgba(255, 40, 40, 0.55);
        animation: vignette-pulso 1s ease-in-out infinite;
      }
      @keyframes vignette-pulso {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }
    `,
  ],
})
export class HudComponent {
  /** Rango de mundo (unidades) que cubre el radar; el jugador siempre queda en el centro. */
  private static readonly RADAR_ALCANCE = 150;
  private static readonly RADAR_RADIO_PX = 48;

  private readonly store = inject(EstadoPartidaStore);
  private readonly entrada = inject(EntradaService);

  readonly jugador = this.store.jugadorPropio;
  readonly vivos = this.store.vivos;
  readonly killFeed = this.store.killFeed;
  /** RTT estimado por sec/ack (F7): sirve para validar "sin goma" mientras se prueba con latencia. */
  readonly ping = this.store.rttMs;

  readonly zona = computed(() => this.store.ultimoSnapshot()?.zona ?? null);

  /** Vignette de dano de zona (§7.9): borde rojo pulsante cuando estoy fuera del circulo seguro. */
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

  usarBotiquin(): void {
    this.entrada.usarBotiquin();
  }

  gasClosing(zona: { ticksParaProximoCambio: number }): string {
    const tickRate = this.store.config()?.tickRate ?? 30;
    return this.formatoMinutos(zona.ticksParaProximoCambio / tickRate);
  }

  /** Centro de la zona en el radar (0-100), relativo a la posicion propia (siempre en el centro). */
  zonaCx(zona: { cx: number }): number {
    const yo = this.jugador();
    if (yo === null) {
      return 50;
    }
    return 50 + this.aEscalaRadar(zona.cx - yo.x);
  }

  zonaCy(zona: { cy: number }): number {
    const yo = this.jugador();
    if (yo === null) {
      return 50;
    }
    return 50 + this.aEscalaRadar(zona.cy - yo.y);
  }

  zonaR(zona: { radio: number }): number {
    return this.aEscalaRadar(zona.radio);
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
