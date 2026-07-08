import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { EstadisticaDTO, PaginaEstadisticas } from '../../models/auth';

/** Lee estadisticas del lobby (PLAN §15.2): las propias y el ranking. Solo lectura. */
@Injectable({ providedIn: 'root' })
export class EstadisticaService {
  private readonly http = inject(HttpClient);

  misEstadisticas(): Observable<EstadisticaDTO> {
    return this.http.get<EstadisticaDTO>('/api/estadisticas/mias');
  }

  ranking(pagina = 0, tamanio = 10): Observable<PaginaEstadisticas> {
    const params = new HttpParams().set('page', pagina).set('size', tamanio);
    return this.http.get<PaginaEstadisticas>('/api/estadisticas/ranking', { params });
  }
}
