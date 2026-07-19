# Especificación de Assets Requeridos (`ASSETS_REQUIRED.md`)

Este documento detalla la lista completa de archivos **JSON de configuración**, **modelos GLB/GLTF 3D**, **texturas PBR** y **efectos de sonido** necesarios para alimentar el motor de renderizado comercial 3D del proyecto.

> [!NOTE]
> **Data-Driven Architecture**: Cero rutas hardcodeadas en código. Toda la configuración de modelos se resuelve dinámicamente desde los archivos JSON ubicados en `client/public/assets/config/`.
> 
> **Manejo de Assets Faltantes**: Si un modelo `.glb` no existe en disco, el motor emite una advertencia en consola (`console.warn`) y omite el objeto limpiamente sin contaminar la escena ni crear primitivas de reemplazo.

---

## 1. Archivos de Configuración JSON (`client/public/assets/config/`)

Los siguientes archivos definen las propiedades, escalas, sockets y comportamientos de cada elemento:

- `players.json` — Mapeo de especies a modelos GLB y animaciones
- `weapons.json` — Definición de armas, sockets de anclaje y offsets
- `environment.json` — Propiedades de vegetación, rocas y coberturas
- `terrain.json` — Configuración de Chunks de terreno y texturas PBR
- `graphics.json` — Parámetros de sombras, ToneMapping y resolución
- `lighting.json` — Colores e intensidades de iluminación cenital y solar
- `camera.json` — FOV, límites y offsets de cámara en 3ra persona
- `quality.json` — Presets de calidad gráfica

---

## 2. Modelos 3D GLB Requeridos (`client/public/assets/`)

### Personajes (`assets/characters/`)
**Presupuesto de poligonaje**: 8.000 a 20.000 triángulos por modelo.
**Especificaciones**: Estilo caricaturesco estilizado semi-realista (*Fortnite* / *Free Fire*), anatomía completa, ojos expresivos, ropa táctica, chaleco, guantes, botas. Con esqueleto rígido y clips de animación en el GLB (`Idle`, `Walk`, `Run`, `Aim`, `Shoot`, `Reload`, `Jump`, `Hit`, `Death`).

- `humano.glb`
- `gato.glb`
- `dino.glb`
- `robo_perro.glb`
- `conejo.glb`
- `ardilla.glb`

---

### Armas (`assets/weapons/`)
**Presupuesto de poligonaje**: 2.000 a 6.000 triángulos por modelo.
**Especificaciones**: Modelos detallados de armas (*Free Fire*), cañón, empuñadura, cargador, mira y texturas PBR.

- `pistola.glb`
- `escopeta.glb`
- `rifle.glb`
- `sniper.glb`
- `cuchillo.glb`
- `espada.glb`

---

### Vegetación y Rocas (`assets/vegetation/` & `assets/rocks/`)
**Presupuesto de poligonaje**: 1.000 a 4.000 triángulos por modelo.
**Especificaciones**: Árboles con tronco irregular y copas orgánicas (*Fortnite*); rocas angulares Low Poly.

- `arbol_pino.glb`
- `arbol_roble.glb`
- `arbusto.glb`
- `roca_grande.glb`

---

### Edificios y Coberturas (`assets/buildings/` & `assets/environment/`)
**Presupuesto de poligonaje**: 3.000 a 15.000 triángulos por edificio; 500 a 2.000 por cobertura.

- `edificio_01.glb`
- `cobertura_caja.glb`
- `cobertura_barril.glb`

---

## 3. Texturas PBR del Terreno (`assets/textures/`)

- `cesped_albedo.jpg` — Mapa de color difuso
- `cesped_normal.jpg` — Mapa de normales de superficie
- `cesped_roughness.jpg` — Mapa de rugosidad
- `cesped_ao.jpg` — Mapa de oclusión ambiental

---

## 4. Instrucciones de Instalación

1. Descargar o exportar los archivos `.glb` con los nombres especificados.
2. Copiarlos directamente en las carpetas correspondientes bajo `client/public/assets/`.
3. Al iniciar la aplicación Angular, el `ConfigManager` y el `AssetManager` detectarán y renderizarán automáticamente los modelos GLB sin necesidad de modificar el código ni recompilar.
