import { DirectionalLight, Group, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three';

export class Sol3D {
  readonly contenedor = new Group();
  readonly luzDireccional: DirectionalLight;

  constructor(posicionInicial = new Vector3(140, 180, 75)) {
    // 1. Esfera solar principal emisiva
    const matSol = new MeshBasicMaterial({
      color: 0xfff59d,
    });
    const solMesh = new Mesh(new SphereGeometry(4.5, 24, 24), matSol);

    // 2. Halo solar exterior translúcido
    const matHalo = new MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.38,
    });
    const haloMesh = new Mesh(new SphereGeometry(7.2, 24, 24), matHalo);

    this.contenedor.add(solMesh, haloMesh);
    this.contenedor.position.copy(posicionInicial);

    // 3. Luz direccional solar principal con sombras
    this.luzDireccional = new DirectionalLight(0xfffbeb, 1.3);
    this.luzDireccional.position.copy(posicionInicial);
    this.luzDireccional.target.position.set(128, 128, 0);

    this.luzDireccional.castShadow = true;
    this.luzDireccional.shadow.mapSize.width = 2048;
    this.luzDireccional.shadow.mapSize.height = 2048;
    this.luzDireccional.shadow.camera.near = 10;
    this.luzDireccional.shadow.camera.far = 250;
    this.luzDireccional.shadow.camera.left = -140;
    this.luzDireccional.shadow.camera.right = 140;
    this.luzDireccional.shadow.camera.top = 140;
    this.luzDireccional.shadow.camera.bottom = -140;
    this.luzDireccional.shadow.bias = -0.0005;
  }
}
