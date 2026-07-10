import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Personaje } from '../../models/personajes';
import { PersonajeRetratoComponent } from '../../shared/personaje-retrato.component';
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
  imports: [PersonajeRetratoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (estado() === 'EN_LOBBY') {
      <div class="overlay">
        <div class="panel">
          <h2>ESPERANDO JUGADORES</h2>
          <p>{{ cantidadJugadores() }} en la sala</p>
          <div class="roster">
            @for (jugador of jugadoresLobby(); track jugador.id) {
              <app-personaje-retrato [personaje]="jugador.personaje" [tamano]="40" />
            }
          </div>
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
          <app-personaje-retrato [personaje]="personajeDe(podio.ganador)" [tamano]="72" />
          <p class="ganador">Ganador: {{ corto(podio.ganador) }}</p>
          <ul class="tabla-kills">
            @for (fila of tablaKills(podio.killsPorJugador); track fila.id) {
              <li>
                <span>{{ corto(fila.id) }}</span>
                <span>{{ fila.kills }} kills</span>
              </li>
            }
          </ul>
          <p class="cuenta-lobby" role="status">Volviendo al lobby en {{ segundosParaLobby() }}s</p>
          <button type="button" class="boton-lobby" (click)="volverAlLobby()">VOLVER AL LOBBY</button>
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
      .roster {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
        margin-top: 14px;
      }
      .numero-regresivo {
        font-size: 120px;
        font-weight: 800;
        color: #ffcc00;
        text-shadow: 0 0 0 var(--color-thick-border), 4px 4px 0 var(--color-thick-border);
      }
      .panel--podio {
        min-width: 260px;
        pointer-events: auto;
      }
      .cuenta-lobby {
        margin-top: 14px;
        font-size: 11px;
        opacity: 0.7;
      }
      .boton-lobby {
        margin-top: 8px;
        cursor: pointer;
        border: 3px solid var(--color-thick-border);
        border-radius: 10px;
        padding: 10px 20px;
        background: var(--grad-play-button);
        color: #111424;
        font-weight: 800;
        font-size: 14px;
        text-transform: uppercase;
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
  private static readonly SEGUNDOS_VUELTA_LOBBY = 10;

  private readonly store = inject(EstadoPartidaStore);
  private readonly router = inject(Router);
  private intervaloVuelta: ReturnType<typeof setInterval> | null = null;

  readonly estado = computed(() => this.store.ultimoSnapshot()?.estado ?? null);
  readonly resultado = this.store.resultadoFinal;
  protected readonly segundosParaLobby = signal(OverlayEstadoComponent.SEGUNDOS_VUELTA_LOBBY);

  constructor() {
    effect(() => {
      if (this.resultado() !== null) {
        this.iniciarCuentaRegresiva();
      }
    });
    inject(DestroyRef).onDestroy(() => this.detenerCuentaRegresiva());
  }

  protected volverAlLobby(): void {
    this.detenerCuentaRegresiva(); // cancela ANTES de navegar: el timer no navega una segunda vez
    this.router.navigate(['/lobby']);
  }

  private iniciarCuentaRegresiva(): void {
    if (this.intervaloVuelta !== null) {
      return; // ya esta corriendo (el effect puede volver a leer el signal sin que resultado cambie)
    }
    this.intervaloVuelta = setInterval(() => {
      const restantes = this.segundosParaLobby() - 1;
      this.segundosParaLobby.set(restantes);
      if (restantes <= 0) {
        this.detenerCuentaRegresiva();
        this.router.navigate(['/lobby']);
      }
    }, 1000);
  }

  private detenerCuentaRegresiva(): void {
    if (this.intervaloVuelta !== null) {
      clearInterval(this.intervaloVuelta);
      this.intervaloVuelta = null;
    }
  }

  readonly cantidadJugadores = computed(() => this.store.ultimoSnapshot()?.jugadores.length ?? 0);
  readonly jugadoresLobby = computed(() => this.store.ultimoSnapshot()?.jugadores ?? []);

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

  personajeDe(idJugador: string): Personaje {
    return this.store.ultimoSnapshot()?.jugadores.find((jugador) => jugador.id === idJugador)?.personaje ?? 'GATO';
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
