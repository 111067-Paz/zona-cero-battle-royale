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
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Refresh token con rotacion (PLAN §4.2, R18). Se guarda el HASH del token, nunca el valor plano
 * (mismo criterio que la contrasenia): si la base se filtra, no expone tokens utilizables.
 *
 * <p>{@code familia} agrupa toda la cadena de rotaciones de una sesion: si un token ya usado
 * (marcado {@code revocado}) se vuelve a presentar, es una señal de robo y se revoca TODA la
 * familia (R18), no solo ese token.
 *
 * <p>Asociacion (no composicion) con {@link Usuario}: SIN cascade — borrar un token jamas
 * debe tocar al usuario, y el usuario existe independientemente de sus tokens.
 */
@Entity
@Table(name = "tokens_refresco")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TokenRefresco {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_tokens_refresco_usuario"))
    private Usuario usuario;

    @Column(name = "hash_token", nullable = false, unique = true)
    private String hashToken;

    @Column(nullable = false)
    private UUID familia;

    @Column(nullable = false)
    private LocalDateTime expiracion;

    @Column(nullable = false)
    private boolean revocado;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    /** Constructor de conveniencia: nace sin revocar. */
    public TokenRefresco(Usuario usuario, String hashToken, UUID familia, LocalDateTime expiracion) {
        this.usuario = usuario;
        this.hashToken = hashToken;
        this.familia = familia;
        this.expiracion = expiracion;
        this.revocado = false;
    }

    @PrePersist
    void alCrear() {
        this.fechaCreacion = LocalDateTime.now();
    }
}
