package ar.pazluciano.battleroyale.plataforma.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Respuesta del polling de matchmaking (PLAN §5.5, R21). {@code idPartida} solo viene poblado
 * cuando ya hay asignacion; hasta entonces {@code enCola}/{@code jugadoresEncontrados} alimentan
 * el "n/10" del lobby.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EstadoMatchmakingDTO {

    private boolean enCola;
    private Integer jugadoresEncontrados;
    private String idPartida;
}
