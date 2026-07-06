import { EstadoVisual } from '../estado-visual';

/**
 * Abstraccion de renderizado (patron Bridge, PLAN §2.5). La simulacion emite estado en coordenadas
 * de MUNDO; cada implementacion decide como proyectarlo a pantalla. Recibe estado y dibuja: no conoce
 * sockets, ni el store, ni Angular. Eso es lo que permite cambiar el 2D top-down por el isometrico
 * (Fase 8) o el 3D sin tocar nada aguas arriba.
 */
export interface RendererJuego {
  /** Inicializa el contexto de dibujo sobre el canvas dado. Puede ser asincrono (WebGL). */
  iniciar(canvas: HTMLCanvasElement): Promise<void>;

  /** Dibuja un frame a partir del estado visual YA interpolado y del id del jugador propio (camara). */
  renderizar(estado: EstadoVisual, idJugadorPropio: string | null): void;

  /** Ajusta la proyeccion a un nuevo tamano de viewport. Jamas cachea el viewport de la creacion. */
  redimensionar(ancho: number, alto: number): void;

  /** Libera recursos del contexto de dibujo. */
  destruir(): void;
}
