import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ErrorApi } from '../../models/error-api';

/** Regex IDENTICOS a `RegisterRequest` del backend: el contrato de validacion coincide en ambas capas. */
const PATRON_USUARIO = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const PATRON_EMAIL = /^[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}$/;
const PATRON_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

function passwordsCoincidenValidator(grupo: AbstractControl): ValidationErrors | null {
  const password = grupo.get('password')?.value;
  const confirmar = grupo.get('confirmarPassword')?.value;
  return password === confirmar ? null : { passwordsNoCoinciden: true };
}

/** Alta de cuenta (PLAN §10-F5, Flujo I). */
@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="flex min-h-screen items-center justify-center px-4">
      <section aria-labelledby="registro-heading" class="w-full max-w-sm">
        <h1 id="registro-heading" class="mb-6 text-center text-3xl font-extrabold tracking-wide">
          CREAR CUENTA
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
            @if (form.controls.nombreUsuario.touched) {
              @if (form.controls.nombreUsuario.hasError('required')) {
                <p role="alert" class="text-sm text-red-400">El usuario es obligatorio.</p>
              } @else if (
                form.controls.nombreUsuario.hasError('minlength') ||
                form.controls.nombreUsuario.hasError('maxlength')
              ) {
                <p role="alert" class="text-sm text-red-400">Debe tener entre 3 y 50 caracteres.</p>
              } @else if (form.controls.nombreUsuario.hasError('pattern')) {
                <p role="alert" class="text-sm text-red-400">
                  Debe empezar con una letra y usar solo letras, numeros o guion bajo.
                </p>
              }
            }
          </div>

          <div class="flex flex-col gap-1">
            <label for="email" class="text-sm font-bold uppercase">Email</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="email"
              class="rounded-lg border-2 px-3 py-2 text-black"
              style="border-color: var(--color-thick-border)"
            />
            @if (form.controls.email.touched) {
              @if (form.controls.email.hasError('required')) {
                <p role="alert" class="text-sm text-red-400">El email es obligatorio.</p>
              } @else if (form.controls.email.hasError('pattern')) {
                <p role="alert" class="text-sm text-red-400">El email debe ser valido (ej: nombre&#64;dominio.com).</p>
              }
            }
          </div>

          <div class="flex flex-col gap-1">
            <label for="password" class="text-sm font-bold uppercase">Contrasenia</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              autocomplete="new-password"
              class="rounded-lg border-2 px-3 py-2 text-black"
              style="border-color: var(--color-thick-border)"
            />
            @if (form.controls.password.touched) {
              @if (form.controls.password.hasError('required')) {
                <p role="alert" class="text-sm text-red-400">La contrasenia es obligatoria.</p>
              } @else if (form.controls.password.hasError('minlength')) {
                <p role="alert" class="text-sm text-red-400">Debe tener entre 8 y 100 caracteres.</p>
              } @else if (form.controls.password.hasError('pattern')) {
                <p role="alert" class="text-sm text-red-400">
                  Debe incluir una mayuscula, una minuscula y un numero.
                </p>
              }
            }
          </div>

          <div class="flex flex-col gap-1">
            <label for="confirmarPassword" class="text-sm font-bold uppercase">Confirmar contrasenia</label>
            <input
              id="confirmarPassword"
              type="password"
              formControlName="confirmarPassword"
              autocomplete="new-password"
              class="rounded-lg border-2 px-3 py-2 text-black"
              style="border-color: var(--color-thick-border)"
            />
            @if (form.controls.confirmarPassword.touched && form.hasError('passwordsNoCoinciden')) {
              <p role="alert" class="text-sm text-red-400">Las contrasenias no coinciden.</p>
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
            {{ enviando() ? 'Creando...' : 'Crear cuenta' }}
          </button>
        </form>

        <p class="mt-4 text-center text-sm">
          Ya tenes cuenta?
          <a routerLink="/login" class="font-bold underline">Entra</a>
        </p>
      </section>
    </main>
  `,
})
export class RegisterPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly enviando = signal(false);
  readonly mensajeError = signal<string | null>(null);

  readonly form = new FormGroup(
    {
      nombreUsuario: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
          Validators.pattern(PATRON_USUARIO),
        ],
      }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(PATRON_EMAIL)],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(100),
          Validators.pattern(PATRON_PASSWORD),
        ],
      }),
      confirmarPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: passwordsCoincidenValidator },
  );

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.mensajeError.set(null);
    const { confirmarPassword: _confirmarPassword, ...request } = this.form.getRawValue();
    this.authService.register(request).subscribe({
      next: () => this.router.navigate(['/lobby']),
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        const cuerpo = error.error as ErrorApi | null;
        this.mensajeError.set(cuerpo?.message ?? 'No se pudo crear la cuenta.');
      },
    });
  }
}
