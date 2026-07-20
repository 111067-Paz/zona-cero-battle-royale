import { DodecahedronGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry } from 'three';

interface CúmuloNube {
  grupo: Group;
  velocidad: number;
}

export class Nubes3D {
  readonly contenedor = new Group();
  private readonly nubes: CúmuloNube[] = [];

  constructor(anchoMapa = 256, altoMapa = 256, cantidadNubes = 24) {
    const matNube = new MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.05,
      transparent: true,
      opacity: 0.82,
    });

    for (let i = 0; i < cantidadNubes; i++) {
      const grupoNube = new Group();
      const numBolas = 5 + Math.floor(Math.random() * 4);

      for (let j = 0; j < numBolas; j++) {
        const radio = 3.5 + Math.random() * 3.0;
        const geo = Math.random() > 0.4 ? new SphereGeometry(radio, 8, 8) : new DodecahedronGeometry(radio, 1);
        const bola = new Mesh(geo, matNube);

        bola.position.set(
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 3
        );
        bola.scale.set(1.0 + Math.random() * 0.4, 0.6 + Math.random() * 0.3, 1.0 + Math.random() * 0.4);
        grupoNube.add(bola);
      }

      const posX = Math.random() * (anchoMapa + 80) - 40;
      const posY = Math.random() * (altoMapa + 80) - 40;
      const posZ = 45 + Math.random() * 20;

      grupoNube.position.set(posX, posY, posZ);
      grupoNube.rotation.z = Math.random() * Math.PI * 2;

      this.contenedor.add(grupoNube);
      this.nubes.push({
        grupo: grupoNube,
        velocidad: 0.8 + Math.random() * 1.2,
      });
    }
  }

  animar(deltaSec: number, anchoMapa = 256): void {
    for (const nube of this.nubes) {
      nube.grupo.position.x += nube.velocidad * deltaSec;
      if (nube.grupo.position.x > anchoMapa + 50) {
        nube.grupo.position.x = -50;
      }
    }
  }
}
