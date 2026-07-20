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

const INTERVALO_POLLING_MS = 1_500;
const CLAVE_RENDERER = 'zc.renderer';
type ModoRenderer = 'top-down' | 'isometrico' | '3d';

interface MisionDecorativa {
  texto: string;
  hecha: boolean;
}

@Component({
  selector: 'app-lobby-page',
  imports: [DecimalPipe, PersonajeRetratoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="fondo-espacial min-h-screen text-white relative">
      <div class="mx-auto max-w-7xl px-4 py-6">
        <!-- HEADER PRINCIPAL -->
        <header class="mb-6 flex items-center justify-between">
          <h1 class="text-2xl font-extrabold tracking-widest text-amber-400 drop-shadow-md">ZONA CERO</h1>
          <div class="flex items-center gap-3">
            <button
              type="button"
              (click)="mostrarModalConfiguracion.set(true)"
              class="flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold uppercase transition hover:bg-white/10"
              style="border-color: var(--color-thick-border)"
            >
              <span>⚙️</span>
              <span>Configuración</span>
            </button>

            <button
              type="button"
              (click)="salir()"
              class="rounded-full border-2 px-4 py-2 text-sm font-bold uppercase transition hover:bg-red-500/20 hover:border-red-400"
              style="border-color: var(--color-thick-border)"
            >
              Salir
            </button>
          </div>
        </header>

        <div class="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr_300px]">
          <!-- IZQUIERDA: PANEL DEL JUGADOR -->
          <aside aria-labelledby="jugador-heading" class="panel order-2 flex flex-col gap-4 lg:order-1">
            <h2 id="jugador-heading" class="sr-only">Tu perfil</h2>

            <div class="flex items-center gap-3">
              <app-personaje-retrato [personaje]="personajeActual()" [tamano]="72" />
              <div>
                <p class="text-lg font-extrabold text-white">{{ authService.usuarioActual()?.nombreUsuario }}</p>
                <p class="text-xs font-bold uppercase text-amber-400">Lv. {{ NIVEL_DECORATIVO }}</p>
              </div>
            </div>

            <div class="chip-rango" aria-hidden="true">RANK: {{ RANGO_DECORATIVO }}</div>

            @if (misEstadisticas(); as stats) {
              <dl class="grid grid-cols-2 gap-3 text-sm">
                <div class="bg-black/30 p-2 rounded-lg border border-white/10">
                  <dt class="opacity-70 text-xs font-bold">WINS</dt>
                  <dd class="text-lg font-extrabold text-emerald-400">{{ stats.victorias }}</dd>
                </div>
                <div class="bg-black/30 p-2 rounded-lg border border-white/10">
                  <dt class="opacity-70 text-xs font-bold">KILLS</dt>
                  <dd class="text-lg font-extrabold text-amber-400">{{ stats.kills }}</dd>
                </div>
                <div class="bg-black/30 p-2 rounded-lg border border-white/10">
                  <dt class="opacity-70 text-xs font-bold">K/D</dt>
                  <dd class="text-lg font-extrabold text-sky-400">{{ stats.kd | number: '1.2-2' }}</dd>
                </div>
                <div class="bg-black/30 p-2 rounded-lg border border-white/10">
                  <dt class="opacity-70 text-xs font-bold">TOP 3</dt>
                  <dd class="text-lg font-extrabold text-purple-400">{{ stats.top3 }}</dd>
                </div>
              </dl>
            } @else {
              <p class="text-sm opacity-70">Cargando estadísticas...</p>
            }

            <div aria-hidden="true">
              <p class="mb-2 text-xs font-bold uppercase opacity-70">Insignias</p>
              <ul class="grid grid-cols-2 gap-2">
                @for (insignia of INSIGNIAS_DECORATIVAS; track insignia) {
                  <li class="chip-insignia">{{ insignia }}</li>
                }
              </ul>
            </div>
          </aside>

          <!-- CENTRO: SHOWCASE STAGE DEL PERSONAJE SELECCIONADO -->
          <section aria-labelledby="party-heading" class="panel order-1 flex flex-col items-center justify-between gap-6 lg:order-2 min-h-[460px]">
            <h2 id="party-heading" class="text-center text-xl font-black uppercase tracking-wider text-amber-400">
              Battle Royale — Party Lobby
            </h2>

            <!-- ESCENARIO PRINCIPAL / STAGE DEL PERSONAJE -->
            <div class="flex flex-col items-center justify-center relative w-full py-4">
              <!-- Halo resplandeciente según color del personaje -->
              <div
                class="absolute w-48 h-48 rounded-full blur-3xl opacity-35 pointer-events-none transition-all duration-300"
                [style.background]="COLORES_CSS[personajeActual()]"
              ></div>

              <!-- Retrato HD Grande -->
              <div
                class="relative p-3 rounded-full border-4 shadow-2xl transition-transform hover:scale-105"
                [style.borderColor]="COLORES_CSS[personajeActual()]"
                [style.boxShadow]="'0 0 30px ' + COLORES_CSS[personajeActual()] + '80'"
              >
                <app-personaje-retrato [personaje]="personajeActual()" [tamano]="140" />
                <span class="absolute bottom-1 right-1 bg-emerald-500 text-black text-xs font-black px-2 py-0.5 rounded-full border-2 border-slate-900">
                  READY
                </span>
              </div>

              <!-- Nombre y detalles del personaje -->
              <h3 class="mt-4 text-2xl font-black uppercase tracking-wide text-white drop-shadow-md">
                {{ nombreDe(personajeActual()) }}
              </h3>
              <p class="text-xs font-extrabold uppercase text-slate-400">
                XP: {{ XP_DECORATIVO[personajeActual()] }} PTOS
              </p>

              <!-- BOTÓN DESTACADO PARA CAMBIAR PERSONAJE -->
              <button
                type="button"
                (click)="mostrarModalPersonajes.set(true)"
                class="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-black uppercase text-sm bg-slate-900/80 hover:bg-slate-800 transition hover:scale-105 border-amber-400 text-amber-300 shadow-lg"
              >
                <span>👕</span>
                <span>Cambiar Personaje</span>
              </button>
            </div>

            @if (errorPersonaje(); as mensaje) {
              <p role="alert" class="text-sm text-red-400 font-bold">{{ mensaje }}</p>
            }

            <!-- BOTÓN GIGANTE PLAY -->
            <button
              type="button"
              (click)="jugar()"
              [disabled]="buscando()"
              class="boton-play w-full"
            >
              {{ buscando() ? 'Buscando... ' + (jugadoresEncontrados() ?? 0) + '/10' : 'Play' }}
            </button>

            @if (errorMatchmaking(); as mensaje) {
              <p role="alert" class="text-sm text-red-400 font-bold">{{ mensaje }}</p>
            }
          </section>

          <!-- DERECHA: RANKING REAL + MISIONES -->
          <aside aria-labelledby="misiones-heading" class="order-3 flex flex-col gap-5">
            <div class="panel" aria-labelledby="ranking-heading">
              <h2 id="ranking-heading" class="mb-3 text-sm font-extrabold uppercase tracking-wide text-amber-400">Ranking (Top 10)</h2>
              @if (ranking(); as pagina) {
                <table class="w-full text-left text-xs">
                  <thead>
                    <tr class="uppercase opacity-70 border-b border-white/10">
                      <th scope="col" class="py-1.5">Usuario</th>
                      <th scope="col" class="py-1.5">Wins</th>
                      <th scope="col" class="py-1.5">K/D</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (fila of pagina.content; track fila.nombreUsuario) {
                      <tr class="border-t" style="border-color: var(--color-thick-border)">
                        <td class="py-1.5 font-bold">{{ fila.nombreUsuario }}</td>
                        <td class="py-1.5 text-emerald-400 font-black">{{ fila.victorias }}</td>
                        <td class="py-1.5 text-sky-400 font-bold">{{ fila.kd | number: '1.2-2' }}</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="3" class="py-2">Todavía no hay partidas jugadas.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              } @else {
                <p class="text-xs opacity-70">Cargando...</p>
              }
            </div>

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
          </aside>
        </div>
      </div>

      <!-- MODAL DE SELECCIÓN DE PERSONAJE -->
      @if (mostrarModalPersonajes()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div class="bg-slate-900 border-4 border-amber-400 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative">
            <div class="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <h3 class="text-xl font-black uppercase text-amber-400">Seleccionar Héroe Pirata</h3>
              <button
                type="button"
                (click)="mostrarModalPersonajes.set(false)"
                class="text-slate-400 hover:text-white font-black text-xl px-2"
              >
                ✕
              </button>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-1">
              @for (opcion of personajes; track opcion) {
                <button
                  type="button"
                  (click)="elegirPersonajeEnModal(opcion)"
                  [disabled]="cambiandoPersonaje()"
                  class="tarjeta-personaje"
                  [class.tarjeta-personaje--activa]="opcion === personajeActual()"
                  [style.borderColor]="opcion === personajeActual() ? COLORES_CSS[opcion] : 'var(--color-thick-border)'"
                  [style.boxShadow]="opcion === personajeActual() ? '0 0 14px ' + COLORES_CSS[opcion] + '60' : 'none'"
                >
                  @if (opcion === personajeActual()) {
                    <span class="tarjeta-personaje__check" aria-hidden="true">✓</span>
                  }

                  <app-personaje-retrato [personaje]="opcion" [tamano]="84" />
                  <span class="tarjeta-personaje__nombre">{{ nombreDe(opcion) }}</span>
                  <span class="tarjeta-personaje__xp" aria-hidden="true">{{ XP_DECORATIVO[opcion] }} XP</span>

                  <span class="tarjeta-personaje__estado" [style.color]="COLORES_CSS[opcion]">
                    {{ opcion === personajeActual() ? '[SELECCIONADO]' : '[ELEGIR]' }}
                  </span>
                </button>
              }
            </div>

            <div class="mt-6 flex justify-end">
              <button
                type="button"
                (click)="mostrarModalPersonajes.set(false)"
                class="px-6 py-2 bg-slate-800 border-2 border-white/20 rounded-xl font-bold uppercase hover:bg-slate-700"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL DE CONFIGURACIÓN DE VISTA DE JUEGO -->
      @if (mostrarModalConfiguracion()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div class="bg-slate-900 border-4 border-sky-400 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div class="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <h3 class="text-xl font-black uppercase text-sky-400">⚙️ Configuración de Vista</h3>
              <button
                type="button"
                (click)="mostrarModalConfiguracion.set(false)"
                class="text-slate-400 hover:text-white font-black text-xl px-2"
              >
                ✕
              </button>
            </div>

            <p class="text-sm text-slate-300 mb-4 font-medium">
              Elegí la vista predeterminada para tus partidas. Podrás cambiarla durante el juego presionando la tecla <kbd class="px-2 py-0.5 bg-slate-800 border rounded font-mono text-amber-300">V</kbd>.
            </p>

            <div class="flex flex-col gap-3">
              <button
                type="button"
                (click)="guardarModoRenderer('3d')"
                class="flex items-center justify-between p-4 rounded-xl border-2 transition text-left"
                [class.border-amber-400]="modoRendererGuardado() === '3d'"
                [class.bg-amber-400\/10]="modoRendererGuardado() === '3d'"
                [class.border-white\/10]="modoRendererGuardado() !== '3d'"
                [class.bg-slate-800\/50]="modoRendererGuardado() !== '3d'"
              >
                <div>
                  <p class="font-black text-white text-base">🎮 3D Real (Three.js)</p>
                  <p class="text-xs text-slate-400">Modelos 3D completos, iluminación PBR, cámaras 3ra/1ra persona.</p>
                </div>
                @if (modoRendererGuardado() === '3d') {
                  <span class="text-amber-400 font-extrabold text-xl">✓</span>
                }
              </button>

              <button
                type="button"
                (click)="guardarModoRenderer('isometrico')"
                class="flex items-center justify-between p-4 rounded-xl border-2 transition text-left"
                [class.border-amber-400]="modoRendererGuardado() === 'isometrico'"
                [class.bg-amber-400\/10]="modoRendererGuardado() === 'isometrico'"
                [class.border-white\/10]="modoRendererGuardado() !== 'isometrico'"
                [class.bg-slate-800\/50]="modoRendererGuardado() !== 'isometrico'"
              >
                <div>
                  <p class="font-black text-white text-base">📐 Isométrico (2.5D)</p>
                  <p class="text-xs text-slate-400">Perspectiva diagonal estilizada con ordenamiento de profundidad.</p>
                </div>
                @if (modoRendererGuardado() === 'isometrico') {
                  <span class="text-amber-400 font-extrabold text-xl">✓</span>
                }
              </button>

              <button
                type="button"
                (click)="guardarModoRenderer('top-down')"
                class="flex items-center justify-between p-4 rounded-xl border-2 transition text-left"
                [class.border-amber-400]="modoRendererGuardado() === 'top-down'"
                [class.bg-amber-400\/10]="modoRendererGuardado() === 'top-down'"
                [class.border-white\/10]="modoRendererGuardado() !== 'top-down'"
                [class.bg-slate-800\/50]="modoRendererGuardado() !== 'top-down'"
              >
                <div>
                  <p class="font-black text-white text-base">🎯 2D Top-Down</p>
                  <p class="text-xs text-slate-400">Vista cenital clásica desde arriba en 2D puro.</p>
                </div>
                @if (modoRendererGuardado() === 'top-down') {
                  <span class="text-amber-400 font-extrabold text-xl">✓</span>
                }
              </button>
            </div>

            <div class="mt-6 flex justify-end">
              <button
                type="button"
                (click)="mostrarModalConfiguracion.set(false)"
                class="px-6 py-2 bg-sky-600 hover:bg-sky-500 rounded-xl font-bold uppercase text-white shadow-lg"
              >
                Guardar y Cerrar
              </button>
            </div>
          </div>
        </div>
      }
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
        transition: transform 0.1s ease-in-out;
      }
      .boton-play:hover:not(:disabled) {
        transform: scale(1.02);
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
    MAKO: '#10b981',
    SHARK: '#6366f1',
    GATO: '#d97706',
    ARDILLA: '#06b6d4',
    DINO: '#ec4899',
    ROBO_PERRO: '#3b82f6',
    CONEJO: '#94a3b8',
  };

  protected readonly NIVEL_DECORATIVO = 28;
  protected readonly RANGO_DECORATIVO = 'GOLD III';
  protected readonly INSIGNIAS_DECORATIVAS = ['Champion', 'Survivor', 'Elite', 'Legendary'];
  protected readonly MISIONES_DECORATIVAS: MisionDecorativa[] = [
    { texto: 'Misión diaria completa', hecha: true },
    { texto: 'Misiones semanales', hecha: true },
    { texto: 'Mejor racha de victorias', hecha: false },
  ];
  protected readonly XP_DECORATIVO: Record<Personaje, number> = {
    BARBARROJA: 8500,
    PIRATA_ANNE: 7200,
    PIRATA_HENRY: 6800,
    ESQUELETO: 9100,
    TIBURON: 7900,
    MAKO: 8200,
    SHARK: 8900,
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

  protected readonly mostrarModalConfiguracion = signal(false);
  protected readonly mostrarModalPersonajes = signal(false);
  protected readonly modoRendererGuardado = signal<ModoRenderer>(this.leerModoRendererGuardado());

  private suscripcionPolling: Subscription | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.suscripcionPolling?.unsubscribe());
  }

  guardarModoRenderer(modo: ModoRenderer): void {
    localStorage.setItem(CLAVE_RENDERER, modo);
    this.modoRendererGuardado.set(modo);
  }

  private leerModoRendererGuardado(): ModoRenderer {
    const val = localStorage.getItem(CLAVE_RENDERER);
    return val === '3d' || val === 'isometrico' || val === 'top-down' ? val : '3d';
  }

  jugar(): void {
    this.buscando.set(true);
    this.errorMatchmaking.set(null);
    this.matchmakingService.encolar().subscribe({
      next: () => this.iniciarPolling(),
      error: (error: HttpErrorResponse) => {
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

  elegirPersonajeEnModal(personaje: Personaje): void {
    this.elegirPersonaje(personaje);
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
