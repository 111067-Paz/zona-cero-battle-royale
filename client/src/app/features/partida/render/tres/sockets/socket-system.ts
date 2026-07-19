import { Group, Object3D } from 'three';

export type NombreSocket = 'RightHand' | 'LeftHand' | 'Head' | 'Back' | 'WeaponSocket' | 'HelmetSocket';

export class SocketSystem {
  private readonly sockets = new Map<string, Object3D>();

  constructor(private readonly raizModelo: Group) {
    this.escaneoInteligente();
  }

  private escaneoInteligente(): void {
    const nombresRequeridos: NombreSocket[] = ['RightHand', 'LeftHand', 'Head', 'Back', 'WeaponSocket', 'HelmetSocket'];

    // 1. Buscar nodos o huesos existentes en la jerarquia del GLB
    this.raizModelo.traverse((nodo: Object3D) => {
      const nombre = nodo.name;
      for (const req of nombresRequeridos) {
        if (nombre.toLowerCase() === req.toLowerCase() || nombre.toLowerCase().includes(req.toLowerCase())) {
          this.sockets.set(req, nodo);
        }
      }
    });

    // 2. Si no existen en el GLB, crear contenedores de anclaje de fallback
    for (const req of nombresRequeridos) {
      if (!this.sockets.has(req)) {
        const socketFallback = new Group();
        socketFallback.name = `Socket_Fallback_${req}`;

        // Posiciones relativas aproximadas de fallback
        switch (req) {
          case 'RightHand':
          case 'WeaponSocket':
            socketFallback.position.set(0.35, 0.4, 0.2);
            break;
          case 'LeftHand':
            socketFallback.position.set(-0.35, 0.4, 0.2);
            break;
          case 'Head':
          case 'HelmetSocket':
            socketFallback.position.set(0, 1.2, 0);
            break;
          case 'Back':
            socketFallback.position.set(0, 0.8, -0.2);
            break;
        }

        this.raizModelo.add(socketFallback);
        this.sockets.set(req, socketFallback);
      }
    }
  }

  obtenerSocket(nombre: NombreSocket): Object3D | null {
    return this.sockets.get(nombre) ?? null;
  }

  equiparEnSocket(nombre: NombreSocket, objeto: Object3D | null): boolean {
    if (!objeto) return false;
    const socket = this.obtenerSocket(nombre);
    if (!socket) return false;

    socket.add(objeto);
    return true;
  }
}
