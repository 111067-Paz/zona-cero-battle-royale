package ar.pazluciano.battleroyale.plataforma.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Contador acumulado de un usuario (PLAN §4.2). Nace en 0 al registrarse (una fila por usuario,
 * creada junto con {@link Usuario} en {@code AuthServiceImpl.register}) y se actualiza SIEMPRE
 * con UPDATE atomico (R13) — nunca leer-modificar-guardar, que pierde updates concurrentes.
 *
 * <p>{@code top3} reemplaza al "TOP 10s" de la propuesta visual: con partidas de 10 jugadores,
 * "top 10" es toda partida jugada — la metrica util es top 3 (R38).
 */
@Entity
@Table(name = "estadisticas_jugador")
@Getter
@Setter
@NoArgsConstructor
public class EstadisticaJugador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false, unique = true,
            foreignKey = @ForeignKey(name = "fk_estadisticas_usuario"))
    private Usuario usuario;

    @Column(name = "partidas_jugadas", nullable = false)
    private int partidasJugadas;

    @Column(nullable = false)
    private int victorias;

    @Column(nullable = false)
    private int kills;

    @Column(nullable = false)
    private int muertes;

    @Column(nullable = false)
    private int top3;

    public EstadisticaJugador(Usuario usuario) {
        this.usuario = usuario;
    }
}
