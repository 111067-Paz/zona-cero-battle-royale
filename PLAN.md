# PLAN — Battle Royale Web ("Zona Cero") — v3

Plan de diseño e implementación de un battle royale web 2D top-down con renderer intercambiable, servidor autoritativo en Java 21 + Spring Boot 4 y cliente Angular 21 + PixiJS. Documento vivo: cada fase se diseña acá ANTES de codearse y requiere OK explícito.

> **v3**: revisión exhaustiva sobre la v2 (`F:\Proyectos\battle-royale\PLAN.md`, que queda como referencia histórica) e **integración de la propuesta visual "Battle Bash"** (`propuesta3_ui_ux.md`). Se encontraron y corrigieron **17 hallazgos nuevos (4 ALTOS)** — el registro completo está en §16. La integración elemento-por-elemento de la propuesta UI/UX está en §15. La tabla de conexiones UI ↔ protocolo ↔ dominio (qué campo alimenta cada píxel del HUD) está en §7.9.

> **Regla de oro del proyecto:** la simulación se escribe UNA sola vez, en Java, y es la autoridad absoluta. El cliente dibuja e insinúa; el servidor DECIDE. Todo lo demás del plan se deriva de esta frase.

---

## 1. Visión y alcance

### 1.1 Qué ES

- Un **battle royale 2D top-down** jugable en el navegador: hasta **10 jugadores** por partida (humanos y/o bots), un mapa con obstáculos, armas para lootear, una zona segura que se achica y un único ganador.
- **Servidor autoritativo**: toda la lógica de juego corre en el backend. El "prototipo local" de las primeras fases es este MISMO servidor corriendo en `localhost`, jugando solo contra bots. Cuando llegue el multijugador real (Fase 6), la simulación NO se toca — solo se agregan salas y matchmaking.
- **Renderer intercambiable**: la simulación emite un estado agnóstico del dibujo (snapshot en coordenadas de mundo). El renderer es una abstracción del cliente con tres implementaciones posibles: **2D top-down (principal, MVP)**, **isométrico 2.5D** (misma snapshot, otra proyección) y **3D** (extensión futura documentada en §11).
- **Estética "Battle Bash"** (propuesta3): 2D cartoon con contornos negros gruesos (3px), colores saturados, HUD táctico-caricaturesco. El HUD y las pantallas se implementan en Angular con CSS desde las primeras fases (es barato); el arte de sprites usa placeholders estilizados hasta el final (§15, R35).
- **Plataforma** clásica alrededor del juego: registro, login JWT, perfil, estadísticas persistentes, ranking.

### 1.2 Qué NO es (y por qué)

| Descartado | Por qué |
|---|---|
| "Mundo abierto" con streaming de terreno | Un mapa fijo de tamaño moderado enseña el 100% de la arquitectura con el 5% del costo. Ampliar el mapa después es cambiar UNA constante. |
| 100 jugadores por partida | El costo de red crece con jugadores × snapshot rate. 10 jugadores permite JSON legible y depurable; escalar es optimización (Fase 7+), no diseño. |
| Gameplay 3D con verticalidad | Requiere eje Z en la SIMULACIÓN. El renderer 3D sobre mundo plano SÍ está contemplado (§11); la verticalidad no. |
| Móvil / touch | MVP es teclado (WASD) + mouse. Los inputs viajan como intención abstracta: agregar touch después no toca el protocolo. |
| Simulación en el navegador | Escribirla en TypeScript obligaría a REESCRIBIRLA en Java al pasar a multijugador. Se escribe una vez, en Java (§2.2). |
| **Squads / party / invitar amigos** (propuesta3) | Requiere sistema de amigos, daño de equipo, victoria por equipo, radar de compañeros. MVP es FFA de 10. Diferido (R33). |
| **Economía: monedas, gemas, tienda, misiones, XP, niveles, rangos** (propuesta3) | Sistemas de metajuego completos, ortogonales al gameplay. Diferidos (R32, R34). |
| **Personajes con stats propios** (Vida 130 / Daño 51 / Velocidad 30 de la propuesta) | Romperían la validación "velocidad = constante del server". Los personajes del MVP son PIEL (sprite), no stats (R32). |

### 1.3 Constantes y decisiones de gameplay iniciales (tunables por configuración, no hardcodeadas)

| Constante / decisión | Valor inicial | Nota |
|---|---|---|
| Tick rate simulación | 30 ticks/s (dt fijo = 1/30 s) | El loop NUNCA usa reloj de pared para física |
| Snapshot rate | 15/s (1 cada 2 ticks) | El cliente interpola entre snapshots. Se emite EN TODOS los estados de la partida (R27) |
| Jugadores por partida | 10 | Humanos + bots hasta completar. FFA, sin equipos |
| Mundo | 256 × 256 unidades | 1 unidad ≈ 1 metro |
| Radio jugador | 0.5 u | Colisión circular |
| Velocidad jugador | 5 u/s | Clampeada SIEMPRE server-side |
| Vida | 100 HP | Igual para todos (R32). Botiquín cura 50, instantáneo, nunca supera 100 |
| **Arma inicial** | Pistola | Nadie nace desarmado (R17) |
| **Munición** | Infinita en MVP | Cargadores DIFERIDOS — el HUD NO muestra munición (R10, reafirmado contra la propuesta en R31) |
| **Botiquines** | Máximo 3 en inventario | Tope explícito; snapshot lleva el contador (R28) |
| **Recoger arma con arma equipada** | Reemplaza; la anterior DESAPARECE | Drop-on-swap diferido junto con drop al morir (R28) |
| **Colisión jugador↔jugador** | NO en MVP | Evita física de empujones; proyectiles sí impactan (R16) |
| **Drop al morir** | NO en MVP | El loot viene de spawns del mapa |
| Retención de desconectado | 10 s (300 ticks) | Luego muere por abandono. Mientras tanto: quieto, VIVO y VULNERABLE (R26) |
| **Heartbeat / timeout de sesión** | 5 s sin **ningún mensaje válido** → desconectado | El INPUT a 30 Hz lo cubre; el sampler corre en TODOS los estados (R24) |
| **Radar / minimapa MVP** | Solo zona (actual + próxima) y posición propia | Sin puntos de enemigos (R30); niebla de guerra diferida (R20) |
| Interpolación cliente | render a t − 100 ms | Snap sin lerp si la distancia entre snapshots > 3 u (R9) |
| Buffer de snapshots cliente | últimos 30 | Snapshot más nuevo con > 1 s de edad → resincronización fría |

Todas viven en `application.yml` bajo `juego.*`, cargadas con `@ConfigurationProperties` tipado (nunca `@Value` disperso). Las que el cliente necesita (tickRate, velocidad, mundo) viajan en `BIENVENIDA` — el cliente NUNCA las duplica hardcodeadas.

---

## 2. Decisiones de arquitectura fundamentales (el PORQUÉ)

### 2.1 Híbrido REST + WebSocket — cada protocolo para su naturaleza

- **REST** es pedido→respuesta. Sirve para lo transaccional y esporádico: registro, login, perfil, estadísticas, ranking, matchmaking. Ahí aplican TODOS los estándares de la plataforma (DTOs, Bean Validation, paginación, `@RestControllerAdvice`).
- **WebSocket** es una conexión persistente bidireccional. Sirve para lo continuo: el servidor empuja snapshots 15 veces por segundo y el cliente envía inputs sin overhead por mensaje. Spring Boot lo soporta nativo (`spring-boot-starter-websocket`, handler crudo — NO STOMP: el broker de tópicos agrega capas que un juego no necesita y esconde el control fino del envío).
- Frontera clara: **nada de gameplay viaja por REST; nada de CRUD viaja por WebSocket.**

### 2.2 Simulación escrita UNA vez, en Java

- Simulación en TypeScript en el navegador → al pasar a multijugador habría que **reescribir el corazón del juego en Java** y mantener dos implementaciones que divergen.
- **Decisión:** el prototipo local es el servidor Spring Boot corriendo en `localhost`, con UNA partida contra bots. Sigue siendo 100% local y jugable desde la Fase 0, pero el corazón ya es el definitivo.
- Verificación de honestidad: en la Fase 6 (multijugador real) está PROHIBIDO tocar `juego/dominio`. Si hace falta tocarlo, la abstracción falló y se registra como deuda.

### 2.3 Estado de partida en MEMORIA; JPA solo para la plataforma

- El estado vivo de una partida (posiciones, HP, proyectiles, zona) muta 30 veces por segundo y muere con la partida: **la memoria del proceso es su lugar correcto**. Simulación efímera ≠ registro contable.
- Lo que SÍ se persiste (JPA + H2 dev / PostgreSQL prod, Flyway desde la Fase 5): `Usuario`, `TokenRefresco`, `ResultadoPartida`, `ParticipacionPartida`, `EstadisticaJugador`.
- Frontera dura: el dominio de simulación **no importa nada de Spring ni de JPA** (POJO puro). La persistencia de resultados ocurre por **evento** → listener en la plataforma (§5.4). El motor jamás conoce un repository; la plataforma jamás toca objetos vivos de una partida.

### 2.4 Modelo de concurrencia COMPLETO — cada mutación tiene UN dueño

La familia entera de bugs de concurrencia se previene por diseño, no con locks:

1. **Hilo del loop (uno por partida):** ÚNICO lugar donde se muta el estado de esa partida. Sin `synchronized`, sin locks en el dominio.
2. **Hilos del contenedor WebSocket:** el handler solo **parsea, valida forma y encola** en la `ConcurrentLinkedQueue` de la partida. Jamás toca estado de juego. **Tampoco registra sesiones en la lista de emisión** — eso lo hace el loop al procesar `UNIRSE` (R25).
3. **Actor de matchmaking (un solo hilo):** ÚNICO dueño de las colas de espera y de la asignación jugador→partida. Elimina por diseño las carreras "partida llena en el instante del join" y "usuario en dos colas" (R6).
4. **Envío de snapshots:** el snapshot se construye dentro del tick como **copia por VALOR — jamás referencias a objetos vivos ni del pool** (R14) —, se serializa UNA vez y se envía por sesión vía `ConcurrentWebSocketSessionDecorator` (límites: 5 s / 512 KB), la forma thread-safe y no bloqueante de escribir en una `WebSocketSession` de Spring. Un cliente lento NUNCA frena el tick (R5).
5. **Persistencia de fin de partida:** el listener corre sincrónico en el hilo del loop — inofensivo porque la partida ya está `FINALIZADA` y no vuelve a simular (§5.4).

### 2.5 Renderer intercambiable — puertos y adaptadores del lado del cliente

- La simulación emite snapshots en **coordenadas de mundo** (x, y en unidades, ángulos en radianes). Cero nociones de píxeles, sprites o cámaras.
- `RendererJuego` es una **interfaz** (Bridge): `RendererTopDown2D` (PixiJS, MVP) · `RendererIsometrico` (PixiJS, proyección iso + depth sort, Fase 8) · `Renderer3D` (Three.js, futura, §11).
- El input también es abstracto: teclado/mouse se traducen a **intención** (`mover` vector, `apuntar` ángulo). Un renderer 3D traduciría el ray de cámara al mismo ángulo — el protocolo no cambia.

### 2.6 Interpolación primero, predicción después

- Fases 1–6: el cliente renderiza **~100 ms en el pasado**, interpolando entre los dos snapshots que encierran ese instante.
- Fase 7: client prediction + reconciliación. El protocolo lo habilita DESDE la Fase 0 sin implementarlo: cada `INPUT` lleva **número de secuencia** y el snapshot devuelve los **acks** por jugador (§5.2).

### 2.7 Determinismo de la simulación — el arma anti-bugs más poderosa

- dt fijo, RNG con **semilla por partida** (inyectado, jamás `Math.random()`), cero I/O ni reloj de pared en el dominio, y **orden determinista TOTAL**: los comandos drenados se ordenan por (orden de unión del jugador, secuencia); los bots piensan dentro del tick, en orden de id; los daños del tick se aplican por id de proyectil.
- Consecuencia: misma semilla + misma secuencia de comandos = mismo resultado, tick por tick. Los tests de simulación no necesitan mocks (§9.1). Bonus futuro: replays = grabar semilla + comandos.

### 2.8 Idioma del código

**Dominio en español** (`Partida`, `Jugador`, `Proyectil`, `ZonaSegura`, `Botin`, `Arma`, `IntencionJugador`), **técnica en inglés** (sufijos `Service`, `Controller`, `Handler`, métodos `findById`). Aplica igual en TypeScript.

---

## 3. Arquitectura del sistema

```
┌────────────────────────── NAVEGADOR ──────────────────────────┐
│  Angular 21 (shell, zoneless)                                 │
│  ┌─────────┐ ┌─────────┐ ┌──────────────────────────────────┐ │
│  │ Login / │ │ Menú /  │ │ Feature Partida                  │ │
│  │ Registro│ │ Ranking │ │ ┌──────────┐  ┌────────────────┐ │ │
│  │ (forms  │ │ (HTTP + │ │ │ Conexión │→ │ Estado (store  │ │ │
│  │ react.) │ │ signals)│ │ │ (RxJS/WS)│  │ + interpolador)│ │ │
│  └────┬────┘ └────┬────┘ │ └────┬─────┘  └───────┬────────┘ │ │
│       │           │      │      │ INPUT(sec)     ↓ estado    │ │
│       │           │      │ ┌────┴─────┐  ┌────────────────┐ │ │
│       │           │      │ │ Entrada  │  │ RendererJuego  │ │ │
│       │           │      │ │ (intención│ │ (interfaz)     │ │ │
│       │           │      │ │  30 Hz)  │  │ ├ TopDown2D ★  │ │ │
│       │           │      │ └──────────┘  │ ├ Isometrico   │ │ │
│       │           │      │  HUD: signals │ └ 3D (futuro)  │ │ │
│       │           │      └──────────────────────────────────┘ │
└───────┼───────────┼─────────────┼─────────────────────────────┘
        │ REST/JSON │ REST/JSON   │ WebSocket (INPUT ↑ / SNAPSHOT+EVENTO ↓)
┌───────┴───────────┴─────────────┴─────────────────────────────┐
│  Spring Boot 4 — monolito modular                             │
│  ┌───────────────────────┐   ┌──────────────────────────────┐ │
│  │ MÓDULO PLATAFORMA     │   │ MÓDULO JUEGO                 │ │
│  │ REST + JPA + JWT      │   │ ┌──────────────────────────┐ │ │
│  │ · auth (login/refresh)│   │ │ red/  (WS handler,       │ │ │
│  │ · usuarios            │   │ │  sesiones, tickets)      │ │ │
│  │ · matchmaking (actor) │   │ ├──────────────────────────┤ │ │
│  │ · estadísticas/ranking│   │ │ motor/ (GestorPartidas,  │ │ │
│  │ · resultados          │   │ │  GameLoop 30t/s, colas,  │ │ │
│  │        ▲              │   │ │  pool proyectiles,       │ │ │
│  │        │ evento       │   │ │  emisor snapshots)       │ │ │
│  │  FinDePartida         │   │ ├──────────────────────────┤ │ │
│  │  (ApplicationEvent)   │◄──┼─│ dominio/ (SIMULACIÓN     │ │ │
│  └───────────┬───────────┘   │ │  PURA: sin Spring, sin   │ │ │
│              ▼               │ │  JPA, determinista)      │ │ │
│      H2 dev / PostgreSQL     │ ├──────────────────────────┤ │ │
│      (Flyway)                │ │ protocolo/ (mensajes v1) │ │ │
│                              │ └──────────────────────────┘ │ │
│  comun/ (config, seguridad, errores)                         │ │
│  contratos/fixtures/*.json (compartidos con el cliente §9.3) │ │
└────────────────────────────────────────────────────────────────┘
```

### 3.1 Mapa de hilos del servidor (quién ejecuta qué — se revisa en todo PR)

| Familia de hilos | Qué hace | Qué tiene PROHIBIDO |
|---|---|---|
| HTTP (pool del contenedor) | Controllers REST de plataforma | Tocar partidas vivas |
| WebSocket (pool del contenedor) | Parsear, validar FORMA, encolar comandos; detectar cierre de socket → encolar `ComandoDesconexion`; refrescar el sello de heartbeat de la sesión (R24) | Mutar estado de juego; llamar métodos del dominio; **agregar sesiones a la lista de emisión** (R25) |
| Loop de partida (1 hilo dedicado por partida, `newSingleThreadScheduledExecutor`) | TODA mutación del estado de su partida; alta de sesiones en la lista de emisión al procesar `UNIRSE` (R25); construcción del snapshot (copia por valor); publicación de eventos; persistencia al finalizar (vía listener sync) | Bloquearse esperando I/O de red (el envío es no-bloqueante vía decorator) |
| Actor matchmaking (1 hilo único global) | Colas de espera, deduplicación por usuario, creación de partidas, asignación | Tocar el estado interno de una partida ya creada |
| Sweeper (1 hilo, `@Scheduled`) | Barrer tickets vencidos y partidas huérfanas (higiene de memoria, R12) | Todo lo demás |

**Reglas de frontera (se revisan en todo PR):**
1. `juego/dominio` no importa Spring, JPA ni nada de `plataforma`. POJO puro.
2. `plataforma` jamás referencia objetos vivos del motor: recibe DTOs vía eventos.
3. El cliente Angular jamás toca `HttpClient` ni el WebSocket fuera de services.
4. `render/` solo LEE el estado interpolado; jamás lo muta ni conoce la conexión.
5. Ningún método del dominio se invoca desde hilos que no sean el loop de su partida.

### 3.2 Estructura de paquetes — dos arquitecturas bajo un mismo techo

**`plataforma` usa arquitectura en CAPAS** (el estándar del parcial, SRP por carpeta) porque es un dominio transaccional clásico. **`juego` usa un núcleo hexagonal** (dominio puro en el centro, adapters alrededor) porque es una simulación en tiempo real — la regla de dependencias de Clean Architecture aplicada donde paga, sin la ceremonia donde no.

```
server/src/main/java/ar/pazluciano/battleroyale/
├── plataforma/                ← ARQUITECTURA EN CAPAS (estándar parcial)
│   ├── controllers/           → reciben request, delegan, devuelven DTO. CERO lógica de negocio
│   ├── services/              → interfaz (contrato) + impl/. TODA la lógica de plataforma
│   ├── repositories/          → extienden JpaRepository. Solo persistencia, cero lógica
│   ├── entities/              → JPA puro (§4.2), sin lógica. NUNCA se exponen en la API
│   ├── dtos/                  → contratos de entrada/salida REST. Clases con Lombok
│   ├── mappers/               → entity ↔ DTO. Capa propia, inyectados (jamás new dentro del service)
│   ├── exceptions/            → excepciones de dominio + GlobalExceptionHandler
│   └── listeners/             → ResultadoPartidaListener (consume FinDePartida, §5.4)
├── juego/                     ← NÚCLEO HEXAGONAL (la regla de dependencias apunta hacia adentro)
│   ├── dominio/               → simulación POJO PURA: sin Spring, sin JPA, sin I/O, determinista
│   │   ├── partida/           → Partida, estados (State), ZonaSegura, Jugador, IntencionJugador
│   │   ├── combate/           → Arma (Strategy), Proyectil, resolución de daño
│   │   ├── bots/              → EstrategiaBot (Strategy + FSM), percepción
│   │   └── mapa/              → MapaJuego, Botin, FabricaBotin
│   ├── motor/                 → adapter de ejecución: GestorPartidas, GameLoop, colas, pool, emisor
│   ├── red/                   → adapter de red: WS handler, sesiones, tickets (parsea/valida/encola)
│   └── protocolo/             → mensajes v1 — acá los mensajes SON los DTOs (§12)
├── comun/                     → configs/ (beans), seguridad/ (F5), errores base
└── BattleRoyaleApplication.java
```

- Interfaces: en `plataforma`, servicio = contrato + impl (estándar). En `juego/dominio` las interfaces existen SOLO donde hay polimorfismo real (`Arma`, `EstrategiaBot`, estados de `Partida`) — una interfaz sin segunda implementación es ceremonia.
- `external/` del modelo de capas NO aplica hoy: el MVP no consume APIs externas. Si algún día aparece una, nace como `plataforma/external/` con RestClient, único módulo que la llama.

```
client/src/app/
├── core/                      → auth.interceptor, auth.guard, servicios singleton (F5)
├── features/
│   ├── auth/                  → login/registro (reactive forms)
│   ├── lobby/                 → menú, stats, cola de matchmaking (REST + signals, Flujo I.2)
│   └── partida/               → conexion/ (WS) · estado/ (store + interpolador) · entrada/
│                                · render/ (RendererJuego + implementaciones, Bridge) · hud/
├── models/                    → tipos TS del protocolo y la API (cero any; espejo de fixtures §9.3)
└── shared/                    → pipes, componentes visuales reutilizables (tokens §15)
```

---

## 4. Modelo de dominio

### 4.1 Simulación (POJOs puros — NO son entidades JPA)

| Clase | Responsabilidad | Notas de diseño |
|---|---|---|
| `Partida` | Raíz del agregado: jugadores, proyectiles, botines, zona, mapa, tick, RNG con semilla, **contador de idRed**, **tick de inicio de EN_CURSO** (R27) | Máquina de estados (§4.3). Único punto de mutación: `avanzarTick(...)` |
| `Jugador` | Posición, ángulo, kills, arma, botiquines (0–3), `IntencionJugador`, últimaSec, y **DOS ejes de estado independientes** (R26): `EstadoVida {VIVO, MUERTO}` y `conectado: boolean` | Un bot ES un `Jugador` cuya intención la escribe una `EstrategiaBot` — el dominio no distingue humano de bot. **Vulnerable = VIVO, esté conectado o no.** Desconectado y VIVO: intención quieta, 300 ticks de gracia, luego MUERTO por abandono |
| `IntencionJugador` | Lo que el jugador QUIERE hacer ahora: `mover` (vector), `apuntar` (ángulo), `disparar` (bool) | Semántica last-wins: cada INPUT la REEMPLAZA. La simulación la lee en cada tick. Resuelve el jitter 0-o-2-inputs-por-tick (R4) |
| `Arma` | Interfaz Strategy: `disparar(...)` → proyectiles; cadencia EN TICKS, daño, dispersión, velocidad | `Pistola`, `Escopeta` (múltiples perdigones), `Rifle`. Granada NO existe en MVP (R39) |
| `Proyectil` | **`idRed` monotónico por partida (NUNCA se recicla)**, posición, velocidad, daño, dueño, tick de expiración | El objeto sale de un Object Pool (slot reciclable), pero el `idRed` es nuevo SIEMPRE (R2). Colisión por SEGMENTO recorrido en el tick (anti-tunneling). Impacta a todo jugador **VIVO**, conectado o no (R26) |
| `ZonaSegura` | Centro, radio, fase, cronograma de contracción | Daño por tick con acumulador fraccional (§8.3). Daña a todo VIVO fuera del círculo, conectado o no |
| `Botin` | Tipo (arma/botiquín), posición, disponible | Creado por `FabricaBotin` (tabla de probabilidades + RNG de la partida) |
| `MapaJuego` | Obstáculos AABB (cajas, árboles, rocas, carpas), spawns de jugadores y botín, dimensiones, **decoración sin colisión** (río, flores — R36) | Inmutable, compartido entre partidas. Obstáculos dispersos, sin laberintos — los bots usan steering simple, NO A* (decisión, no accidente) |
| `EstrategiaBot` | Strategy + FSM: escribe la `IntencionJugador` de su bot dentro del tick | `MERODEAR → PERSEGUIR → ATACAR → BUSCAR_ZONA`, con histéresis anti-vibración. Percepción: radio + línea de vista (reutiliza el raycast de colisión) |

**Regla clave de los bots:** los bots producen la MISMA `IntencionJugador` que un humano, dentro del tick y en orden por id. La simulación no tiene ramas `if (esBot)`.

**Reglas de inventario (R28, R37):**
- Recoger un **arma** teniendo otra: la nueva reemplaza, la vieja desaparece (sin drop en MVP — coherente con "drop al morir NO").
- Recoger un **botiquín** con 3 en inventario: **no-op silencioso** — el botín queda en el piso, la acción se consume igual.
- `RECOGER` elige el botín más cercano en rango SIN filtrar por aplicabilidad (empate → menor id, R15). Si el elegido no aplica (tope lleno), no-op. Simple y determinista; "elegir el más cercano útil" queda como mejora futura si molesta en la práctica.

### 4.2 Plataforma (entidades JPA — acá SÍ aplican los estándares completos)

| Entidad | Campos clave | Notas |
|---|---|---|
| `Usuario` | id, nombreUsuario UNIQUE, email UNIQUE, passwordHash (BCrypt ≥12), rol, activo, auditoría | Baja lógica; `@Enumerated(STRING)` |
| `TokenRefresco` | id, usuario FK, hashToken, familia UUID, expiración, revocado | Rotación en cada uso; reuso de token viejo → se revoca la FAMILIA completa (R18) |
| `ResultadoPartida` | id, partidaId UUID **UNIQUE** (idempotencia), fechaInicio/Fin, cantidadJugadores | El UNIQUE garantiza persistir UNA sola vez |
| `ParticipacionPartida` | resultado FK, usuario FK (null si bot), posiciónFinal, kills, **muertes (0/1)**, dañoInfligido, sobrevivióSegundos | `@ManyToOne LAZY` |
| `EstadisticaJugador` | usuario FK UNIQUE, partidasJugadas, victorias, kills, **muertes**, **top3**, mejorPosición | **R38:** sin `muertes` no hay K/D (la propuesta lo muestra); con partidas de 10, "TOP 10" es toda partida — la métrica útil es **TOP 3**. Se actualiza con **UPDATE atómico** (`SET kills = kills + :d`) en la MISMA transacción del resultado — nunca leer-modificar-guardar (R13) |

### 4.3 Máquina de estados de `Partida` (patrón State)

```
EN_LOBBY ──(mínimo alcanzado / timeout+bots)──► CUENTA_REGRESIVA ──(3s en ticks)──► EN_CURSO ──► FINALIZADA
   │ acepta: UNIRSE, SALIR (sale)                   │ INPUT: ignorado      │ acepta: INPUT           │ solo lectura
   │ INPUT: ignorado SIN strike (R24)               │ SIN strike (R24)     │ SALIR = abandono=muerte │ persiste, gracia, limpieza
```

- Cada estado define QUÉ comandos acepta y qué hace su tick. La semántica de `SALIR` depende del estado (R23): en lobby te vas; en curso es abandono y cuenta como muerte.
- **R24:** un `INPUT` bien formado en un estado que no lo procesa se **ignora en silencio** (ni strike, ni cierre) y **cuenta como heartbeat**. El cliente muestrea y envía a 30 Hz desde que recibe `BIENVENIDA` hasta que cierra el socket, EN TODOS los estados (lobby, cuenta regresiva, jugando, muerto-espectador, pantalla final). Sin esto, un lobby de 30 s desconecta a todos a los 5 s.
- **R27:** el SNAPSHOT lleva SIEMPRE el estado de la partida (`estado`) para que el cliente sepa qué pantalla renderizar; en `CUENTA_REGRESIVA` lleva `ticksParaInicio`; en `EN_CURSO` lleva `tickInicio` (constante) para que el HUD calcule `TIME` incluso si el cliente se reconectó a mitad de partida.
- `EN_CURSO` contiene el cronograma de zona (aviso → contracción → espera, repetido) como DATOS, no como sub-estados.
- Transición a `FINALIZADA`: queda 1 VIVO, 0 VIVOS (empate §8.3) o timeout global. **VIVO cuenta esté conectado o no** (R26): un desconectado puede "ganar" solo si su gracia de 10 s no venció — ventana acotada y aceptada.
- `FINALIZADA`: publica `FinDePartida` UNA vez (flag), tick corto de solo-gracia (300 ticks para que los clientes vean la pantalla final), luego el `GestorPartidas` desregistra y el executor se apaga (§7-F).

---

## 5. Protocolo cliente↔servidor (contrato v1)

JSON en ambas direcciones (legible y depurable; binario/delta es optimización MEDIDA de Fase 7+). Todo mensaje lleva `v: 1` — versión distinta se rechaza con cierre limpio. Fixtures compartidos en `contratos/fixtures/*.json` (§9.3).

### 5.1 Cliente → servidor

```jsonc
{ "v": 1, "tipo": "UNIRSE", "ticket": "..." }
// Fases 0-4: sin ticket (perfil dev). Desde Fase 5: ticket OBLIGATORIO siempre.

{ "v": 1, "tipo": "INPUT", "sec": 812,          // secuencia MONOTÓNICA por conexión, arranca en 1
  "mover": { "x": 0.0, "y": -1.0 },             // el server RE-normaliza: jamás confía en el módulo
  "apuntar": 1.57,                               // radianes
  "disparar": true,
  "acciones": ["RECOGER"] }                      // one-shot, máx 2 por mensaje: RECOGER | USAR_BOTIQUIN

{ "v": 1, "tipo": "SALIR" }
```

**Semántica del INPUT (R3, R4, R24) — la parte más importante del protocolo:**
- `mover`/`apuntar`/`disparar` NO son impulsos: **reemplazan la INTENCIÓN vigente** del jugador (last-wins por `sec`). La simulación lee la intención en CADA tick. Si llegan 2 INPUTs entre ticks, gana el último; si llegan 0, sigue la intención anterior. Ni tirones ni dobles aplicaciones.
- `acciones` son one-shot: se encolan y se consumen UNA vez (tope 2 por tick por jugador).
- `sec` estrictamente creciente: `sec <= últimaSec` → descarte silencioso. Reconexión = conexión nueva = `sec` reinicia en 1 y el server resetea `últimaSec`.
- **El sampler del cliente corre SIEMPRE (R24):** desde `BIENVENIDA` hasta el cierre del socket, a 30 Hz, en todos los estados de partida y también muerto (espectador). Ese flujo constante ES el heartbeat: 5 s sin **ningún mensaje válido** → desconectado.

### 5.2 Servidor → cliente

```jsonc
{ "v": 1, "tipo": "BIENVENIDA", "idJugador": "...", "idPartida": "...",
  "config": { "tickRate": 30, "snapshotRate": 15, "mundo": 256, "velocidad": 5.0 },
  "idMapa": "campo-01" }

{ "v": 1, "tipo": "SNAPSHOT", "tick": 1234,
  "estado": "EN_CURSO",                          // R27: EN_LOBBY | CUENTA_REGRESIVA | EN_CURSO | FINALIZADA
  "tickInicio": 90,                              // R27: solo en EN_CURSO (constante); en CUENTA_REGRESIVA va "ticksParaInicio"
  "acks": { "j-1": 812, "j-2": 799 },            // última sec procesada por jugador → habilita la predicción de Fase 7
  "jugadores":  [ { "id": "j-1", "x": 12.5, "y": 40.2, "angulo": 1.57, "hp": 80,
                     "arma": "RIFLE", "estadoVida": "VIVO", "conectado": true,   // R26: dos ejes
                     "botiquines": 2, "kills": 3 } ],                            // R28: contador para el quick-slot
  "proyectiles": [ { "id": 4711, "x": 13.1, "y": 39.0, "angulo": 1.57 } ],   // id = idRed, JAMÁS reciclado
  "botines":     [ { "id": 3, "tipo": "BOTIQUIN", "x": 100.0, "y": 30.0 } ],
  "zona": { "cx": 128, "cy": 128, "radio": 90, "fase": 2,
             "proxima": { "cx": 110, "cy": 140, "radio": 55 }, "ticksParaContraccion": 300 } }

{ "v": 1, "tipo": "EVENTO", "evento": "KILL",    // KILL | MUERTE_ZONA | ZONA_CAMBIO | RECOGIDO | FIN_PARTIDA
  "datos": { "asesino": "j-2", "victima": "j-1", "arma": "ESCOPETA" } }
```

- Snapshot **completo** (no delta) hasta la Fase 7: con 10 jugadores es trivial y la depuración, oro. Consecuencia asumida: un cliente modificado ve todo el mapa. Aceptado en MVP; interest management diferido (R20). **Por eso mismo, el radar del MVP NO muestra enemigos (R30):** sería wallhack-by-design para todos.
- **Orden dentro del tick: primero el SNAPSHOT, después los EVENTOs de ese tick** (R22) — el cliente nunca recibe un KILL de un estado que todavía no vio.
- Los eventos discretos viajan aparte del snapshot porque son hechos puntuales que el cliente no debe "descubrir" comparando snapshots (kill feed, sonidos, fin). **Excepción deliberada (R29):** los números de daño flotantes del MVP SÍ se derivan comparando `hp` entre snapshots consecutivos (agregan ~66 ms de daño por número — aceptable); un `EVENTO IMPACTO` por golpe queda diferido y el protocolo lo admite sin ruptura.
- El mapa NO viaja en snapshots: es estático; el cliente lo baja UNA vez por REST (`GET /api/mapas/{id}`, cacheable) al recibir `BIENVENIDA`.
- **El cliente ignora cualquier SNAPSHOT/EVENTO recibido antes de su `BIENVENIDA`** (defensa en profundidad de R25).

### 5.3 Validación server-side de TODO input (el cliente es hostil por definición)

| Input | Validación | Ataque/bug que previene |
|---|---|---|
| `mover` | Re-normalizar; velocidad = constante del server | Speed hack |
| `disparar` | Cooldown contado en TICKS del server por arma | Macro de disparo |
| `acciones: RECOGER` | Distancia ≤ rango EN EL SERVER; botín elegido = más cercano, empate → menor id (R15); no aplicable → no-op (R37) | Loot a distancia; ambigüedad |
| `sec` | Estrictamente creciente por conexión | Replay, duplicados, reordenamiento |
| `acciones` | Máx 2 por tick por jugador | Spam de acciones |
| Frecuencia de mensajes | Rate limit por conexión (60 msg/s); exceso → cierre | Flooding |
| JSON malformado / tipo desconocido / v distinta | Descartar y contar; 3 strikes → cierre | Fuzzing, clientes rotos |
| **INPUT bien formado en estado que no lo procesa** | **Ignorar en silencio; SIN strike; refresca heartbeat (R24)** | Desconexiones falsas en lobby/cuenta regresiva/espectador |

### 5.4 Fin de partida → persistencia (frontera motor→plataforma)

1. `Partida` entra en `FINALIZADA` y arma el DTO `ResumenPartida` (posiciones finales, kills, muertes, daño, duración).
2. El **motor** (no el dominio) lo publica como `ApplicationEvent`. El dominio no sabe que Spring existe.
3. `ResultadoPartidaListener` (plataforma) lo consume **sincrónico, en el hilo del loop** — inofensivo: la partida ya no simula. `@Transactional`: inserta `ResultadoPartida` + `ParticipacionPartida` + UPDATE atómico de `EstadisticaJugador` (kills, muertes, top3, victorias — R38). Una transacción, todo o nada.
4. Idempotencia doble: flag `eventoPublicado` en la partida + `partidaId` UNIQUE en BD. Si la BD está caída, la excepción la captura el manejo del loop (§8.1), se loguea con el resumen completo y la partida se limpia igual — perder UN resultado se tolera; tumbar el proceso, no.

### 5.5 Autenticación del WebSocket — **desde la Fase 5** (R1)

El JWT **no viaja en la query string** (queda en logs de proxies). Patrón ticket:
1. `POST /api/partidas/ticket` (REST, autenticado) → ticket opaco de un solo uso, TTL 30 s, en memoria del server (el sweeper barre vencidos).
2. `UNIRSE` con el ticket → el server lo canjea (delete-on-use) y asocia la sesión al `Usuario`.
3. **Regla única de conexión duplicada (R7, re-expresada con los ejes de R26):** si el usuario ya está en la partida **VIVO y desconectado** → la nueva conexión **reanuda su plaza** (BIENVENIDA + snapshot completo, `sec`/`últimaSec` reinician). Si está **conectado** → se rechaza la nueva. Si está **MUERTO** → entra como espectador de su propia plaza hasta el fin.

---

## 6. Patrones GoF — cada uno justificado por un problema PRESENTE

| Patrón | Problema presente que lo exige | Dónde |
|---|---|---|
| **State** | `Partida` acepta comandos distintos y ticksea distinto según fase | `dominio/partida` |
| **Strategy** | Armas con cadencia/daño/dispersión distintos, lista que VA a crecer | `dominio/combate` |
| **Strategy + FSM** | Comportamientos de bot intercambiables, dificultad configurable | `dominio/bots` |
| **Command** | Inputs serializables (protocolo), encolables (§2.4), validables, re-aplicables (predicción F7) | `protocolo/` + colas |
| **Observer** | Fin de partida dispara persistencia SIN que el dominio conozca JPA | evento `FinDePartida` |
| **Object Pool** | Cientos de proyectiles/s = presión de GC en el hot path | `motor/` (con `idRed` aparte, R2) |
| **Factory Method** | Spawn de botín por tabla de probabilidades con RNG de la partida | `FabricaBotin` |
| **Bridge** | Renderer intercambiable: la abstracción evoluciona aparte de sus implementaciones | `client: render/` |

**Anti-patrones descartados:** Singleton con estado (el `GestorPartidas` es un bean, único por inyección) · Strategy para enums chicos estables · Template Method para el loop (es UN método con pasos fijos).

---

## 7. Flujos de punta a punta — cómo se conecta CADA pieza, paso a paso

Cada paso indica **[quién lo ejecuta]**. Estos flujos son el contrato de integración: si un PR los altera, se actualiza esta sección o se rechaza el PR.

### Flujo A — Arranque en desarrollo (desde Fase 0)

1. **[Humano]** `./mvnw spring-boot:run` en `server/` → Boot levanta en `:8080`: contexto Spring, handler WS registrado en `/ws/partida`, y (fases 0–4) el `GestorPartidas` crea UNA partida local contra bots al arrancar (perfil dev).
2. **[Humano]** `npm start` en `client/` → `ng serve` en `:4200` con `proxy.conf.json` que reenvía `/api` → `:8080` y `/ws` → `:8080` **con `"ws": true`** — sin esa flag el proxy NO upgradea la conexión WebSocket y el juego muere en dev con un error confuso (R19).
3. **[Navegador]** `http://localhost:4200/partida` → Angular carga la ruta lazy, instancia los services del feature.

### Flujo B — Conexión y entrada a una partida (corregido por R25)

1. **[Cliente — `ConexionPartidaService`]** Abre `new WebSocket('/ws/partida')` y expone dos cosas: un `Observable` tipado de mensajes entrantes (un `switch` exhaustivo sobre `tipo` — TS obliga a cubrir todos los casos) y un método `enviar(mensaje)`.
2. **[Cliente]** `onopen` → envía `UNIRSE` (desde Fase 5: primero `POST /api/partidas/ticket` por REST con el Bearer, y `UNIRSE` lleva ese ticket).
3. **[Server — hilo WS]** El handler valida el `UNIRSE` (y canjea el ticket desde F5). Consulta al `GestorPartidas` la partida asignada. Registra la `SesionJugador` (sesión decorada + últimaSec=0) en el **registro de sesiones pendientes** — NO en la lista de emisión (R25).
4. **[Server — hilo WS → cola]** Encola `ComandoUnirse` con la referencia a la sesión. NO muta la partida.
5. **[Server — hilo del loop, tick N, paso "aplicar comandos"]** Drena el comando: el estado `EN_LOBBY` lo acepta, crea el `Jugador` (spawn válido, Pistola equipada, VIVO, conectado), **envía `BIENVENIDA` a esa sesión y RECIÉN ENTONCES la agrega a la lista de emisión**. Como el snapshot del tick se emite DESPUÉS de aplicar comandos, es imposible que esa sesión reciba un SNAPSHOT antes de su BIENVENIDA (R25). El cliente además descarta cualquier mensaje pre-BIENVENIDA por defensa en profundidad.
6. **[Cliente]** Al recibir `BIENVENIDA`: guarda config (velocidad, tickRate — NUNCA las hardcodea), **arranca el sampler de INPUT a 30 Hz (R24 — desde ya, aunque esté en lobby)** y dispara `GET /api/mapas/campo-01` por HTTP. Con el mapa en mano, instancia el `RendererJuego` activo y le pasa el mapa para el fondo estático.
7. **[Cliente]** Llegan los primeros SNAPSHOTs. Si `estado = EN_LOBBY`, el feature muestra la **pantalla de lobby de partida** (roster: nombres y cuántos faltan — los datos salen del propio snapshot, R27/R33). Si `estado = CUENTA_REGRESIVA`, overlay 3-2-1 con `ticksParaInicio / tickRate`. Si `estado = EN_CURSO`, el store llena el buffer → cuando hay 2 snapshots, el interpolador tiene con qué trabajar → primer frame dibujado.

### Flujo C — Un input de movimiento, milisegundo a milisegundo (la columna vertebral)

1. **[Cliente — evento DOM]** `keydown W` → `EntradaService` marca `teclas.w = true` en su estado interno. **Nada viaja todavía.** (`blur` de la ventana limpia TODAS las teclas — un `keyup` perdido dejaría al jugador corriendo solo, §8.4.)
2. **[Cliente — sampler a 30 Hz]** Cada 33 ms, `EntradaService` compone la intención: vector de movimiento por teclas, ángulo por posición del mouse relativa al jugador (se lo pregunta al interpolador; si aún no hay estado, ángulo 0), `disparar` por botón. Incrementa `sec` y envía `INPUT`. **Corre en todos los estados de partida (R24); si el estado no procesa inputs, el server lo usa solo como heartbeat.**
3. **[Cliente — WS]** Serializa JSON y `socket.send`.
4. **[Server — hilo WS]** `handleTextMessage`: parsea, valida FORMA (tipos, rangos, `v`), aplica rate limit, refresca heartbeat, resuelve la `SesionJugador` → encola `ComandoInput` en la `ConcurrentLinkedQueue` de la partida. Malformado → strike (3 → cierre).
5. **[Server — hilo del loop, tick N]** El tick ejecuta SIEMPRE estos pasos, en este orden:
   a. **Drenar** la cola completa a una lista local.
   b. **Ordenar** por (orden de unión del jugador, `sec`) — determinismo total.
   c. **Aplicar comandos**: por cada INPUT, si `sec <= últimaSec` → descarte; si el estado no procesa inputs → ignorar (R24); si no → reemplaza la `IntencionJugador` y encola `acciones` one-shot (tope 2). `UNIRSE` → alta + BIENVENIDA + lista de emisión (R25).
   d. **Bots piensan**: cada `EstrategiaBot`, en orden de id, lee el mundo y ESCRIBE la intención de su bot. Mismo mecanismo que los humanos.
   e. **Simular dt** (solo `EN_CURSO`): mover jugadores según intención (re-normalizada × velocidad × dt) con colisión círculo-vs-AABB y deslizamiento; decrementar cooldowns; disparar si `intención.disparar` y cooldown listo; avanzar proyectiles POR SEGMENTO y resolver impactos en orden de `idRed` **contra todo jugador VIVO, conectado o no (R26)**; aplicar daño de zona con acumulador; consumir acciones one-shot; decrementar gracias de desconexión (300 ticks → MUERTO por abandono); evaluar transiciones de estado (muertes, victoria).
   f. **Snapshot** (ticks pares): copia por VALOR de todo el estado visible + `estado` de la partida (R27) + mapa `acks`. Jamás referencias a objetos vivos o del pool.
   g. **Emitir**: serializar UNA vez; enviar a cada sesión de la lista de emisión vía su `ConcurrentWebSocketSessionDecorator` (no bloqueante, límites 5 s / 512 KB). Después del snapshot, los EVENTOs del tick (R22).
6. **[Cliente — `onmessage`]** `ConexionPartidaService` tipa el mensaje y lo publica en el stream.
7. **[Cliente — `EstadoPartidaStore`]** Snapshot con `tick <=` al último → descarte. Válido → entra al buffer (cap 30). **Solo acá se actualizan los signals del HUD** (HP, arma, kills, botiquines, vivos, zona, estado de partida) — nunca a 60 fps: Angular zoneless + signals hacen que el HUD repinte solo cuando cambia algo.
8. **[Cliente — rAF a 60 fps]** El interpolador calcula `t_render = ahora − 100 ms`, toma los dos snapshots que lo encierran e interpola: posiciones con lerp, **ángulos por el arco corto** (R8), y si la distancia entre snapshots supera 3 u, **snap sin lerp** (R9). Si el snapshot más nuevo tiene > 1 s: resincronización fría (vaciar buffer, esperar el próximo — caso pestaña en background).
9. **[Cliente — renderer]** `RendererTopDown2D.renderizar(estadoVisual)`: proyecta mundo→pantalla con la cámara centrada en el jugador y dibuja con PixiJS. El renderer no conoce sockets, ni el store, ni Angular: recibe un estado visual y dibuja. ESO es lo que permite cambiarlo por el isométrico o el 3D.

### Flujo D — Un disparo que mata

1. **[Loop, paso 5.e]** `intención.disparar == true` y cooldown en 0 → `Arma.disparar(...)` (Strategy): la `Escopeta` pide N proyectiles al **pool**, cada uno con `idRed = partida.siguienteIdRed()` (nunca reciclado) y dispersión del RNG de la partida. Cooldown = cadencia del arma, en ticks.
2. **[Loop, ticks siguientes]** Cada proyectil avanza su SEGMENTO `p0→p1` del tick: primero contra obstáculos (recorta el segmento), luego contra jugadores VIVOS — conectados o no (R26) — (círculo vs segmento). Sin este segmento, una bala rápida "saltaría" la pared entre dos ticks (tunneling).
3. **[Loop]** Impacto → `victima.recibirDanio(...)`; HP ≤ 0 → `estadoVida = MUERTO` (sin drop en MVP), kill al dueño del proyectil, muerte a la víctima (R38). El proyectil vuelve al pool (su `idRed` muere con él).
4. **[Loop, paso 5.g]** Snapshot del tick ya muestra al muerto; DESPUÉS viaja `EVENTO KILL`.
5. **[Cliente]** El feed agrega la línea del evento; **los números de daño flotantes salen del diff de `hp` entre el snapshot anterior y el nuevo (R29)** — el renderer los dibuja sobre la víctima y los anima 500 ms; el muerto queda en modo espectador (sigue recibiendo snapshots y SIGUE enviando INPUT como heartbeat, R24); los demás lo ven caer por interpolación normal.

### Flujo E — Zona y botín (el ciclo battle royale)

1. **[Loop]** El cronograma de la zona (datos en `EN_CURSO`) avanza por TICKS: fase de aviso (snapshot ya incluye `proxima`) → contracción (centro y radio interpolados linealmente por tick) → espera → repite hasta radio mínimo.
2. **[Loop]** Jugador VIVO fuera del círculo: acumulador fraccional suma `dañoPorSegundo/30` por tick — a los 30 ticks el daño aplicado es EXACTO, sin que el redondeo por tick lo licúe.
3. **[Cliente]** Renderer dibuja círculo actual y próximo; el radar circular del HUD (estilo propuesta3) dibuja **solo** la zona actual/próxima y la posición propia (R30); el HUD (signal) muestra `GAS CLOSING` = `ticksParaContraccion / tickRate`, formateado mm:ss.
4. **[Loop]** `FabricaBotin` puebla los spawns al iniciar `EN_CURSO`. `RECOGER` (one-shot, §5.3) equipa el arma (la anterior desaparece, R28) o suma botiquín (máx 3, R28); el snapshot deja de listar ese botín; `EVENTO RECOGIDO` para feedback sonoro/visual.

### Flujo F — Fin de partida → persistencia → limpieza (ciclo de vida completo)

1. **[Loop]** Queda 1 VIVO (o 0: empate resuelto por §8.3, o timeout) → transición a `FINALIZADA`.
2. **[Loop]** Se construye `ResumenPartida` (DTO plano) y se publica `ApplicationEvent` — flag `eventoPublicado` garantiza UNA publicación.
3. **[Loop → listener plataforma, mismo hilo]** `@Transactional`: INSERT `ResultadoPartida` (UNIQUE `partidaId`) + INSERTs de `ParticipacionPartida` + **UPDATEs atómicos** de `EstadisticaJugador` (partidas, victorias, kills, muertes, top3 — R38). BD caída → excepción capturada, resumen al log, la limpieza sigue.
4. **[Loop]** `EVENTO FIN_PARTIDA` a todos (podio, kills). La partida ticksea en modo gracia 300 ticks; los snapshots siguen saliendo con `estado = FINALIZADA` (R27) y el cliente muestra la pantalla de resultado.
5. **[Loop → GestorPartidas]** Cumplida la gracia: desregistro de la partida, cierre de sesiones con código normal, `executor.shutdown()`. **Test obligatorio de higiene:** después de esto no quedan ni hilos ni referencias vivas (R12).
6. **[Cliente]** Pantalla de resultado; botón "jugar de nuevo" → vuelve al Flujo G (o B en fases locales).

### Flujo G — Identidad y matchmaking (Fases 5–6)

1. **[Cliente]** Registro/login (reactive forms, regex FE = BE) → `POST /api/auth/login` → access JWT (15 min) + refresh (rotación, familia). Interceptor agrega el Bearer; expirado → refresh transparente; refresh reusado → familia revocada → a login.
2. **[Cliente]** Botón **PLAY** del menú → `POST /api/matchmaking/cola`.
3. **[Server — actor matchmaking, un hilo]** Dedup por usuario (ya en cola → 409), agrega a la cola. Cuando junta 10 o vence el timeout: crea la `Partida` en el `GestorPartidas` (completa con bots), asigna a los encolados. Al ser UN hilo, "partida llena en el instante del join" no puede ocurrir (R6).
4. **[Cliente]** Polling corto `GET /api/matchmaking/estado` (cada 1–2 s) → responde `{enCola: true, jugadoresEncontrados: n}` (alimenta el "Estimated Wait" de la UI con honestidad: n/10) o `{idPartida}` cuando hay asignación (R21).
5. **[Cliente]** `POST /api/partidas/ticket` → ticket de un solo uso → abre el WS → `UNIRSE(ticket)` → Flujo B desde el paso 3, ahora con identidad real: las estadísticas del Flujo F saben a quién atribuirse.

### Flujo H — Desconexión y reconexión

1. **[Server — hilo WS]** `afterConnectionClosed` (o heartbeat vencido detectado por el loop) → se encola `ComandoDesconexion` — la mutación, como siempre, ocurre en el loop.
2. **[Loop]** `jugador.conectado = false` (R26): sigue VIVO, quieto y vulnerable 300 ticks (desaparecer sería un botón de escape en pelea). Vence la gracia → MUERTO por abandono.
3. **[Cliente]** `onclose` → reconexión con backoff (1, 2, 4… máx 15 s). Pide ticket nuevo y re-`UNIRSE`.
4. **[Server]** Regla única (R7/R26): usuario VIVO y desconectado → **reanuda su plaza** (BIENVENIDA + snapshot completo; `sec` y `últimaSec` reinician; `tickInicio` del snapshot le permite reconstruir el TIME del HUD, R27). Usuario conectado → la nueva conexión se rechaza. Usuario MUERTO → espectador.
5. **[Cliente]** Si el usuario navega fuera de `/partida` en curso: guard `CanDeactivate` confirma ("¿abandonar la partida?") y al confirmar envía `SALIR` y cierra el socket limpio (R23).

### Flujo I — El recorrido completo de la UI (propuesta3 → rutas Angular) **[NUEVO en v3]**

La propuesta3 mezcla dos "lobbies" distintos (R40). El mapa real de pantallas:

1. **`/login`, `/registro`** — reactive forms. Sin sesión, todo lo demás redirige acá (guard).
2. **`/lobby` — el "Matchmaking Lobby" de la propuesta (Pantalla 1).** Es una ruta REST-pura, sin WebSocket:
   - Panel izquierdo (perfil y stats): `GET /api/estadisticas/mias` → nombre, WINS, KILLS, K/D (= kills / max(1, muertes)), **TOP 3** (R38). Nivel/XP/rango/insignias: DIFERIDOS (R32) — el panel del MVP muestra solo lo que existe.
   - Panel central: en el MVP NO es un party de squad (R33). Antes de buscar partida muestra el botón PLAY; al buscar, muestra "Buscando… n/10" con los datos del polling (Flujo G.4).
   - Paneles derechos (MISSIONS, STORE): NO se construyen en MVP (R34).
   - Barra superior (monedas/gemas): NO en MVP (R34).
   - **PLAY** → Flujo G completo → al recibir `{idPartida}`, `router.navigate(['/partida'])`.
3. **`/partida` — la Pantalla 2 de la propuesta.** Una sola ruta que rinde 4 vistas según `snapshot.estado` (R27):
   - `EN_LOBBY` → roster de la partida ("esperando jugadores 7/10", nombres desde el snapshot).
   - `CUENTA_REGRESIVA` → overlay 3-2-1 (`ticksParaInicio / tickRate`).
   - `EN_CURSO` → canvas PixiJS + HUD (§7.9).
   - `FINALIZADA` → pantalla de podio (datos del `EVENTO FIN_PARTIDA`), botón "jugar de nuevo" → `/lobby`.

### 7.9 Mapa de conexiones UI ↔ protocolo ↔ dominio **[NUEVO en v3 — cada elemento del HUD de la propuesta, con su fuente de datos]**

Mecanismo común: el `EstadoPartidaStore` recibe cada SNAPSHOT/EVENTO (15/s máx) y actualiza **signals**; los componentes Angular del HUD leen esos signals. El canvas PixiJS, en cambio, se repinta a 60 fps desde el interpolador. **Regla: nada del HUD se escribe por frame** (§8.4).

| Elemento UI (propuesta3) | Fuente de datos | Campo exacto | Frecuencia de actualización | Notas |
|---|---|---|---|---|
| Retrato + barra `HP: 100/100` | signal ← SNAPSHOT | `jugadores[yo].hp` | por snapshot (≤15/s) | Barra CSS con `width: hp%`; color por umbrales (verde >50, amarillo >25, rojo) |
| `ALIVE: 48` → **ALIVE: n** | signal ← SNAPSHOT | `count(jugadores, estadoVida == VIVO)` | por snapshot | Con 10 jugadores el valor real es ≤10; el "48" de la imagen es arte |
| `TIME: 14:02` | signal ← SNAPSHOT | `(tick − tickInicio) / tickRate` | por snapshot (se muestra en segundos) | `tickInicio` viaja en el snapshot (R27); `tickRate` vino en BIENVENIDA. JAMÁS reloj de pared del cliente |
| `KILLS: 3` | signal ← SNAPSHOT | `jugadores[yo].kills` | por snapshot | |
| Radar circular | canvas propio del HUD ← signals | `zona.{cx,cy,radio}`, `zona.proxima`, posición propia | por snapshot | **Solo zona + yo (R30).** Los puntos rojos/verdes de la imagen quedan diferidos con interest management/equipos |
| `GAS CLOSING: 01:28` | signal ← SNAPSHOT | `zona.ticksParaContraccion / tickRate` | por snapshot | Formateo mm:ss en un pipe |
| Tarjeta de arma `SHOTGUN MK-I` | signal ← SNAPSHOT | `jugadores[yo].arma` | por snapshot | Nombre + ícono. **SIN munición `5/24` ni medidor de recarga (R10/R31)** — vuelven con el sistema de cargadores |
| Quick-slots consumibles | signal ← SNAPSHOT | `jugadores[yo].botiquines` | por snapshot | UN slot real: botiquín ×n (tecla de uso). Granada y bebida: NO existen (R39); los slots vacíos se dibujan deshabilitados |
| Tarjeta de stats del personaje (130/51/30) | — | — | — | **Eliminada del MVP (R32):** no hay stats por personaje. Si se quiere un panel, mostraría las constantes de BIENVENIDA — sin valor |
| Kill feed | lista ← EVENTO KILL | `datos.{asesino, victima, arma}` | por evento | Cap 5 líneas, fade a los 4 s |
| Números de daño flotantes | renderer ← diff de snapshots | `hp` anterior − `hp` nuevo, por jugador | por snapshot | Dibujados por PixiJS sobre la víctima (R29); agregan ~66 ms de daño por número |
| Prompt "E — recoger" | interpolador + mapa de botines | botín en rango del snapshot | por frame (solo lectura) | El PROMPT es visual; la validación real de rango es del server (§5.3) |
| Vignette de daño de zona | signal ← SNAPSHOT | yo fuera de `zona` (cálculo local) | por snapshot | Borde rojo pulsante CSS cuando estoy fuera |
| Overlay 3-2-1 | signal ← SNAPSHOT | `estado == CUENTA_REGRESIVA`, `ticksParaInicio` | por snapshot | R27 |
| Pantalla de podio | EVENTO FIN_PARTIDA | `datos` (podio, kills) | una vez | |
| Lobby de partida (roster) | signal ← SNAPSHOT | `jugadores[].id` con `estado == EN_LOBBY` | por snapshot | R33: reemplaza al "party de squad" de la propuesta |
| Menú `/lobby`: WINS/KILLS/K/D/TOP 3 | REST | `GET /api/estadisticas/mias` | al entrar a la ruta | R38: K/D requiere `muertes`; TOP 3 reemplaza a TOP 10s |
| "Estimated Wait" del matchmaking | REST polling | `GET /api/matchmaking/estado → jugadoresEncontrados` | cada 1–2 s | Se muestra "n/10 encontrados", no una estimación inventada |
| Monedas/gemas, MISSIONS, STORE, XP, nivel, rango, insignias | — | — | — | Diferidos (R32/R34): la UI del MVP no los incluye |

**Estilo visual (§15):** todos estos componentes se maquetan con los tokens de la propuesta (`--color-bg-lobby: #0f1a36`, `--color-thick-border: #111424`, `--grad-play-button`, bordes 3px, fuentes Lilita One/Fredoka + Nunito) desde la fase en que nace cada uno. El CSS es barato; lo caro (arte de sprites) usa placeholders (R35).

---

## 8. Catálogo anti-bugs — casos borde por sistema

Cada fase cierra SOLO si sus casos borde tienen test o decisión documentada.

### 8.1 Loop y concurrencia
- **Tick que excede 33 ms:** catch-up acotado a 3 pasos; persistente → métrica y slow-down. JAMÁS espiral de muerte.
- **Excepción dentro del tick:** capturada en el loop; la partida se marca `FINALIZADA` con error, avisa y se limpia. Una partida rota NUNCA tumba las demás.
- **Mutación fuera del hilo del loop:** prohibida por diseño (§2.4/§3.1); se revisa en PR.
- **Sesión que recibe snapshot antes de BIENVENIDA (R25):** imposible por construcción (lista de emisión propiedad del loop, alta después de BIENVENIDA dentro del mismo tick) + descarte defensivo en el cliente. Test obligatorio.
- **Higiene de recursos (R12):** executor apagado al desregistrar la partida; tickets vencidos barridos por el sweeper; sesiones huérfanas cerradas. Test de Fase 6: crear y terminar 50 partidas → cero hilos y cero entradas residuales.

### 8.2 Red y sesiones
- **Desconexión a mitad de partida / reconexión / doble conexión:** Flujo H — regla única R7/R26.
- **Heartbeat (R24):** 5 s sin ningún mensaje válido → desconectado. El sampler del cliente corre en TODOS los estados (lobby, cuenta regresiva, espectador, pantalla final) — un lobby de 30 s NO desconecta a nadie. Test obligatorio: cliente 10 s en `EN_LOBBY` enviando INPUT → sigue conectado y sin strikes.
- **Cliente lento:** `ConcurrentWebSocketSessionDecorator` con límite de buffer/tiempo; excedido → cierre con código claro (R5). El tick nunca espera a nadie.
- **Mensajes malformados / flooding / replay:** §5.3 (secuencia estricta + rate limit + strikes). INPUT válido en estado equivocado NO es strike (R24).

### 8.3 Simulación y combate
- **Tunneling:** colisión SIEMPRE por segmento recorrido (proyectiles y también el movimiento del jugador contra paredes finas).
- **Id de proyectil (R2):** `idRed` monotónico; el pool recicla OBJETOS, jamás identidades.
- **Jugador desconectado y VIVO (R26):** recibe balas y daño de zona con normalidad; su intención es quieta; a los 300 ticks muere por abandono. Test: proyectil impacta a un desconectado → HP baja.
- **Kill mutuo en el mismo tick:** daños aplicados en orden de `idRed`; ambos pueden morir y ambos suman kill (y muerte, R38).
- **Empate de victoria:** mayor HP al inicio del tick; luego más kills; luego orden de unión. Determinista SIEMPRE.
- **Curación:** `min(hp + cura, MAX)`; sin botiquín → acción descartada.
- **RECOGER:** rango server-side; más cercano, empate → menor id (R15); no aplicable (3 botiquines) → no-op silencioso y el botín queda (R37); disputado el mismo tick → lo resuelve el orden determinista, el segundo recibe rechazo silencioso.
- **Recoger arma con arma:** reemplaza; la vieja desaparece (R28). Test: nunca hay dos armas en el inventario.
- **Spawn:** distancia mínima entre jugadores; jamás dentro de un obstáculo (validado al CARGAR el mapa: fail-fast).
- **Zona:** daño con acumulador fraccional (§7-E).
- **Bots:** histéresis anti-vibración entre estados; línea de vista real (no disparan a través de paredes); fuera de zona priorizan `BUSCAR_ZONA`.

### 8.4 Cliente
- **Pestaña en background:** resincronización fría si el buffer quedó viejo (> 1 s). Nunca interpolar un hueco de 30 s.
- **Teclas trabadas:** `blur` limpia TODO el estado del teclado.
- **Ángulos:** interpolación por arco corto (R8). **Teleports:** snap si distancia > 3 u (R9).
- **Mensajes antes de BIENVENIDA:** descartados (R25).
- **Canvas resize/fullscreen:** `redimensionar(w, h)` en el renderer; la proyección jamás cachea el viewport de la creación.
- **Snapshots viejos o duplicados:** `tick <=` último → descarte. Buffer cap 30.
- **Salir de la ruta en partida:** `CanDeactivate` + `SALIR` limpio (R23).
- **Zoneless + signals:** el HUD se actualiza al ritmo de snapshots/eventos, JAMÁS por frame — 60 escrituras de signal por segundo es un bug de rendimiento autoinfligido. La única pieza del HUD que lee por frame (sin escribir signals) es el prompt de recoger (§7.9).
- **Números de daño:** el diff de HP se calcula UNA vez por snapshot en el store, no en el renderer (R29).

### 8.5 Plataforma
- **Exactamente-una-vez:** flag + `partidaId` UNIQUE + transacción única (§5.4).
- **Stats sin lost updates:** UPDATE atómico, nunca leer-modificar-guardar (R13). Incluye `muertes` y `top3` (R38).
- **Registro:** unicidad → 409 claro; política de password por Bean Validation; BCrypt ≥ 12.
- **Refresh:** rotación; reuso → revocar familia (entidad `TokenRefresco`, R18).

### 8.6 Números: por qué acá NO va `BigDecimal`

La física es matemática continua aproximada: `double` es la herramienta correcta. Reglas locales: comparaciones con epsilon (jamás `==` entre doubles) y todo lo contable (HP, kills, muertes, botiquines) es `int`. Aparece dinero real algún día → vuelve `BigDecimal` sin discusión.

---

## 9. Estrategia de testing

### 9.1 Dominio de simulación — determinista, SIN mocks

```java
// GIVEN: partida con semilla fija, jugadores y mapa de test
// WHEN:  avanzar N ticks con esta secuencia exacta de intenciones/acciones
// THEN:  asertar posiciones/HP/estado exactos, tick por tick si hace falta
```

Naming `metodo_escenario_resultadoEsperado`, `@DisplayName`, `@Tag("unit")`, AAA. **JaCoCo ≥ 90% en `dominio/`**.

**Tests obligatorios (crece por fase):** colisión en el borde exacto y deslizamiento en esquina · anti-tunneling a velocidad máxima de proyectil · cooldown en el límite (tick N no, tick N+1 sí) · `sec` vieja/duplicada descartada, intención last-wins con 2 INPUTs en un tick (R3/R4) · INPUT ignorado sin strike en `EN_LOBBY`/`CUENTA_REGRESIVA` (R24) · daño de zona exacto tras 30 ticks · las 3 reglas de desempate de victoria · kill mutuo suma dos kills y dos muertes (R38) · proyectil impacta a jugador VIVO desconectado (R26) · desconectado muere por abandono exactamente al tick 300 (R26) · RECOGER: rango, más-cercano, empate por id, tope de botiquines → no-op (R37), arma reemplaza arma (R28) · curación no supera máximo · reanudación de VIVO-desconectado vs rechazo de conectado vs espectador de MUERTO (R7/R26) · snapshot lleva `estado` y `tickInicio` correctos en cada fase de la partida (R27) · partida completa vs bots: N mil ticks → UN ganador, cero excepciones.

### 9.2 Plataforma — estándares completos

Unit puro (`MockitoExtension`, TODOS los mocks, mappers incluidos), slice web (`standaloneSetup` + `GlobalExceptionHandler`), `@MockitoBean` (Boot 4), JaCoCo ≥ 95% en services/mappers, camino feliz Y de error. Extra: listener idempotente (mismo evento 2 veces → una fila) · UPDATE atómico de stats bajo concurrencia (2 hilos, suma correcta) · K/D con 0 muertes no divide por cero (R38).

### 9.3 Protocolo — tests de contrato con fixtures COMPARTIDOS

Carpeta `contratos/fixtures/*.json` en la raíz del repo: un JSON canónico por mensaje (incluye un SNAPSHOT por cada `estado` de partida, R27). El server los deserializa/serializa en JUnit; el cliente los tipa en specs de Vitest/Karma. Si un lado cambia el contrato, el OTRO falla en CI, no en runtime.

### 9.4 Cliente

Specs de: `ConexionPartidaService` (tipado exhaustivo por `tipo`, reconexión con backoff, descarte pre-BIENVENIDA R25) · `EstadoPartidaStore` (interpolación entre 2 snapshots, arco corto, snap por distancia, resincronización fría, descarte de viejos, diff de HP para daño flotante R29, signals por estado de partida R27) · `EntradaService` (teclas → intención, `sec` creciente, limpieza en blur, sampler activo en todos los estados R24). El renderer: smoke test (renderiza un snapshot sin explotar).

### 9.5 Integración server (nuevo en v3)

Con `@SpringBootTest` + cliente WS de test: conectar → UNIRSE → **asertar que el PRIMER mensaje recibido es BIENVENIDA** (R25) · permanecer 10 s en lobby enviando INPUT → sin desconexión ni strikes (R24) · desconectar y reconectar → reanuda plaza con snapshot completo (R7).

---

## 10. Fases de implementación

**Flujo:** UNA fase por vez. Antes de codear: repaso del diseño de la fase y OK explícito. No se avanza con tests rojos o sin el DoD. Commits convencionales. CLI-first: los comandos los corre el humano.

### Fase 0 — Fundaciones: esqueleto conectado y loop autoritativo

**Objetivo:** el círculo que se mueve. Probar la columna vertebral completa = Flujo C entero.

**Scaffolding (ejecuta el humano, en `F:\Proyectos\Battle royale (LL)`):**

```bash
git init

# Backend
curl -s "https://start.spring.io/starter.zip" \
  -d type=maven-project -d language=java \
  -d bootVersion=4.0.0 -d javaVersion=21 \
  -d groupId=ar.pazluciano -d artifactId=battle-royale-server \
  -d name=battle-royale-server \
  -d packageName=ar.pazluciano.battleroyale \
  -d dependencies=web,websocket,data-jpa,h2,validation,lombok,devtools,actuator \
  -o server.zip && unzip -q server.zip -d server && rm server.zip

# Frontend (Node ≥ 24.15 o ≥ 22.22.3 — verificar con node --version)
npx -y @angular/cli@21 new client --style=css --ssr=false --skip-git --defaults
cd client
npm install tailwindcss @tailwindcss/postcss postcss --save-dev
npm install pixi.js
```

(Security y JWT llegan en la Fase 5 con su diseño.)

**Backend:** estructura de paquetes (§3) · `ConfiguracionJuego` · `GameLoop` dt fijo + catch-up acotado · `Partida` mínima (`EN_CURSO` hardcodeado, un `Jugador` con `IntencionJugador`, movimiento + colisión contra bordes) · cola de comandos + orden determinista + descarte por `sec` · handler WS (parse/valida/encola) · `ConcurrentWebSocketSessionDecorator` en el registro de sesiones · **lista de emisión propiedad del loop: BIENVENIDA antes que el primer snapshot (R25)** · **heartbeat por "cualquier mensaje válido" (R24)** · snapshot cada 2 ticks con copia por valor **incluyendo `estado` (R27)** · mensajes v1: `UNIRSE`, `INPUT`, `SALIR`, `BIENVENIDA`, `SNAPSHOT`.

**Frontend:** shell con ruta lazy `/partida` · `ConexionPartidaService` (streams RxJS tipados + envío + descarte pre-BIENVENIDA) · `EntradaService` (estado de teclas + **sampler 30 Hz activo en todos los estados** + `sec` + limpieza en blur) · `EstadoPartidaStore` (buffer cap 30 + interpolación a −100 ms con arco corto y snap) · interfaz `RendererJuego` + `RendererTopDown2D` mínimo (círculo + línea de apuntado, **dibujado con contorno negro 3px — primer ladrillo del estilo Battle Bash, R35**) · `proxy.conf.json` con `/api` y `/ws` **con `"ws": true`** (R19).

**Casos borde de la fase:** teclas en blur · snapshots viejos/duplicados · `sec` duplicada · reconexión con backoff (pre-auth: entra como jugador nuevo) · catch-up del tick · primer mensaje = BIENVENIDA (R25).
**Tests:** movimiento y colisión con borde · last-wins de intención · descarte por `sec` · round-trip de los 5 mensajes contra fixtures (§9.3) · interpolación y limpieza de teclas (specs) · §9.5 básicos.
**DoD:** un círculo se mueve suave con WASD y apunta con el mouse. **Prueba de autoridad: se apaga el server y el círculo NO se mueve más.**

### Fase 1 — Mundo, colisiones y cámara

**Backend:** `MapaJuego` (AABBs + decoración sin colisión R36, spawns validados al cargar — fail-fast) · colisión círculo-vs-AABB con deslizamiento · `GET /api/mapas/{id}` · snapshot con N jugadores (probado con dos pestañas, sin auth aún).
**Frontend:** carga del mapa + render de fondo (césped `#82c341`, caminos, río decorativo animado — tokens de §15) · cámara que sigue · culling del viewport · assets placeholder (primitivas con contorno o Kenney, R35).
**Casos borde:** esquinas sin engancharse · spawn jamás dentro de obstáculo · resize.
**Tests:** tabla de colisiones límite (borde/esquina/rozar) · mapa inválido → arranque falla claro.
**DoD:** me muevo por un mapa con obstáculos, sin atravesarlos ni engancharme, 60 fps con server a 30 ticks.

### Fase 2 — Combate

**Backend:** `Arma` Strategy (`Pistola`/`Escopeta`/`Rifle`) · pool de `Proyectil` con `idRed` monotónico (R2) · colisión por segmento · daño, MUERTO (ejes R26 desde acá), espectador · `EVENTO KILL` (después del snapshot, R22) · cooldowns en ticks.
**Frontend:** render de proyectiles · barras de HP sobre jugadores · kill feed · **HUD Battle Bash v1 (CSS completo §15): retrato + barra HP, ALIVE, KILLS, tarjeta de arma SIN munición (R10/R31)** · números de daño por diff de HP (R29).
**Casos borde:** tunneling a velocidad máxima · kill mutuo · spam de click vs cadencia · disparar muerto = descartado · impacto a desconectado VIVO (R26) · `idRed` jamás repetido en snapshots consecutivos.
**Tests:** cooldown límite · anti-tunneling · orden determinista de daños · dispersión de escopeta con semilla fija.
**DoD:** dos pestañas: una mata a la otra; la cadencia la impone el server aunque el cliente spamee; los números de daño flotan sobre el impactado.

### Fase 3 — Bots

**Backend:** `EstrategiaBot` (FSM con histéresis) · percepción radio + línea de vista (raycast de la Fase 2) · dificultad paramétrica (precisión, reacción en ticks) · bots escriben `IntencionJugador` dentro del tick, orden por id.
**Casos borde:** no disparan a través de paredes · sin vibración entre estados · priorizan zona.
**Tests:** transiciones FSM con escenarios armados · línea de vista bloqueada · con semilla fija el bot repite exactamente su comportamiento.
**DoD:** 1 humano vs 9 bots, jugable y desafiante en dificultad media.

### Fase 4 — Battle royale completo (jugable solo, local)

**Backend:** `ZonaSegura` con cronograma y acumulador de daño · `FabricaBotin` · `RECOGER`/`USAR_BOTIQUIN` (reglas §8.3, inventario R28/R37) · State completo de `Partida` (lobby, cuenta regresiva, `SALIR` por estado, `estado` en snapshot R27, heartbeat en todos los estados R24) · victoria + desempates · `FIN_PARTIDA`.
**Frontend:** zona actual y próxima + vignette de daño · **radar circular estilo propuesta (solo zona + yo, R30)** · `GAS CLOSING` · `TIME` desde `tickInicio` (R27) · loot + prompt de recoger · quick-slot de botiquín ×n (R28) · **pantallas por `estado`: lobby de partida (roster), cuenta regresiva, podio (Flujo I)**.
**Casos borde:** TODOS los de empate/zona/botín de §8.3 · `FIN_PARTIDA` publicado UNA vez · lobby de 30 s sin desconexiones (R24).
**Tests:** daño de zona exacto · 3 desempates · distribución de la fábrica con semilla · partida completa de punta a punta (N mil ticks → un ganador).
**DoD:** **partida BR completa contra 9 bots, de lobby a ganador, con el HUD Battle Bash completo.** Este es el "prototipo local" prometido — con el corazón definitivo adentro.

### Fase 5 — Plataforma: cuentas, JWT, identidad en el socket y persistencia

**Backend:** agregar `spring-boot-starter-security` + `jjwt` al pom (lo confirma el humano) · registro/login/refresh con rotación y `TokenRefresco` (R18) · rate limiting + lockout en `/auth/login` · entidades §4.2 con `muertes`/`top3` (R38) + Flyway `V1__` · **ticket de un solo uso + `UNIRSE(ticket)` + regla de reanudación/rechazo (§5.5, R1/R7/R26)** · listener de `FinDePartida` transaccional e idempotente con UPDATE atómico (R13) · `GET /api/estadisticas/mias` y `/ranking` paginado · Swagger solo dev.
**Frontend:** login/registro (forms tipados, regex FE = BE) · interceptor JWT + refresh transparente · guards · **ruta `/lobby` estilo propuesta (Flujo I.2): perfil + WINS/KILLS/K-D/TOP 3 reales; sin XP/monedas/misiones/tienda (R32/R34)** · perfil y ranking · `CanDeactivate` en `/partida` (R23).
**Casos borde:** §8.5 completos + reanudación vs rechazo (R7) + K/D sin muertes (R38).
**Tests:** estándar completo · listener idempotente · stats concurrentes · canje de ticket (un uso, vencido, inválido).
**DoD:** me registro, juego contra bots, mis estadísticas sobreviven un reinicio y se ven en `/lobby`. Endpoints protegidos → 401/403 correctos.

### Fase 6 — Multijugador real

**Backend:** `GestorPartidas` multi-partida (un loop por partida) · **actor de matchmaking de un hilo** (cola, dedup, timeout → completa con bots, asignación — R6) · `GET /api/matchmaking/estado` con `jugadoresEncontrados` (R21, alimenta la UI de espera) · desconexión/reconexión en partida (Flujo H) · higiene de recursos con su test (R12).
**Frontend:** botón PLAY → cola → espera con "n/10" → navegación a `/partida` (Flujo I) · roster del lobby de partida.
**REGLA DE LA FASE:** `juego/dominio` NO SE TOCA. Si parece necesario, se frena y se revisa el diseño — la prueba de fuego de toda la arquitectura.
**Casos borde:** usuario en dos colas → 409 · caída de una partida no afecta a otras · 50 partidas creadas y terminadas → cero residuos.
**Tests:** matchmaking (llenado, timeout, dedup) · dos partidas concurrentes aisladas · higiene.
**DoD:** dos navegadores, dos cuentas, misma partida: se ven, se disparan, uno gana, y las estadísticas de ambos se persisten.

### Fase 7 — Calidad de red (con latencia real)

Client prediction del movimiento propio + reconciliación usando `sec`/`acks` (§5.2) · interpolación remota refinada · lag compensation acotada (rewind ≤ 200 ms) si se agrega hitscan · métricas (ping, duración de tick, tamaño de snapshot) · latencia simulada en dev · recién acá, delta/binario CON mediciones · **candidato: `EVENTO IMPACTO` para daño flotante exacto (R29)**.
**DoD:** jugable y justo con 150 ms simulados, sin goma en el movimiento propio.

### Fase 8 — Renderer isométrico (la prueba del Bridge)

`RendererIsometrico`: misma snapshot, proyección iso + depth sort por `y` + assets iso · toggle persistido en `localStorage`.
**REGLA:** cero cambios en simulación, protocolo, conexión o estado.
**DoD:** cambio top-down ↔ isométrico desde el menú, en caliente, misma partida.

### Fase 9 — Producción (diferida; se diseña cuando llegue)

Docker Compose (server + PostgreSQL + proxy TLS) · secrets por entorno · backups con restore PROBADO · CORS restringido · escalado: partidas fijadas a instancia (sticky por partida; el matchmaking asigna instancia — el ticket vive donde vive la partida).

---

## 11. Extensión 3D — qué da y qué cuesta

**Gratis con la abstracción:** un `Renderer3D` (Three.js) que consume la MISMA snapshot: modelos low-poly sobre el plano, cámara tercera persona, el apuntado sale del ray de cámara → mismo campo `apuntar`. Es un proyecto de renderer (assets, animaciones, iluminación), no de arquitectura.

**NO gratis (fuera de alcance):** verticalidad real — pisos, saltar, disparar en altura. Mete el eje Z en la SIMULACIÓN: colisiones 3D, línea de vista 3D, física 3D, `z` en el protocolo. Es una versión 2.0 del dominio. El camino, si algún día se quiere: `z` opcional en snapshot (default 0, retrocompatible por versión) y evolucionar el dominio detrás de sus tests deterministas.

---

## 12. Estándares de código — qué viaja de proyectos anteriores y qué cambia acá

**Viaja SIN cambios:** cero `@Autowired` (constructor + `@RequiredArgsConstructor`) · cero `var` · DTOs Lombok, no records · `@Data` prohibido en entities · mappers inyectados · capas y DIP en plataforma · `@Transactional` solo en services · `@RestControllerAdvice` + errores tipados · Bean Validation + `@Valid` · paginación en listados REST · enums STRING · LAZY + `JOIN FETCH` · Flyway · usuario desde el token, jamás del body · secrets por entorno · testing AAA con naming/`@DisplayName`/`@Tag` · cero `any` en TS · HTTP solo en services Angular · signals + control flow nativo + reactive forms · `inject()` · fechas argentinas en la plataforma.

**Cambia — con su porqué:**

| Regla estándar | Acá | Por qué |
|---|---|---|
| Nada de estado de negocio en memoria | El estado de partida VIVE en memoria | Simulación efímera ≠ registro contable (§2.3) |
| `BigDecimal` para lo numérico de negocio | `double` en física, `int` en lo contable | §8.6 |
| Toda entidad es JPA con auditoría | El dominio de simulación es POJO puro | §2.3; JPA en el hot path del tick sería veneno |
| Paginación en TODOS los listados | Snapshots completos | Es un stream de estado, no un listado |
| DTO + mapper por capa | Los mensajes del protocolo SON los DTOs | En el hot path la ceremonia no paga; el contrato lo protegen los fixtures (§9.3) |
| JaCoCo ≥ 95% services/mappers | Igual en plataforma; ≥ 90% en `dominio/` | Distinta técnica (sin mocks), misma exigencia |

---

## 13. Riesgos y decisiones diferidas

| Riesgo | Mitigación |
|---|---|
| Serialización JSON como cuello de botella | Medir en Fase 7 ANTES de optimizar |
| GC por objetos del tick | Pool desde Fase 2; más solo si las métricas lo piden |
| Radar/wallhack por snapshot completo (R20) | Aceptado en MVP y DOCUMENTADO; el radar propio no muestra enemigos (R30); interest management diferido |
| **Arte estilo Battle Bash consume tiempo (R35)** | HUD/pantallas = CSS con los tokens de §15 (barato, desde F2). Sprites del canvas: primitivas PixiJS con contorno 3px o Kenney CC0 como placeholder; arte final es un track paralelo que NO bloquea ninguna fase |
| Drift de versiones Angular/Boot | Versiones PINEADAS en el scaffolding |
| Scope creep (la propuesta trae 6+ sistemas de metajuego) | Toda idea nueva entra como fase propuesta AL FINAL, jamás en la fase en curso. Diferidos y por qué: §15 |

**Diferido explícitamente:** delta compression y binario · interest management / niebla de guerra · munición y cargadores (R10/R31) · drop de loot al morir y drop-on-swap (R28) · `EVENTO IMPACTO` (R29) · squads/amigos/invitaciones (R33) · economía, tienda, misiones, XP, niveles, rangos, insignias (R32/R34) · granada y bebida energética (R39) · agua como terreno con reglas (R36) · espectador con cámara libre · chat · replays (el determinismo los deja a un paso) · push del matchmaking por WS (hoy: polling corto) · touch/móvil · verticalidad 3D (§11).

---

## 14. Registro de revisión v1 → v2 (heredado — resumen)

23 hallazgos encontrados y corregidos en la revisión anterior; el detalle completo vive en la v2. Los críticos/altos, porque siguen siendo ley en este documento:

| # | Gravedad | Bug que se iba a producir | Corrección |
|---|---|---|---|
| R1 | **CRÍTICO** | Estadísticas de Fase 5 sin identidad en el socket (el ticket llegaba en F6) | Ticket + reanudación movidos a Fase 5 |
| R2 | **CRÍTICO** | Pool reciclaba proyectiles CON su id → balas fantasma interpoladas | `idRed` monotónico separado del slot |
| R3 | ALTO | Anti-replay por reloj del cliente → deriva → inputs legítimos descartados | Secuencia monotónica + `acks` |
| R4 | ALTO | 0-o-2 INPUTs por tick → tirones o dobles disparos | Modelo de INTENCIÓN last-wins |
| R5 | ALTO | `WebSocketSession` bloqueante → un cliente lento frena el tick de todos | `ConcurrentWebSocketSessionDecorator` |
| R6 | ALTO | Carreras de matchmaking (partida llena en el join, usuario en 2 colas) | Actor de un solo hilo |
| R7 | ALTO | "Rechazar dobles" vs "permitir reconexión" contradictorios | Regla única (re-expresada en v3 por R26) |
| R8–R23 | MEDIO–INFO | Lerp de ángulo ±π, teleports, munición HUD, heartbeat, fugas de recursos, lost updates de stats, aliasing de snapshot, RECOGER ambiguo, colisión jugador-jugador, loadout, refresh sin entidad, proxy sin `ws:true`, radar, aviso de asignación, orden snapshot/evento, SALIR ambiguo | Ver v2 §14 — todas incorporadas acá |

---

## 15. Integración de la propuesta UI/UX "Battle Bash" (propuesta3) — elemento por elemento

### 15.1 Sistema de diseño (se adopta COMPLETO — es CSS, cuesta poco y define la cara del juego)

| Token | Valor | Uso |
|---|---|---|
| `--color-bg-lobby` | `#0f1a36` | Fondo del menú (azul noche galáctico, estrellas CSS) |
| `--color-bg-map` | `#82c341` | Césped del mapa (lo pinta el renderer, no CSS) |
| `--color-thick-border` | `#111424` | Contornos 3px de TODOS los paneles, textos y sprites |
| `--grad-play-button` | `linear-gradient(180deg, #ffcc00, #ff6600)` | Botón PLAY y CTAs |
| `--color-health-lime` | `#4ade80` | Barra de HP |
| `--color-radar-blue` | `#2563eb` | Fondo del radar |
| Tipografías | Lilita One / Fredoka One (títulos), Nunito (datos) | Con `text-shadow` para el contorno cómic |

Estos tokens viven en `styles.css` como CSS custom properties desde la Fase 0. El HUD de cada fase nace YA con este estilo — el estilo no es una "fase de polish" final, es parte de cada componente al nacer.

### 15.2 Pantalla 1 (Matchmaking Lobby) — veredicto por componente

| Componente de la propuesta | Veredicto | Por qué / cómo |
|---|---|---|
| Barra superior: avatar + monedas/gemas + botón `+` | **DIFERIDO** (R34) | No hay economía. El MVP muestra avatar + nombre |
| Panel izquierdo: perfil, WINS/KILLS/K-D/TOP 10s | **ADAPTADO** (R38) | Datos reales de `GET /api/estadisticas/mias`. TOP 10s → **TOP 3** (en partidas de 10, todos son top 10). K/D exige la columna `muertes` |
| Nivel 28, rango GOLD III, medalla, insignias | **DIFERIDO** (R32) | No hay XP ni rangos. Entra como fase futura de progresión |
| Panel central: party 3×2 con [READY] e INVITE FRIEND | **REEMPLAZADO** (R33) | No hay squads. El panel muestra: PLAY (idle) → "Buscando n/10" (en cola) → transición a `/partida` donde el roster del lobby DE PARTIDA (snapshots `EN_LOBBY`) cumple el rol visual de esta grilla |
| MISSIONS (diarias/semanales) | **DIFERIDO** (R34) | Sistema completo de misiones — fase futura |
| STORE FEATURED (skins) | **DIFERIDO** (R34) | Sin economía ni cosméticos todavía |
| Botón PLAY gigante | **ADOPTADO** | Dispara el Flujo G (cola de matchmaking). Es EL call-to-action del menú |
| "Estimated Wait 0:48" | **ADAPTADO** | Sin estimación inventada: se muestra "n/10 jugadores" del polling real (R21) |

### 15.3 Pantalla 2 (HUD In-Game) — veredicto por componente

| Componente de la propuesta | Veredicto | Fuente de datos (detalle completo en §7.9) |
|---|---|---|
| Retrato + `HP 100/100` + corazón | **ADOPTADO** | `jugadores[yo].hp` |
| `ALIVE: 48` | **ADOPTADO** (será ≤10) | count de VIVOS |
| `BATTLE BASH! / TIME / KILLS` | **ADOPTADO** | `TIME` desde `tickInicio` (R27); kills propias |
| Radar con enemigos (puntos rojos) y aliados (verdes) | **ADAPTADO** (R30) | Radar dibuja SOLO zona actual/próxima + yo. Enemigos = wallhack-by-design; aliados = no hay equipos |
| `GAS CLOSING: 01:28` | **ADOPTADO** | `ticksParaContraccion / tickRate` |
| Tarjeta de arma con `5 / 24` y recarga | **ADAPTADO** (R31) | Nombre + ícono del arma SÍ; munición NO (R10: infinita en MVP). El contador vuelve con el sistema de cargadores |
| Quick-slots: botiquín, granada, bebida | **ADAPTADO** (R28/R39) | UN slot real (botiquín ×0–3, contador del snapshot). Granada y bebida no existen en el dominio: slots deshabilitados o ausentes |
| Tarjeta de stats del personaje (130/51/30) | **ELIMINADO** (R32) | No hay stats por personaje; mostraría constantes globales |
| Números de daño flotantes | **ADOPTADO** (R29) | Diff de `hp` entre snapshots, dibujados por el renderer |
| Cajas/árboles como cobertura, río, carpas | **ADOPTADO/ADAPTADO** (R36) | Cajas, árboles, rocas, carpas = obstáculos AABB. Río = DECORACIÓN animada sin colisión en MVP (agua con reglas requiere flags `bloqueaMovimiento`/`bloqueaProyectiles` — diferido) |
| Tecla E para recoger | **ADOPTADO** | Ya era el diseño (`acciones: [RECOGER]`) |

### 15.4 Por qué se difiere tanto (la explicación que importa)

La propuesta3 es una **maqueta de juego terminado**: muestra el estado FINAL deseado, con metajuego incluido. Este plan construye el juego por capas de riesgo: primero la columna vertebral en tiempo real (lo difícil y lo que enseña), después el metajuego (lo conocido: CRUDs, tiendas, misiones — todo REST + JPA estándar). Cada sistema diferido tiene su lugar reservado: la economía y las misiones son features de plataforma que NO tocan la simulación, así que agregarlas después no rompe nada — esa es exactamente la ventaja del monolito modular con fronteras duras.

---

## 16. Registro de revisión de diseño v2 → v3

Revisión adversarial de la v2 + cruce contra la propuesta3. Cada fila es un bug o contradicción que se iba a producir, con su corrección aplicada en este documento.

| # | Gravedad | Bug que se iba a producir | Corrección | Dónde |
|---|---|---|---|---|
| R24 | **ALTO** | El heartbeat era "INPUT a 30 Hz", pero `EN_LOBBY`/`CUENTA_REGRESIVA` no aceptan INPUT y un muerto no tiene motivo para enviarlo: **todo lobby de más de 5 s desconectaba a todos los jugadores**; un espectador era expulsado a los 5 s de morir | Heartbeat = cualquier mensaje válido; el sampler del cliente corre desde BIENVENIDA hasta el cierre, en TODOS los estados; INPUT en estado que no lo procesa se ignora SIN strike | §1.3, §4.3, §5.1, §5.3, §8.2 |
| R25 | **ALTO** | El hilo WS registraba la sesión y el emisor enviaba a "todas las registradas": una sesión podía recibir SNAPSHOTs ANTES de su BIENVENIDA (sin config ni idJugador, el cliente no sabe ni quién es) — carrera real entre registro y drenado del `UNIRSE` | La lista de emisión es propiedad EXCLUSIVA del loop: la sesión entra al procesar `UNIRSE`, después de enviarle BIENVENIDA y antes del snapshot del mismo tick. Cliente: descarte defensivo pre-BIENVENIDA | §2.4, §3.1, §7-B, §9.5 |
| R26 | **ALTO** | `estado: VIVO/MUERTO/DESCONECTADO` en UN enum mezclaba vida con conexión: un DESCONECTADO no era "VIVO" → **los proyectiles no lo impactaban** (la colisión filtra por VIVOS), contradiciendo "queda quieto y vulnerable"; y "queda 1 vivo" era ambiguo para la victoria | Dos ejes independientes: `EstadoVida {VIVO, MUERTO}` + `conectado: boolean`. Vulnerable = VIVO (conectado o no); victoria cuenta VIVOS; R7 re-expresada; snapshot lleva ambos campos | §4.1, §4.3, §5.2, §5.5, §8.3 |
| R27 | **ALTO** | El SNAPSHOT no decía en qué ESTADO está la partida: el cliente no podía saber si mostrar lobby, cuenta regresiva, juego o podio (las pantallas de F4 eran inimplementables); tampoco había forma de calcular `TIME` tras una reconexión | Snapshot lleva `estado` siempre; `ticksParaInicio` en cuenta regresiva; `tickInicio` en curso. El cliente rinde la vista según `estado` (Flujo I.3) | §4.3, §5.2, §7-I, §7.9 |
| R28 | MEDIO | Inventario sin modelo: ¿recoger arma con arma? ¿cuántos botiquines? Cada dev asumiría distinto (misma familia que R16/R17) | Arma nueva reemplaza (la vieja desaparece; drop-on-swap diferido); botiquines máx 3; `botiquines` viaja en el snapshot para el quick-slot | §1.3, §4.1, §5.2, §8.3 |
| R29 | MEDIO | La propuesta exige números de daño flotantes; no existía fuente de datos por impacto (solo KILL) — se habría improvisado en el cliente | MVP: diff de `hp` entre snapshots consecutivos (0 cambios de protocolo, agrega ~66 ms de daño por número). `EVENTO IMPACTO` diferido a F7 | §5.2, §7-D, §7.9 |
| R30 | MEDIO | El radar de la propuesta muestra enemigos: con snapshot completo es wallhack-by-design PARA TODOS y contradice el diferimiento de niebla de guerra (R20) | Radar MVP: zona actual/próxima + posición propia. Puntos de enemigos/aliados diferidos con interest management/equipos | §1.3, §5.2, §7.9, §15.3 |
| R31 | MEDIO | La propuesta reintroduce el contador de munición `5/24` + medidor de recarga que R10 había ELIMINADO (munición infinita en MVP) — contradicción directa entre documentos | Manda el dominio: tarjeta de arma SIN munición. El contador vuelve cuando exista el sistema de cargadores | §7.9, §15.3 |
| R32 | MEDIO | Personajes con stats propios (Vida 130/Daño 51/Velocidad 30), XP y niveles contradicen el dominio uniforme Y la validación anti-speedhack ("velocidad = constante del server") | MVP: personajes = piel cosmética, stats globales. Stats por personaje = cambio de dominio futuro (la validación pasaría a "constante DEL PERSONAJE server-side") | §1.2, §7.9, §15.2 |
| R33 | MEDIO | La propuesta muestra party/squad de 6 con READY e INVITE FRIEND: no existe NADA de eso en el diseño (amigos, equipos, daño aliado, victoria por equipo) | Diferido como sistema. El rol visual del panel lo cumple el roster del lobby DE PARTIDA, alimentado por snapshots `EN_LOBBY` (que R27 hizo posibles) | §1.2, §7-I, §15.2 |
| R34 | BAJO | Monedas, gemas, tienda y misiones en la UI sin ningún sistema detrás: se habría maquetado UI muerta o improvisado economía | Fuera del MVP; entra como fases de plataforma (no tocan simulación) | §1.2, §15.2 |
| R35 | BAJO | Choque de estilo: el plan decía "assets Kenney CC0" y la propuesta exige cartoon con contornos gruesos — el "cambio de arte" al final habría sido un rework visual completo | Separar lo barato de lo caro: HUD/pantallas = CSS con tokens §15 desde el nacimiento de cada componente; sprites = primitivas Pixi con contorno 3px (ya en el estilo) o Kenney como placeholder; arte final = track paralelo no bloqueante | §1.1, §10-F0/F2, §13 |
| R36 | BAJO | El río del mapa de la propuesta: ¿colisiona? ¿bloquea balas? Agua con reglas propias necesita flags por obstáculo que no existen | Río = decoración animada sin colisión en MVP; terreno-agua real diferido | §4.1, §15.3 |
| R37 | BAJO | `RECOGER` con el botín más cercano no aplicable (3 botiquines ya): ¿falla, saltea al siguiente, o nada? Sin decisión = comportamiento accidental | No-op silencioso: se elige el más cercano SIN filtrar aplicabilidad (simple y determinista); "más cercano útil" queda como mejora si molesta | §4.1, §5.3, §8.3 |
| R38 | BAJO | `EstadisticaJugador` no tenía `muertes` → el K/D del panel de la propuesta era incalculable; y "TOP 10s" en partidas de 10 jugadores es TODA partida (métrica vacía) | Columnas `muertes` (y muertes en `ParticipacionPartida`) + `top3` en vez de top10; K/D = kills / max(1, muertes) | §4.2, §5.4, §9.2, §15.2 |
| R39 | INFO | Los quick-slots de la propuesta incluyen granada y bebida energética: la granada es una nueva `Arma` con AoE y física propia; la bebida, un buff de velocidad que toca la validación server-side — ninguna diseñada | Diferidas explícitamente; el quick-slot del MVP es botiquín ×n | §4.1, §7.9, §13 |
| R40 | INFO | La propuesta llama "Matchmaking Lobby" al menú Y el diseño tiene un `EN_LOBBY` de partida: dos conceptos distintos con el mismo nombre → confusión garantizada al implementar | Mapa de pantallas explícito (Flujo I): `/lobby` = menú REST; `EN_LOBBY` = estado de partida por WS con su propia vista | §7-I |

---

*Próximo paso: OK explícito a este plan v3 (o correcciones) → scaffolding de la Fase 0 (comandos en §10-Fase 0, los corre el humano) → diseño fino y código de la Fase 0.*
