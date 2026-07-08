package ar.pazluciano.battleroyale.plataforma.repositories;

import ar.pazluciano.battleroyale.plataforma.entities.EstadisticaJugador;
import ar.pazluciano.battleroyale.plataforma.entities.Usuario;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.TestConstructor;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integracion contra el H2 real de dev (Flyway aplicado, PLAN §5.4/R13): valida que el UPDATE
 * atomico de {@code sumarResultado} no pierde escrituras bajo concurrencia real — la razon de
 * ser de esa query (leer-modificar-guardar SI las perderia).
 */
@SpringBootTest
@Tag("integration")
@DisplayName("EstadisticaJugadorRepository - integracion")
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
class EstadisticaJugadorRepositoryIntegrationTest {

    private final UsuarioRepository usuarioRepository;
    private final EstadisticaJugadorRepository estadisticaJugadorRepository;
    private final TransactionTemplate transactionTemplate;

    EstadisticaJugadorRepositoryIntegrationTest(UsuarioRepository usuarioRepository,
            EstadisticaJugadorRepository estadisticaJugadorRepository,
            PlatformTransactionManager transactionManager) {
        this.usuarioRepository = usuarioRepository;
        this.estadisticaJugadorRepository = estadisticaJugadorRepository;
        // Los hilos concurrentes no heredan la transaccion del hilo de test (esta ni la tiene:
        // @Modifying no abre transaccion propia, la exige de afuera). Cada hilo abre la SUYA para
        // seguir siendo transacciones realmente concurrentes, no una serializada por el latch.
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Test
    @DisplayName("sumarResultado bajo hilos concurrentes acumula TODOS los resultados (sin lost updates)")
    void sumarResultado_concurrente_acumulaTodosLosResultadosSinPerderUpdates() throws InterruptedException {
        // GIVEN
        Usuario usuario = usuarioRepository.save(nuevoUsuario());
        estadisticaJugadorRepository.save(new EstadisticaJugador(usuario));
        int hilos = 20;
        ExecutorService executor = Executors.newFixedThreadPool(hilos);
        CountDownLatch arrancar = new CountDownLatch(1);
        CountDownLatch terminados = new CountDownLatch(hilos);

        // WHEN: todos los hilos disparan la misma UPDATE atomica al mismo tiempo (barrera con latch).
        for (int i = 0; i < hilos; i++) {
            executor.submit(() -> {
                try {
                    arrancar.await();
                    transactionTemplate.executeWithoutResult(status ->
                            estadisticaJugadorRepository.sumarResultado(usuario.getId(), 1, 5, 1, 1));
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    terminados.countDown();
                }
            });
        }
        arrancar.countDown();
        boolean terminaronATiempo = terminados.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        // THEN
        assertTrue(terminaronATiempo, "los " + hilos + " hilos deberian terminar en menos de 10s");
        EstadisticaJugador resultado = estadisticaJugadorRepository.findByUsuarioId(usuario.getId()).orElseThrow();
        assertEquals(hilos, resultado.getPartidasJugadas());
        assertEquals(hilos, resultado.getVictorias());
        assertEquals(hilos * 5, resultado.getKills());
        assertEquals(hilos, resultado.getMuertes());
        assertEquals(hilos, resultado.getTop3());
    }

    @Test
    @Transactional
    @DisplayName("findAllByOrderByVictoriasDescKillsDesc ordena por victorias desc y desempata por kills desc")
    void findAllByOrderByVictoriasDescKillsDesc_ordenaCorrectamente() {
        // GIVEN: valores extremos para garantizar que queden primeros sin importar que mas haya
        // en la base compartida por otros tests de esta clase.
        Usuario primero = usuarioRepository.save(nuevoUsuario());
        Usuario segundo = usuarioRepository.save(nuevoUsuario());
        Usuario tercero = usuarioRepository.save(nuevoUsuario());
        estadisticaJugadorRepository.save(estadisticaCon(primero, 300_000, 100));
        estadisticaJugadorRepository.save(estadisticaCon(segundo, 200_000, 999));
        estadisticaJugadorRepository.save(estadisticaCon(tercero, 200_000, 500));

        // WHEN
        Page<EstadisticaJugador> pagina =
                estadisticaJugadorRepository.findAllByOrderByVictoriasDescKillsDesc(PageRequest.of(0, 3));

        // THEN
        List<EstadisticaJugador> top3 = pagina.getContent();
        assertEquals(primero.getId(), top3.get(0).getUsuario().getId());
        assertEquals(segundo.getId(), top3.get(1).getUsuario().getId()); // mas victorias empatadas, mas kills
        assertEquals(tercero.getId(), top3.get(2).getUsuario().getId());
    }

    private Usuario nuevoUsuario() {
        String sufijo = UUID.randomUUID().toString().substring(0, 8);
        return new Usuario("test-" + sufijo, sufijo + "@test.com", "hash");
    }

    private EstadisticaJugador estadisticaCon(Usuario usuario, int victorias, int kills) {
        EstadisticaJugador estadistica = new EstadisticaJugador(usuario);
        estadistica.setVictorias(victorias);
        estadistica.setKills(kills);
        return estadistica;
    }
}
