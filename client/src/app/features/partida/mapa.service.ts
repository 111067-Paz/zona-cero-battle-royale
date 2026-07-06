import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { Mapa } from '../../models/mapa';

/**
 * Baja el mapa estatico por REST (Flujo B paso 7). Cachea por id con `shareReplay(1)`: el mapa no
 * cambia durante la partida, asi que un solo GET alcanza aunque se pida varias veces.
 */
@Injectable({ providedIn: 'root' })
export class MapaService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Observable<Mapa>>();

  obtener(id: string): Observable<Mapa> {
    let pedido = this.cache.get(id);
    if (pedido === undefined) {
      pedido = this.http.get<Mapa>(`/api/mapas/${id}`).pipe(shareReplay(1));
      this.cache.set(id, pedido);
    }
    return pedido;
  }
}
