import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { EstadoMatchmakingDTO } from '../../models/auth';

/** Cola de matchmaking (PLAN §5.5/§10-F6, Flujo G). Solo llama al REST; el polling lo arma la pagina. */
@Injectable({ providedIn: 'root' })
export class MatchmakingService {
  private readonly http = inject(HttpClient);

  encolar(): Observable<void> {
    return this.http.post<void>('/api/matchmaking/cola', {});
  }

  estado(): Observable<EstadoMatchmakingDTO> {
    return this.http.get<EstadoMatchmakingDTO>('/api/matchmaking/estado');
  }
}
