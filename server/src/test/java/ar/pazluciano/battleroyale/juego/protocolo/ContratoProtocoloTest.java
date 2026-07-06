package ar.pazluciano.battleroyale.juego.protocolo;

import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Test de contrato (PLAN §9.3): cada fixture canonico de {@code contratos/fixtures} se deserializa al
 * DTO y se vuelve a serializar; los arboles JSON deben coincidir. Si un DTO cambia de forma, este
 * test falla en CI, no en runtime. El cliente tipa los MISMOS fixtures en Vitest.
 *
 * <p>Los fixtures viven en la raiz del repo; Surefire corre con el working dir en {@code server/},
 * por eso la ruta relativa {@code ../contratos/fixtures}.
 */
@Tag("unit")
@DisplayName("Protocolo v1 - contrato contra fixtures compartidos")
class ContratoProtocoloTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    @DisplayName("UNIRSE sobrevive el round-trip sin cambiar de forma")
    void unirse_roundTrip_conservaLaForma() throws IOException {
        verificarRoundTrip("unirse.json", MensajeCliente.class);
    }

    @Test
    @DisplayName("INPUT sobrevive el round-trip sin cambiar de forma")
    void input_roundTrip_conservaLaForma() throws IOException {
        verificarRoundTrip("input.json", MensajeCliente.class);
    }

    @Test
    @DisplayName("SALIR sobrevive el round-trip sin cambiar de forma")
    void salir_roundTrip_conservaLaForma() throws IOException {
        verificarRoundTrip("salir.json", MensajeCliente.class);
    }

    @Test
    @DisplayName("BIENVENIDA sobrevive el round-trip sin cambiar de forma")
    void bienvenida_roundTrip_conservaLaForma() throws IOException {
        verificarRoundTrip("bienvenida.json", Bienvenida.class);
    }

    @Test
    @DisplayName("SNAPSHOT sobrevive el round-trip sin cambiar de forma")
    void snapshot_roundTrip_conservaLaForma() throws IOException {
        verificarRoundTrip("snapshot.json", Snapshot.class);
    }

    private void verificarRoundTrip(String archivo, Class<?> tipo) throws IOException {
        String json = Files.readString(rutaFixture(archivo));

        Object objeto = mapper.readValue(json, tipo);
        String reserializado = mapper.writeValueAsString(objeto);

        assertEquals(mapper.readTree(json), mapper.readTree(reserializado),
                "El round-trip de " + archivo + " cambio la forma del mensaje");
    }

    private Path rutaFixture(String archivo) {
        return Path.of("..", "contratos", "fixtures", archivo);
    }
}
