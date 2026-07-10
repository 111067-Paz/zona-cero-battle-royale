import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest, UsuarioDTO } from '../models/auth';

const CLAVE_ACCESS_TOKEN = 'zc.accessToken';
const CLAVE_REFRESH_TOKEN = 'zc.refreshToken';
const CLAVE_USUARIO = 'zc.usuario';

/**
 * Dueno de la sesion (PLAN §4.2/§10-F5). Persiste en `localStorage` (decision confirmada: sin
 * cookies, la API es stateless) y expone el usuario actual como signal para que guards e
 * interceptor lean el MISMO estado sin duplicar parsing.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly usuarioSignal = signal<UsuarioDTO | null>(this.leerUsuarioGuardado());
  readonly usuarioActual = this.usuarioSignal.asReadonly();
  readonly estaAutenticado = computed(() => this.usuarioSignal() !== null);

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/register', request)
      .pipe(tap((respuesta) => this.guardarSesion(respuesta)));
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/login', request)
      .pipe(tap((respuesta) => this.guardarSesion(respuesta)));
  }

  refresh(): Observable<AuthResponse> {
    const refreshToken = this.refreshTokenActual();
    return this.http
      .post<AuthResponse>('/api/auth/refresh', { refreshToken })
      .pipe(tap((respuesta) => this.guardarSesion(respuesta)));
  }

  logout(): void {
    localStorage.removeItem(CLAVE_ACCESS_TOKEN);
    localStorage.removeItem(CLAVE_REFRESH_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
    this.usuarioSignal.set(null);
  }

  /** Pisa el usuario persistido (p.ej. tras cambiar el personaje) sin tocar los tokens. */
  actualizarUsuario(usuario: UsuarioDTO): void {
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
    this.usuarioSignal.set(usuario);
  }

  accessTokenActual(): string | null {
    return localStorage.getItem(CLAVE_ACCESS_TOKEN);
  }

  refreshTokenActual(): string | null {
    return localStorage.getItem(CLAVE_REFRESH_TOKEN);
  }

  private guardarSesion(respuesta: AuthResponse): void {
    localStorage.setItem(CLAVE_ACCESS_TOKEN, respuesta.accessToken);
    localStorage.setItem(CLAVE_REFRESH_TOKEN, respuesta.refreshToken);
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(respuesta.usuario));
    this.usuarioSignal.set(respuesta.usuario);
  }

  private leerUsuarioGuardado(): UsuarioDTO | null {
    const crudo = localStorage.getItem(CLAVE_USUARIO);
    if (crudo === null) {
      return null;
    }
    try {
      return JSON.parse(crudo) as UsuarioDTO;
    } catch {
      return null;
    }
  }
}
