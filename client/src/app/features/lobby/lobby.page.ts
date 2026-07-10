import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subscription, switchMap, timer } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ErrorApi } from '../../models/error-api';
import { LISTA_PERSONAJES, Personaje } from '../../models/personajes';
import { PersonajeRetratoComponent } from '../../shared/personaje-retrato.component';
import { EstadisticaService } from './estadistica.service';
import { MatchmakingService } from './matchmaking.service';
import { PerfilService } from './perfil.service';

/** Cada cuanto se pollea /api/matchmaking/estado mientras se busca partida (R21). */
const INTERVALO_POLLING_MS = 1_500;

/**
 * Lobby real (PLAN §10-F5/§10-F6, Flujo I/G). PLAY dispara la cola de matchmaking real: encola,
 * pollea "n/10" y navega a `/partida` apenas el actor de matchmaking asigna una partida.
 */
@Component({
  selector: 'app-lobby-page',
  imports: [DecimalPipe, PersonajeRetratoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-4 py-8">
      <header class="flex items-center justify-between">
        <h1 class="text-3xl font-extrabold tracking-wide">ZONA CERO</h1>
        <button
          type="button"
          (click)="salir()"
          class="rounded-full border-2 px-4 py-2 text-sm font-bold uppercase"
          style="border-color: var(--color-thick-border)"
        >
          Salir
        </button>
      </header>

      <p class="text-lg">
        Hola, <span class="font-bold">{{ authService.usuarioActual()?.nombreUsuario }}</span>
      </p>

      <section aria-labelledby="personaje-heading" class="rounded-xl border-2 p-4" style="border-color: var(--color-thick-border)">
        <h2 id="personaje-heading" class="mb-3 text-xl font-bold uppercase">Tu personaje</h2>
        <div class="flex flex-wrap gap-3">
          @for (opcion of personajes; track opcion) {
            <button
              type="button"
              (click)="elegirPersonaje(opcion)"
              [disabled]="cambiandoPersonaje()"
              [attr.aria-pressed]="opcion === personajeActual()"
              class="rounded-xl border-2 p-1 disabled:opacity-60"
              [style.border-color]="opcion === personajeActual() ? 'var(--color-accent, #facc15)' : 'var(--color-thick-border)'"
            >
              <app-personaje-retrato [personaje]="opcion" [tamano]="56" />
            </button>
          }
        </div>
        @if (errorPersonaje(); as mensaje) {
          <p role="alert" class="mt-2 text-sm text-red-400">{{ mensaje }}</p>
        }
      </section>

      <button
        type="button"
        (click)="jugar()"
        [disabled]="buscando()"
        class="h-16 rounded-full text-2xl font-extrabold uppercase text-black disabled:opacity-80"
        style="background: var(--grad-play-button); border: 3px solid var(--color-thick-border)"
      >
        {{ buscando() ? 'Buscando... ' + (jugadoresEncontrados() ?? 0) + '/10' : 'Play' }}
      </button>

      @if (errorMatchmaking(); as mensaje) {
        <p role="alert" class="text-sm text-red-400">{{ mensaje }}</p>
      }

      <section aria-labelledby="mis-stats-heading" class="rounded-xl border-2 p-4" style="border-color: var(--color-thick-border)">
        <h2 id="mis-stats-heading" class="mb-3 text-xl font-bold uppercase">Mis estadisticas</h2>
        @if (misEstadisticas(); as stats) {
          <dl class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <dt class="text-xs uppercase opacity-70">Partidas</dt>
              <dd class="text-lg font-bold">{{ stats.partidasJugadas }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase opacity-70">Victorias</dt>
              <dd class="text-lg font-bold">{{ stats.victorias }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase opacity-70">Top 3</dt>
              <dd class="text-lg font-bold">{{ stats.top3 }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase opacity-70">Kills</dt>
              <dd class="text-lg font-bold">{{ stats.kills }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase opacity-70">Muertes</dt>
              <dd class="text-lg font-bold">{{ stats.muertes }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase opacity-70">K/D</dt>
              <dd class="text-lg font-bold">{{ stats.kd | number: '1.2-2' }}</dd>
            </div>
          </dl>
        } @else {
          <p>Cargando...</p>
        }
      </section>

      <section aria-labelledby="ranking-heading" class="rounded-xl border-2 p-4" style="border-color: var(--color-thick-border)">
        <h2 id="ranking-heading" class="mb-3 text-xl font-bold uppercase">Ranking (top 10)</h2>
        @if (ranking(); as pagina) {
          <table class="w-full text-left">
            <thead>
              <tr class="text-xs uppercase opacity-70">
                <th scope="col" class="py-1">Usuario</th>
                <th scope="col" class="py-1">Victorias</th>
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
          <p>Cargando...</p>
        }
      </section>
    </main>
  `,
})
export class LobbyPage {
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
  protected readonly personajeActual = () => this.authService.usuarioActual()?.personaje ?? 'GATO';

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

  salir(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
