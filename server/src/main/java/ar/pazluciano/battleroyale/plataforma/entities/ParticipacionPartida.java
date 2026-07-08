package ar.pazluciano.battleroyale.plataforma.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * La actuacion de UN participante en UNA partida terminada (PLAN §4.2). {@code usuario} es
 * NULLABLE: null significa que el participante era un bot — el dominio no distingue humano de
 * bot (§4.1), pero la persistencia si necesita saber a quien atribuirle el resultado.
 *
 * <p>Dos campos del plan original QUEDAN FUERA del MVP porque el dominio no los sostiene todavia
 * (una columna que nunca se puebla es una funcionalidad a medias, no una simplificacion honesta):
 * {@code dañoInfligido} (combate F2 no acumula dano-por-atacante) y {@code sobrevivioSegundos}
 * (Jugador no registra en que tick muere — agregarlo tocaria la firma de {@code recibirDanio} en
 * dos puntos por una estadistica que no esta en el DoD de esta fase). Se agregan el dia que el
 * dominio los sostenga de verdad.
 */
@Entity
@Table(name = "participaciones_partida")
@Getter
@Setter
@NoArgsConstructor
public class ParticipacionPartida {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "resultado_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_participaciones_resultado"))
    private ResultadoPartida resultado;

    /** Null si el participante era un bot. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", foreignKey = @ForeignKey(name = "fk_participaciones_usuario"))
    private Usuario usuario;

    @Column(name = "posicion_final", nullable = false)
    private int posicionFinal;

    @Column(nullable = false)
    private int kills;

    @Column(nullable = false)
    private int muertes;

    public ParticipacionPartida(Usuario usuario, int posicionFinal, int kills, int muertes) {
        this.usuario = usuario;
        this.posicionFinal = posicionFinal;
        this.kills = kills;
        this.muertes = muertes;
    }
}
