package ar.pazluciano.battleroyale.juego.dominio.partida;

import lombok.Getter;

/**
 * Zona segura que se achica en {@link ParametrosZona#getCantidadFases()} contracciones concentricas
 * (PLAN §7-E). Centro FIJO en el centro del mapa: para el MVP es la version mas simple que cumple
 * "una zona que se achica" sin la complejidad de mover el centro (que exigiria mantenerlo siempre
 * dentro del mapa). El radio se recalcula CADA tick desde {@code ticksRestantesEnFase} (nunca por
 * resta incremental), asi la interpolacion no arrastra error de redondeo.
 */
@Getter
public class ZonaSegura {

    private final ParametrosZona parametros;
    private final Vector2 centro;

    private double radio;
    private int fase = 0;
    private boolean contrayendo = false;
    private int ticksRestantesEnFase;

    private double radioAlIniciarFase;
    private double radioObjetivoActual;

    public ZonaSegura(ParametrosZona parametros, Vector2 centro) {
        this.parametros = parametros;
        this.centro = centro;
        this.radio = parametros.getRadioInicial();
        this.radioObjetivoActual = parametros.getRadioInicial();
        this.ticksRestantesEnFase = parametros.getTicksEspera();
    }

    public void avanzarTick() {
        if (contrayendo) {
            avanzarContraccion();
        } else {
            avanzarEspera();
        }
    }

    private void avanzarContraccion() {
        ticksRestantesEnFase--;
        double fraccion = 1.0 - Math.max(0, ticksRestantesEnFase) / (double) parametros.getTicksContraccion();
        radio = radioAlIniciarFase - (radioAlIniciarFase - radioObjetivoActual) * fraccion;
        if (ticksRestantesEnFase <= 0) {
            radio = radioObjetivoActual;
            contrayendo = false;
            fase++;
            ticksRestantesEnFase = parametros.getTicksEspera();
        }
    }

    private void avanzarEspera() {
        if (fase >= parametros.getCantidadFases()) {
            return; // ya llego al radio minimo; se queda quieta
        }
        ticksRestantesEnFase--;
        if (ticksRestantesEnFase <= 0) {
            contrayendo = true;
            radioAlIniciarFase = radio;
            radioObjetivoActual = radioObjetivoDeFase(fase);
            ticksRestantesEnFase = parametros.getTicksContraccion();
        }
    }

    private double radioObjetivoDeFase(int indiceFase) {
        double reduccionTotal = parametros.getRadioInicial() - parametros.getRadioMinimo();
        double reduccionPorFase = reduccionTotal / parametros.getCantidadFases();
        return parametros.getRadioInicial() - reduccionPorFase * (indiceFase + 1);
    }

    /** Radio al que se dirige la contraccion en curso, o la proxima si esta en espera (para el HUD). */
    public double radioProximo() {
        if (contrayendo) {
            return radioObjetivoActual;
        }
        if (fase < parametros.getCantidadFases()) {
            return radioObjetivoDeFase(fase);
        }
        return radio;
    }

    /** Ticks restantes de la fase actual (contraccion o espera), para el HUD "GAS CLOSING". */
    public int ticksParaProximoCambio() {
        return Math.max(0, ticksRestantesEnFase);
    }

    public boolean contiene(Vector2 punto) {
        double dx = punto.getX() - centro.getX();
        double dy = punto.getY() - centro.getY();
        return Math.sqrt(dx * dx + dy * dy) <= radio;
    }
}
