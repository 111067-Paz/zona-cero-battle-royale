import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UsuarioDTO } from '../../models/auth';
import { Personaje } from '../../models/personajes';

/** Perfil del usuario autenticado (fase "seleccion de personaje"): hoy solo el personaje. */
@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);

  actualizarPersonaje(personaje: Personaje): Observable<UsuarioDTO> {
    return this.http.put<UsuarioDTO>('/api/perfil/personaje', { personaje });
  }
}
