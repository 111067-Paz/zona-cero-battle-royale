package ar.pazluciano.battleroyale.plataforma.dtos;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** El nombre del personaje viaja como texto (no como enum): la validacion real la hace el service
 *  via {@code Personaje.desdeTexto()} para devolver un 400 legible en vez de un error de Jackson. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActualizarPersonajeRequest {

    @NotBlank(message = "El personaje es obligatorio")
    private String personaje;
}
