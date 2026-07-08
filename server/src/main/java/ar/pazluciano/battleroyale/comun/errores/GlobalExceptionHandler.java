package ar.pazluciano.battleroyale.comun.errores;

import ar.pazluciano.battleroyale.juego.motor.UsuarioYaEnColaException;
import ar.pazluciano.battleroyale.plataforma.exceptions.CredencialesInvalidasException;
import ar.pazluciano.battleroyale.plataforma.exceptions.DemasiadosIntentosException;
import ar.pazluciano.battleroyale.plataforma.exceptions.TokenInvalidoException;
import ar.pazluciano.battleroyale.plataforma.exceptions.UsuarioYaExisteException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;

/** Traduce toda excepcion de la API a {@link ErrorApi} (PLAN §12): un solo contrato de error. */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    @ExceptionHandler(UsuarioYaExisteException.class)
    public ResponseEntity<ErrorApi> handleUsuarioYaExiste(UsuarioYaExisteException exception) {
        log.warn("Registro rechazado: {}", exception.getMessage());
        return construir(HttpStatus.CONFLICT, exception.getMessage());
    }

    @ExceptionHandler(CredencialesInvalidasException.class)
    public ResponseEntity<ErrorApi> handleCredencialesInvalidas(CredencialesInvalidasException exception) {
        log.warn("Login rechazado: {}", exception.getMessage());
        return construir(HttpStatus.UNAUTHORIZED, exception.getMessage());
    }

    @ExceptionHandler(TokenInvalidoException.class)
    public ResponseEntity<ErrorApi> handleTokenInvalido(TokenInvalidoException exception) {
        log.warn("Token rechazado: {}", exception.getMessage());
        return construir(HttpStatus.UNAUTHORIZED, exception.getMessage());
    }

    @ExceptionHandler(DemasiadosIntentosException.class)
    public ResponseEntity<ErrorApi> handleDemasiadosIntentos(DemasiadosIntentosException exception) {
        log.warn("Rate limit excedido: {}", exception.getMessage());
        return construir(HttpStatus.TOO_MANY_REQUESTS, exception.getMessage());
    }

    @ExceptionHandler(UsuarioYaEnColaException.class)
    public ResponseEntity<ErrorApi> handleUsuarioYaEnCola(UsuarioYaEnColaException exception) {
        log.warn("Matchmaking rechazado: {}", exception.getMessage());
        return construir(HttpStatus.CONFLICT, exception.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorApi> handleValidacion(MethodArgumentNotValidException exception) {
        String mensaje = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining("; "));
        log.warn("Validacion fallida: {}", mensaje);
        return construir(HttpStatus.BAD_REQUEST, mensaje);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorApi> handleGenerico(Exception exception) {
        log.error("Error no previsto: {}", exception.getMessage(), exception);
        return construir(HttpStatus.INTERNAL_SERVER_ERROR, "Ocurrio un error inesperado");
    }

    private ResponseEntity<ErrorApi> construir(HttpStatus status, String mensaje) {
        ErrorApi error = ErrorApi.builder()
                .timestamp(LocalDateTime.now().format(FORMATTER))
                .status(status.value())
                .error(status.getReasonPhrase())
                .message(mensaje)
                .build();
        return ResponseEntity.status(status).body(error);
    }
}
