package ar.pazluciano.battleroyale.plataforma.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Alta de cuenta. Los regex son IDENTICOS a los del formulario Angular (`Validators.pattern`):
 * el backend NUNCA confia solo en la validacion del cliente.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "El nombre de usuario es obligatorio")
    @Size(min = 3, max = 50, message = "El nombre de usuario debe tener entre 3 y 50 caracteres")
    @Pattern(regexp = "^[a-zA-Z][a-zA-Z0-9_]*$",
            message = "El nombre de usuario debe empezar con una letra y usar solo letras, numeros o guion bajo")
    private String nombreUsuario;

    @NotBlank(message = "El email es obligatorio")
    @Email(regexp = "^[\\w.%+-]+@[\\w.-]+\\.[A-Za-z]{2,}$",
            message = "El email debe ser valido (ej: nombre@dominio.com)")
    private String email;

    @NotBlank(message = "La contrasenia es obligatoria")
    @Size(min = 8, max = 100, message = "La contrasenia debe tener entre 8 y 100 caracteres")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$",
            message = "La contrasenia debe incluir una mayuscula, una minuscula y un numero")
    private String password;
}
