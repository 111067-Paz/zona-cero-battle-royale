package ar.pazluciano.battleroyale.comun.errores;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Formato UNICO de error de toda la API (PLAN §12). Ningun handler devuelve otra cosa. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorApi {

    private String timestamp;
    private int status;
    private String error;
    private String message;
}
