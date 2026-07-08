package ar.pazluciano.battleroyale.plataforma.entities;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Resultado persistido de una partida terminada (PLAN §4.2/§5.4). {@code partidaId} es el mismo
 * UUID string que ya usa {@code Partida.id} en el dominio; su UNIQUE es la base de la
 * exactamente-una-vez (R13): un {@code partidaId} repetido no puede insertarse dos veces.
 *
 * <p>Composicion con {@link ParticipacionPartida} (cascade ALL + orphanRemoval): una
 * participacion no tiene sentido sin su resultado. Sin {@code @AllArgsConstructor}: el
 * constructor manual evita que alguien intente setear la lista de participaciones a mano en vez
 * de usar {@link #agregarParticipacion}.
 */
@Entity
@Table(name = "resultados_partida")
@Getter
@Setter
@NoArgsConstructor
public class ResultadoPartida {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "partida_id", nullable = false, unique = true, length = 64)
    private String partidaId;

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDateTime fechaInicio;

    @Column(name = "fecha_fin", nullable = false)
    private LocalDateTime fechaFin;

    @Column(name = "cantidad_jugadores", nullable = false)
    private int cantidadJugadores;

    @OneToMany(mappedBy = "resultado", cascade = CascadeType.ALL, orphanRemoval = true,
            fetch = FetchType.LAZY)
    private List<ParticipacionPartida> participaciones = new ArrayList<>();

    public ResultadoPartida(String partidaId, LocalDateTime fechaInicio, LocalDateTime fechaFin,
                            int cantidadJugadores) {
        this.partidaId = partidaId;
        this.fechaInicio = fechaInicio;
        this.fechaFin = fechaFin;
        this.cantidadJugadores = cantidadJugadores;
    }

    /** Mantiene sincronizados ambos lados de la relacion (§2 de la skill). */
    public void agregarParticipacion(ParticipacionPartida participacion) {
        participaciones.add(participacion);
        participacion.setResultado(this);
    }
}
