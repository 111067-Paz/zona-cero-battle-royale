import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EstadoPartidaStore } from './estado-partida.store';

/**
 * Pantallas que no son el HUD in-game (Flujo I, PLAN §7-I): lobby de partida (roster, esperando),
 * cuenta regresiva (3-2-1) y podio (fin de partida). Se superponen al canvas+HUD sin ocultarlos —
 * el mapa sigue visible detras (ej. en EN_LOBBY se ve a todos parados en sus spawns).
 *
 * <p>Presentacional puro: lee signals del store, se repinta solo cuando cambia el snapshot/evento.
 */
@Component({
  selector: 'app-overlay-estado',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (estado() === 'EN_LOBBY') {
      <div class="overlay">
        <div class="panel">
          <h2>ESPERANDO JUGADORES</h2>
          <p>{{ cantidadJugadores() }} en la sala</p>
        </div>
      </div>
    }

    @if (estado() === 'CUENTA_REGRESIVA') {
      <div class="overlay">
        <div class="numero-regresivo">{{ segundosRestantes() }}</div>
      </div>
    }

    @if (estado() === 'FINALIZADA' && resultado(); as podio) {
      <div class="overlay overlay--podio">
        <div class="panel panel--podio">
          <h2>{{ esGanador(podio.ganador) ? '¡VICTORIA!' : 'FIN DE LA PARTIDA' }}</h2>
          <p class="ganador">Ganador: {{ corto(podio.ganador) }}</p>
          <ul class="tabla-kills">
            @for (fila of tablaKills(podio.killsPorJugador); track fila.id) {
              <li>
                <span>{{ corto(fila.id) }}</span>
                <span>{{ fila.kills }} kills</span>
              </li>
            }
          </ul>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .panel {
        border: 3px solid var(--color-thick-border);
        border-radius: 16px;
        padding: 24px 40px;
        background: rgba(15, 26, 54, 0.9);
        color: #eaf0ff;
        text-align: center;
        font-weight: 800;
        text-transform: uppercase;
      }
      .panel h2 {
        margin: 0 0 8px;
        font-size: 28px;
        letter-spacing: 1px;
      }
      .panel p {
        margin: 0;
        font-size: 14px;
        opacity: 0.85;
      }
      .numero-regresivo {
        font-size: 120px;
        font-weight: 800;
        color: #ffcc00;
        text-shadow: 0 0 0 var(--color-thick-border), 4px 4px 0 var(--color-thick-border);
      }
      .panel--podio {
        min-width: 260px;
      }
      .ganador {
        margin-top: 6px;
        font-size: 18px;
        color: var(--color-health-lime);
      }
      .tabla-kills {
        list-style: none;
        margin: 16px 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .tabla-kills li {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        font-size: 13px;
        font-weight: 700;
      }
    `,
  ],
})
export class OverlayEstadoComponent {
  private readonly store = inject(EstadoPartidaStore);

  readonly estado = computed(() => this.store.ultimoSnapshot()?.estado ?? null);
  readonly resultado = this.store.resultadoFinal;

  readonly cantidadJugadores = computed(() => this.store.ultimoSnapshot()?.jugadores.length ?? 0);

  readonly segundosRestantes = computed(() => {
    const snapshot = this.store.ultimoSnapshot();
    const tickRate = this.store.config()?.tickRate;
    if (snapshot === null || snapshot === undefined || snapshot.ticksParaInicio === null || !tickRate) {
      return 0;
    }
    return Math.ceil(snapshot.ticksParaInicio / tickRate);
  });

  esGanador(idGanador: string): boolean {
    return idGanador === this.store.idJugador();
  }

  corto(id: string): string {
    return id.slice(0, 4);
  }

  tablaKills(killsPorJugador: Record<string, number>): { id: string; kills: number }[] {
    return Object.entries(killsPorJugador)
      .map(([id, kills]) => ({ id, kills }))
      .sort((a, b) => b.kills - a.kills);
  }
}
