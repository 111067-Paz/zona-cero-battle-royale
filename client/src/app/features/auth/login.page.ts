import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ErrorApi } from '../../models/error-api';

/** Pantalla de login (PLAN §10-F5, Flujo I). Sin re-validar complejidad de password (§ backend). */
@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="flex min-h-screen items-center justify-center px-4">
      <section aria-labelledby="login-heading" class="w-full max-w-sm">
        <h1 id="login-heading" class="mb-6 text-center text-3xl font-extrabold tracking-wide">
          ZONA CERO
        </h1>

        <form [formGroup]="form" (ngSubmit)="enviar()" class="flex flex-col gap-4" novalidate>
          <div class="flex flex-col gap-1">
            <label for="nombreUsuario" class="text-sm font-bold uppercase">Usuario</label>
            <input
              id="nombreUsuario"
              type="text"
              formControlName="nombreUsuario"
              autocomplete="username"
              class="rounded-lg border-2 px-3 py-2 text-black"
              style="border-color: var(--color-thick-border)"
            />
            @if (
              form.controls.nombreUsuario.touched && form.controls.nombreUsuario.hasError('required')
            ) {
              <p role="alert" class="text-sm text-red-400">El usuario es obligatorio.</p>
            }
          </div>

          <div class="flex flex-col gap-1">
            <label for="password" class="text-sm font-bold uppercase">Contrasenia</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              autocomplete="current-password"
              class="rounded-lg border-2 px-3 py-2 text-black"
              style="border-color: var(--color-thick-border)"
            />
            @if (form.controls.password.touched && form.controls.password.hasError('required')) {
              <p role="alert" class="text-sm text-red-400">La contrasenia es obligatoria.</p>
            }
          </div>

          @if (mensajeError(); as mensaje) {
            <p role="alert" class="text-sm text-red-400">{{ mensaje }}</p>
          }

          <button
            type="submit"
            [disabled]="enviando()"
            class="mt-2 h-12 rounded-full text-lg font-extrabold uppercase text-black disabled:opacity-60"
            style="background: var(--grad-play-button); border: 3px solid var(--color-thick-border)"
          >
            {{ enviando() ? 'Entrando...' : 'Entrar' }}
          </button>
        </form>

        <p class="mt-4 text-center text-sm">
          No tenes cuenta?
          <a routerLink="/registro" class="font-bold underline">Registrate</a>
        </p>
      </section>
    </main>
  `,
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly enviando = signal(false);
  readonly mensajeError = signal<string | null>(null);

  readonly form = new FormGroup({
    nombreUsuario: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.mensajeError.set(null);
    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/lobby']),
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        const cuerpo = error.error as ErrorApi | null;
        this.mensajeError.set(cuerpo?.message ?? 'No se pudo iniciar sesion.');
      },
    });
  }
}
