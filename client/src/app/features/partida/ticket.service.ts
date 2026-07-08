import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { TicketResponse } from '../../models/auth';

/**
 * Pide el ticket de un solo uso para el WebSocket de juego (PLAN §5.5, R1). Se pide justo antes
 * de UNIRSE (TTL de 30s en el server): pedirlo antes, en el lobby, arriesga que llegue vencido.
 * El ticket queda atado a `idPartida` (F6, multi-partida): la asigno el actor de matchmaking.
 */
@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly http = inject(HttpClient);

  solicitar(idPartida: string): Observable<string> {
    const params = new HttpParams().set('idPartida', idPartida);
    return this.http
      .post<TicketResponse>('/api/partidas/ticket', {}, { params })
      .pipe(map((respuesta) => respuesta.ticket));
  }
}
