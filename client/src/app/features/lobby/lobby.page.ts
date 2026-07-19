import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subscription, switchMap, timer } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ErrorApi } from '../../models/error-api';
import { especificacionDe, LISTA_PERSONAJES, Personaje } from '../../models/personajes';
import { PersonajeRetratoComponent } from '../../shared/personaje-retrato.component';
import { EstadisticaService } from './estadistica.service';
import { MatchmakingService } from './matchmaking.service';
import { PerfilService } from './perfil.service';

/** Cada cuanto se pollea /api/matchmaking/estado mientras se busca partida (R21). */
const INTERVALO_POLLING_MS = 1_500;

interface MisionDecorativa {
  texto: string;
  hecha: boolean;
}

/**
 * Lobby real (PLAN §10-F5/§10-F6, Flujo I/G). PLAY dispara la cola de matchmaking real: encola,
 * pollea "n/10" y navega a `/partida` apenas el actor de matchmaking asigna una partida.
 *
 * <p>Rediseno visual (fase "Matchmaking Lobby"): replica el layout del mockup de referencia
 * (panel jugador / grilla de personajes / misiones+tienda). Todo lo marcado DECORATIVO en el
 * template no tiene contraparte en el backend (XP, rango, insignias, misiones, tienda) — se deja
 * fijo a proposito, sin fingir que persiste. El resto (seleccion, stats, ranking, matchmaking)
 * sigue siendo 100% real, sin tocar la logica existente.
 */
@Component({
  selector: 'app-lobby-page',
  imports: [DecimalPipe, PersonajeRetratoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="fondo-espacial min-h-screen text-white">
      <div class="mx-auto max-w-7xl px-4 py-6">
        <header class="mb-6 flex items-center justify-between">
          <h1 class="text-2xl font-extrabold tracking-widest">ZONA CERO</h1>
          <button
            type="button"
            (click)="salir()"
            class="rounded-full border-2 px-4 py-2 text-sm font-bold uppercase"
            style="border-color: var(--color-thick-border)"
          >
            Salir
          </button>
        </header>

        <div class="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr_300px]">
          <!-- IZQUIERDA: panel del jugador -->
          <aside aria-labelledby="jugador-heading" class="panel order-2 flex flex-col gap-4 lg:order-1">
            <h2 id="jugador-heading" class="sr-only">Tu perfil</h2>

            <div class="flex items-center gap-3">
              <app-personaje-retrato [personaje]="personajeActual()" [tamano]="72" />
              <div>
                <p class="text-lg font-extrabold">{{ authService.usuarioActual()?.nombreUsuario }}</p>
                <!-- DECORATIVO: sin backend -->
                <p class="text-xs font-bold uppercase opacity-70">Lv. {{ NIVEL_DECORATIVO }}</p>
              </div>
            </div>

            <!-- DECORATIVO: sin backend -->
            <div class="chip-rango" aria-hidden="true">RANK: {{ RANGO_DECORATIVO }}</div>

            @if (misEstadisticas(); as stats) {
              <dl class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt class="opacity-70">WINS</dt>
                  <dd class="text-lg font-extrabold">{{ stats.victorias }}</dd>
                </div>
                <div>
                  <dt class="opacity-70">KILLS</dt>
                  <dd class="text-lg font-extrabold">{{ stats.kills }}</dd>
                </div>
                <div>
                  <dt class="opacity-70">K/D</dt>
                  <dd class="text-lg font-extrabold">{{ stats.kd | number: '1.2-2' }}</dd>
                </div>
                <div>
                  <dt class="opacity-70">TOP 3</dt>
                  <dd class="text-lg font-extrabold">{{ stats.top3 }}</dd>
                </div>
              </dl>
            } @else {
              <p class="text-sm opacity-70">Cargando estadisticas...</p>
            }

            <!-- DECORATIVO: sin backend -->
            <div aria-hidden="true">
              <p class="mb-2 text-xs font-bold uppercase opacity-70">Insignias</p>
              <ul class="grid grid-cols-2 gap-2">
                @for (insignia of INSIGNIAS_DECORATIVAS; track insignia) {
                  <li class="chip-insignia">{{ insignia }}</li>
                }
              </ul>
            </div>
          </aside>

          <!-- CENTRO: party lobby + play -->
          <section aria-labelledby="party-heading" class="panel order-1 flex flex-col gap-4 lg:order-2">
            <h2 id="party-heading" class="text-center text-xl font-extrabold uppercase tracking-wide">
              Party Lobby — Elegi tu personaje
            </h2>

            <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
              @for (opcion of personajes; track opcion) {
                <button
                  type="button"
                  (click)="elegirPersonaje(opcion)"
                  [disabled]="cambiandoPersonaje()"
                  [attr.aria-pressed]="opcion === personajeActual()"
                  class="tarjeta-personaje"
                  [class.tarjeta-personaje--activa]="opcion === personajeActual()"
                  [style.borderColor]="opcion === personajeActual() ? COLORES_CSS[opcion] : 'var(--color-thick-border)'"
                  [style.boxShadow]="opcion === personajeActual() ? '0 0 14px ' + COLORES_CSS[opcion] + '50' : 'none'"
                >
                  <!-- Rayo de poder -->
                  @if (opcion === 'DINO' || opcion === 'ROBO_PERRO' || opcion === 'CONEJO') {
                    <span class="tarjeta-personaje__rayo" aria-hidden="true">⚡</span>
                  }

                  <!-- Check de Listo -->
                  @if (opcion === personajeActual()) {
                    <span class="tarjeta-personaje__check" aria-hidden="true">✓</span>
                  }

                  <app-personaje-retrato [personaje]="opcion" [tamano]="84" />
                  <span class="tarjeta-personaje__nombre">{{ nombreDe(opcion) }}</span>
                  <!-- DECORATIVO: sin backend -->
                  <span class="tarjeta-personaje__xp" aria-hidden="true">{{ XP_DECORATIVO[opcion] }} XP</span>
                  
                  <span class="tarjeta-personaje__estado" [style.color]="COLORES_CSS[opcion]">
                    [READY]
                  </span>
                </button>
              }
              <!-- DECORATIVO: sin backend -->
              <button type="button" disabled class="tarjeta-invitar" aria-label="Invitar amigo (proximamente)">
                <span class="tarjeta-invitar__texto">INVITE FRIEND</span>
              </button>
            </div>

            @if (errorPersonaje(); as mensaje) {
              <p role="alert" class="text-sm text-red-400">{{ mensaje }}</p>
            }

            <button
              type="button"
              (click)="jugar()"
              [disabled]="buscando()"
              class="boton-play"
            >
              {{ buscando() ? 'Buscando... ' + (jugadoresEncontrados() ?? 0) + '/10' : 'Play' }}
            </button>

            @if (errorMatchmaking(); as mensaje) {
              <p role="alert" class="text-sm text-red-400">{{ mensaje }}</p>
            }
          </section>

          <!-- DERECHA: misiones/tienda decorativas + ranking real -->
          <aside aria-labelledby="misiones-heading" class="order-3 flex flex-col gap-5">
            <!-- DECORATIVO: sin backend -->
            <div class="panel" aria-hidden="true">
              <h2 id="misiones-heading" class="mb-3 text-sm font-extrabold uppercase tracking-wide">Misiones</h2>
              <ul class="flex flex-col gap-2 text-sm">
                @for (mision of MISIONES_DECORATIVAS; track mision.texto) {
                  <li class="flex items-center justify-between">
                    <span [class.opacity-50]="mision.hecha">{{ mision.texto }}</span>
                    <span [class.text-green-400]="mision.hecha">{{ mision.hecha ? '✓' : '…' }}</span>
                  </li>
                }
              </ul>
            </div>

            <!-- DECORATIVO: sin backend -->
            <div class="panel" aria-hidden="true">
              <h2 class="mb-2 text-sm font-extrabold uppercase tracking-wide">Tienda destacada</h2>
              <p class="text-xs opacity-70">Proximamente: skins y objetos.</p>
            </div>

            <div class="panel" aria-labelledby="ranking-heading">
              <h2 id="ranking-heading" class="mb-3 text-sm font-extrabold uppercase tracking-wide">Ranking (top 10)</h2>
              @if (ranking(); as pagina) {
                <table class="w-full text-left text-xs">
                  <thead>
                    <tr class="uppercase opacity-70">
                      <th scope="col" class="py-1">Usuario</th>
                      <th scope="col" class="py-1">Wins</th>
                      <th scope="col" class="py-1">K/D</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (fila of pagina.content; track fila.nombreUsuario) {
                      <tr class="border-t" style="border-color: var(--color-thick-border)">
                        <td class="py-1">{{ fila.nombreUsuario }}</td>
                        <td class="py-1">{{ fila.victorias }}</td>
                        <td class="py-1">{{ fila.kd | number: '1.2-2' }}</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="3" class="py-2">Todavia no hay partidas jugadas.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              } @else {
                <p class="text-xs opacity-70">Cargando...</p>
              }
            </div>
          </aside>
        </div>
      </div>
    </main>
  `,
  styles: [
    `
      .fondo-espacial {
        background-color: #0a1128;
        background-image:
          radial-gradient(ellipse at 20% 15%, rgba(60, 90, 200, 0.25), transparent 50%),
          radial-gradient(ellipse at 85% 75%, rgba(110, 70, 220, 0.18), transparent 45%),
          radial-gradient(1.5px 1.5px at 25px 35px, rgba(255, 255, 255, 0.8), transparent),
          radial-gradient(1px 1px at 120px 90px, rgba(255, 255, 255, 0.5), transparent),
          radial-gradient(2px 2px at 200px 160px, rgba(255, 255, 255, 0.9), transparent),
          radial-gradient(1px 1px at 60px 210px, rgba(255, 255, 255, 0.4), transparent);
        background-repeat: no-repeat, no-repeat, repeat, repeat, repeat, repeat;
        background-size: 100% 100%, 100% 100%, 240px 240px, 240px 240px, 240px 240px, 240px 240px;
      }
      .panel {
        border: 3px solid var(--color-thick-border);
        border-radius: 16px;
        padding: 16px;
        background: rgba(15, 22, 48, 0.75);
        backdrop-filter: blur(2px);
      }
      .chip-rango {
        align-self: flex-start;
        border: 2px solid #facc15;
        border-radius: 999px;
        padding: 2px 12px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.5px;
        color: #facc15;
      }
      .chip-insignia {
        border: 2px solid var(--color-thick-border);
        border-radius: 10px;
        padding: 6px 8px;
        font-size: 10px;
        font-weight: 800;
        text-align: center;
        text-transform: uppercase;
        background: rgba(255, 255, 255, 0.05);
      }
      .tarjeta-personaje {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        border: 3px solid var(--color-thick-border);
        border-radius: 16px;
        padding: 12px 6px 10px;
        background: #0b1528;
        cursor: pointer;
        transition: border-color 0.15s ease-out, box-shadow 0.15s ease-out;
        overflow: visible;
      }
      .tarjeta-personaje:disabled {
        opacity: 0.6;
        cursor: default;
      }
      .tarjeta-personaje--activa {
        background: #0b1528;
      }
      .tarjeta-personaje__nombre {
        font-size: 13px;
        font-weight: 900;
        text-transform: uppercase;
        text-align: center;
        color: #ffffff;
        margin-top: 4px;
      }
      .tarjeta-personaje__xp {
        font-size: 10px;
        font-weight: 700;
        color: #94a3b8;
      }
      .tarjeta-personaje__rayo {
        position: absolute;
        top: 8px;
        left: 8px;
        font-size: 14px;
        color: #eab308;
        z-index: 5;
      }
      .tarjeta-personaje__check {
        position: absolute;
        top: -6px;
        right: -6px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #22c55e;
        color: #ffffff;
        font-size: 11px;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2.5px solid #111424;
        z-index: 10;
        box-shadow: 0 2px 4px rgba(0,0,0,0.5);
      }
      .tarjeta-personaje__estado {
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.5px;
        margin-top: 2px;
      }
      .tarjeta-invitar {
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid #1e40af;
        border-radius: 16px;
        padding: 12px 10px;
        background: #0b1528;
        cursor: default;
      }
      .tarjeta-invitar__texto {
        color: #93c5fd;
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
        text-align: center;
      }
      .boton-play {
        height: 64px;
        border-radius: 999px;
        border: 3px solid var(--color-thick-border);
        background: var(--grad-play-button);
        color: #111424;
        font-size: 24px;
        font-weight: 800;
        text-transform: uppercase;
        cursor: pointer;
      }
      .boton-play:disabled {
        opacity: 0.8;
        cursor: default;
      }
    `,
  ],
})
export class LobbyPage {
  protected readonly COLORES_CSS: Record<Personaje, string> = {
    BARBARROJA: '#d97706',
    PIRATA_ANNE: '#ec4899',
    PIRATA_HENRY: '#3b82f6',
    ESQUELETO: '#94a3b8',
    TIBURON: '#06b6d4',
    GATO: '#d97706',
    ARDILLA: '#06b6d4',
    DINO: '#ec4899',
    ROBO_PERRO: '#3b82f6',
    CONEJO: '#94a3b8',
  };

  /** DECORATIVO: sin backend — valores fijos de ambientacion (mockup "Matchmaking Lobby"). */
  protected readonly NIVEL_DECORATIVO = 28;
  protected readonly RANGO_DECORATIVO = 'GOLD III';
  protected readonly INSIGNIAS_DECORATIVAS = ['Champion', 'Survivor', 'Elite', 'Legendary'];
  protected readonly MISIONES_DECORATIVAS: MisionDecorativa[] = [
    { texto: 'Mision diaria completa', hecha: true },
    { texto: 'Misiones semanales', hecha: true },
    { texto: 'Mejor racha de victorias', hecha: false },
  ];
  protected readonly XP_DECORATIVO: Record<Personaje, number> = {
    BARBARROJA: 8500,
    PIRATA_ANNE: 7200,
    PIRATA_HENRY: 6800,
    ESQUELETO: 9100,
    TIBURON: 7900,
    GATO: 8500,
    ARDILLA: 7900,
    DINO: 7200,
    ROBO_PERRO: 6800,
    CONEJO: 9100,
  };

  protected readonly authService = inject(AuthService);
  private readonly estadisticaService = inject(EstadisticaService);
  private readonly matchmakingService = inject(MatchmakingService);
  private readonly perfilService = inject(PerfilService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly misEstadisticas = toSignal(this.estadisticaService.misEstadisticas());
  protected readonly ranking = toSignal(this.estadisticaService.ranking());

  protected readonly buscando = signal(false);
  protected readonly jugadoresEncontrados = signal<number | null>(null);
  protected readonly errorMatchmaking = signal<string | null>(null);

  protected readonly personajes = LISTA_PERSONAJES;
  protected readonly cambiandoPersonaje = signal(false);
  protected readonly errorPersonaje = signal<string | null>(null);
  protected readonly personajeActual = () => this.authService.usuarioActual()?.personaje ?? 'BARBARROJA';

  private suscripcionPolling: Subscription | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.suscripcionPolling?.unsubscribe());
  }

  jugar(): void {
    this.buscando.set(true);
    this.errorMatchmaking.set(null);
    this.matchmakingService.encolar().subscribe({
      next: () => this.iniciarPolling(),
      error: (error: HttpErrorResponse) => {
        // 409: ya estaba en cola (otra pestana, reintento) — igual vale la pena pollear el estado.
        if (error.status === 409) {
          this.iniciarPolling();
          return;
        }
        this.buscando.set(false);
        const cuerpo = error.error as ErrorApi | null;
        this.errorMatchmaking.set(cuerpo?.message ?? 'No se pudo buscar partida.');
      },
    });
  }

  private iniciarPolling(): void {
    this.suscripcionPolling = timer(0, INTERVALO_POLLING_MS)
      .pipe(switchMap(() => this.matchmakingService.estado()))
      .subscribe((estado) => {
        if (estado.idPartida !== null) {
          this.suscripcionPolling?.unsubscribe();
          this.router.navigate(['/partida'], { queryParams: { idPartida: estado.idPartida } });
          return;
        }
        this.jugadoresEncontrados.set(estado.jugadoresEncontrados);
      });
  }

  elegirPersonaje(personaje: Personaje): void {
    if (personaje === this.personajeActual()) {
      return;
    }
    this.cambiandoPersonaje.set(true);
    this.errorPersonaje.set(null);
    this.perfilService.actualizarPersonaje(personaje).subscribe({
      next: (usuario) => {
        this.authService.actualizarUsuario(usuario);
        this.cambiandoPersonaje.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cambiandoPersonaje.set(false);
        const cuerpo = error.error as ErrorApi | null;
        this.errorPersonaje.set(cuerpo?.message ?? 'No se pudo cambiar el personaje.');
      },
    });
  }

  protected nombreDe(personaje: Personaje): string {
    return especificacionDe(personaje).nombre;
  }

  salir(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
