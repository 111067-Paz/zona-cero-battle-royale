package ar.pazluciano.battleroyale.plataforma.entities;

import ar.pazluciano.battleroyale.comun.personajes.Personaje;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Cuenta de un jugador humano (PLAN §4.2). El passwordHash NUNCA se expone por la API — solo
 * viaja hacia y desde este entity y el {@code AuthService}.
 *
 * <p>{@code @Getter @Setter @NoArgsConstructor @AllArgsConstructor}, NUNCA {@code @Data}: con
 * relaciones bidireccionales (TokenRefresco, ParticipacionPartida, EstadisticaJugador) un
 * equals/hashCode/toString sobre todos los campos entra en recursion o dispara carga LAZY.
 */
@Entity
@Table(name = "usuarios")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nombre_usuario", nullable = false, unique = true, length = 50)
    private String nombreUsuario;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Rol rol;

    @Column(nullable = false)
    private boolean activo;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    /** Aspecto chibi elegido (PLAN §15): viaja al snapshot via el ticket, visible para todos. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Personaje personaje;

    /** Constructor de conveniencia: solo lo que el registro necesita (PLAN §4.2). */
    public Usuario(String nombreUsuario, String email, String passwordHash) {
        this.nombreUsuario = nombreUsuario;
        this.email = email;
        this.passwordHash = passwordHash;
    }

    @PrePersist
    void alCrear() {
        this.fechaCreacion = LocalDateTime.now();
        this.activo = true;
        if (this.rol == null) {
            this.rol = Rol.JUGADOR;
        }
        if (this.personaje == null) {
            this.personaje = Personaje.GATO;
        }
    }
}
