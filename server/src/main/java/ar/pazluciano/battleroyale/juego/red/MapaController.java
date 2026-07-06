package ar.pazluciano.battleroyale.juego.red;

import ar.pazluciano.battleroyale.juego.motor.mapa.CargadorMapas;
import ar.pazluciano.battleroyale.juego.protocolo.MapaDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Sirve el mapa estatico por REST (PLAN §5.2). El cliente lo baja UNA vez al recibir BIENVENIDA para
 * dibujar el fondo; como el mapa no cambia durante la partida, NO viaja en los snapshots. Es
 * cacheable. El unico gameplay-adjacent que va por REST, justamente por ser estatico.
 */
@RestController
@RequestMapping("/api/mapas")
@RequiredArgsConstructor
public class MapaController {

    private final CargadorMapas cargadorMapas;

    @GetMapping("/{id}")
    public ResponseEntity<MapaDto> obtener(@PathVariable String id) {
        return cargadorMapas.buscarMapaDto(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
