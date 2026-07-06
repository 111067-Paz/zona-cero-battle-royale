package ar.pazluciano.battleroyale.juego.motor.mapa;

import ar.pazluciano.battleroyale.comun.config.ConfiguracionJuego;
import ar.pazluciano.battleroyale.juego.dominio.mapa.MapaJuego;
import ar.pazluciano.battleroyale.juego.dominio.mapa.ObstaculoAABB;
import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;
import ar.pazluciano.battleroyale.juego.protocolo.DecoracionMapa;
import ar.pazluciano.battleroyale.juego.protocolo.MapaDto;
import ar.pazluciano.battleroyale.juego.protocolo.PuntoMapa;
import ar.pazluciano.battleroyale.juego.protocolo.RectanguloMapa;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Carga los mapas desde {@code resources/mapas/*.json} al arrancar y los VALIDA fail-fast: si un mapa
 * esta mal definido, el contexto no levanta (PLAN §8.3). Cachea, para cada mapa, su vista de dominio
 * ({@link MapaJuego}) y su vista de wire ({@link MapaDto}).
 *
 * <p>Validaciones (garantizan las premisas de la simulacion):
 * dimensiones positivas; al menos {@link #SPAWNS_MINIMOS} spawns; cada obstaculo dentro de los
 * limites y no mas fino que {@link #GROSOR_MINIMO}u (condicion del move-then-resolve, decision de
 * Fase 1); cada spawn dentro de los limites con margen de radio y sin solaparse con ningun obstaculo.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CargadorMapas {

    /** Grosor minimo de un obstaculo: garantiza que el jugador no lo atraviese sin barrido (F1). */
    private static final double GROSOR_MINIMO = 1.0;

    /** Spawns minimos: uno por jugador de una partida llena. */
    private static final int SPAWNS_MINIMOS = 10;

    private static final String ID_MAPA_LOCAL = "campo-01";

    private final ObjectMapper objectMapper;
    private final ConfiguracionJuego config;

    private final Map<String, MapaJuego> mapasJuego = new ConcurrentHashMap<>();
    private final Map<String, MapaDto> mapasDto = new ConcurrentHashMap<>();

    @PostConstruct
    void cargarMapasIniciales() {
        cargar(ID_MAPA_LOCAL);
        log.info("Mapas cargados: {}", mapasJuego.keySet());
    }

    /** Vista de dominio para la simulacion. Falla si el mapa no existe (deberia estar cargado). */
    public MapaJuego mapaJuego(String id) {
        MapaJuego mapa = mapasJuego.get(id);
        if (mapa == null) {
            throw new IllegalArgumentException("Mapa no cargado: " + id);
        }
        return mapa;
    }

    /** Vista de wire para el cliente. Vacio si el mapa no existe (el controller responde 404). */
    public Optional<MapaDto> buscarMapaDto(String id) {
        return Optional.ofNullable(mapasDto.get(id));
    }

    void cargar(String id) {
        DefinicionMapa definicion = leer(id);
        validar(id, definicion);
        List<ObstaculoAABB> obstaculos = aObstaculos(definicion);
        mapasJuego.put(id, aMapaJuego(id, definicion, obstaculos));
        mapasDto.put(id, aMapaDto(id, definicion));
    }

    private DefinicionMapa leer(String id) {
        String ruta = "mapas/" + id + ".json";
        try (InputStream entrada = new ClassPathResource(ruta).getInputStream()) {
            return objectMapper.readValue(entrada, DefinicionMapa.class);
        } catch (IOException | JacksonException e) {
            throw new IllegalStateException("No se pudo leer el mapa " + ruta, e);
        }
    }

    private void validar(String id, DefinicionMapa definicion) {
        if (definicion.getAncho() <= 0 || definicion.getAlto() <= 0) {
            throw invalido(id, "dimensiones invalidas");
        }
        List<PuntoMapa> spawns = definicion.getSpawns();
        if (spawns == null || spawns.size() < SPAWNS_MINIMOS) {
            throw invalido(id, "se requieren al menos " + SPAWNS_MINIMOS + " spawns");
        }
        List<ObstaculoAABB> obstaculos = aObstaculos(definicion);
        for (ObstaculoAABB obstaculo : obstaculos) {
            validarObstaculo(id, definicion, obstaculo);
        }
        double radio = config.getRadioJugador();
        for (PuntoMapa spawn : spawns) {
            validarSpawn(id, definicion, radio, obstaculos, spawn);
        }
    }

    private void validarObstaculo(String id, DefinicionMapa definicion, ObstaculoAABB obstaculo) {
        if (obstaculo.getAncho() < GROSOR_MINIMO || obstaculo.getAlto() < GROSOR_MINIMO) {
            throw invalido(id, "obstaculo mas fino que " + GROSOR_MINIMO + "u (rompe move-then-resolve)");
        }
        if (obstaculo.getX() < 0 || obstaculo.getY() < 0
                || obstaculo.bordeDerecho() > definicion.getAncho()
                || obstaculo.bordeInferior() > definicion.getAlto()) {
            throw invalido(id, "obstaculo fuera de los limites del mapa");
        }
    }

    private void validarSpawn(String id, DefinicionMapa definicion, double radio,
                              List<ObstaculoAABB> obstaculos, PuntoMapa spawn) {
        Vector2 punto = new Vector2(spawn.getX(), spawn.getY());
        boolean dentroDeBordes = spawn.getX() >= radio && spawn.getY() >= radio
                && spawn.getX() <= definicion.getAncho() - radio
                && spawn.getY() <= definicion.getAlto() - radio;
        if (!dentroDeBordes) {
            throw invalido(id, "spawn fuera de los limites (con margen de radio): " + punto);
        }
        for (ObstaculoAABB obstaculo : obstaculos) {
            if (obstaculo.contiene(punto) || distancia(punto, obstaculo.puntoMasCercanoA(punto)) < radio) {
                throw invalido(id, "spawn dentro o pegado a un obstaculo: " + punto);
            }
        }
    }

    private List<ObstaculoAABB> aObstaculos(DefinicionMapa definicion) {
        List<RectanguloMapa> rectangulos = definicion.getObstaculos();
        if (rectangulos == null) {
            return List.of();
        }
        return rectangulos.stream()
                .map(r -> new ObstaculoAABB(r.getX(), r.getY(), r.getAncho(), r.getAlto()))
                .toList();
    }

    private MapaJuego aMapaJuego(String id, DefinicionMapa definicion, List<ObstaculoAABB> obstaculos) {
        List<Vector2> spawns = definicion.getSpawns().stream()
                .map(p -> new Vector2(p.getX(), p.getY()))
                .toList();
        return new MapaJuego(id, definicion.getAncho(), definicion.getAlto(), obstaculos, spawns);
    }

    private MapaDto aMapaDto(String id, DefinicionMapa definicion) {
        List<DecoracionMapa> decoraciones =
                definicion.getDecoraciones() == null ? List.of() : definicion.getDecoraciones();
        List<RectanguloMapa> obstaculos =
                definicion.getObstaculos() == null ? List.of() : definicion.getObstaculos();
        return MapaDto.builder()
                .id(id)
                .ancho(definicion.getAncho())
                .alto(definicion.getAlto())
                .obstaculos(obstaculos)
                .decoraciones(decoraciones)
                .build();
    }

    private double distancia(Vector2 a, Vector2 b) {
        return Math.hypot(a.getX() - b.getX(), a.getY() - b.getY());
    }

    private IllegalStateException invalido(String id, String detalle) {
        return new IllegalStateException("Mapa '" + id + "' invalido: " + detalle);
    }
}
