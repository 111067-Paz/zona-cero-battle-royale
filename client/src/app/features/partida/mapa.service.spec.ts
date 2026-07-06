import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MapaService } from './mapa.service';
import { Mapa } from '../../models/mapa';

function mapaDePrueba(): Mapa {
  return { id: 'campo-01', ancho: 256, alto: 256, obstaculos: [], decoraciones: [] };
}

describe('MapaService', () => {
  let service: MapaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withFetch()), provideHttpClientTesting()],
    });
    service = TestBed.inject(MapaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('baja el mapa por GET /api/mapas/{id}', () => {
    const esperado = mapaDePrueba();
    let recibido: Mapa | undefined;

    service.obtener('campo-01').subscribe((mapa) => (recibido = mapa));
    const pedido = httpMock.expectOne('/api/mapas/campo-01');

    expect(pedido.request.method).toBe('GET');
    pedido.flush(esperado);
    expect(recibido).toEqual(esperado);
  });

  it('cachea: un segundo obtener del mismo id no dispara otro GET', () => {
    const esperado = mapaDePrueba();
    service.obtener('campo-01').subscribe();
    httpMock.expectOne('/api/mapas/campo-01').flush(esperado);

    let recibido: Mapa | undefined;
    service.obtener('campo-01').subscribe((mapa) => (recibido = mapa));

    httpMock.expectNone('/api/mapas/campo-01');
    expect(recibido).toEqual(esperado);
  });
});
