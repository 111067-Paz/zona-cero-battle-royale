# AGENTS.md — Runbook de "Zona Cero" (Battle Royale Web)

Guía de ejecución para CUALQUIER agente (modelo o humano) que trabaje en este repo.
**La especificación de QUÉ construir es [PLAN.md](PLAN.md) (v3) — este archivo define CÓMO se trabaja acá.**
Si este runbook y el PLAN contradicen algo, manda el PLAN y se corrige este archivo.

---

## 1. Regla de oro (no negociable)

> La simulación se escribe UNA sola vez, en Java, y es la autoridad absoluta.
> El cliente dibuja e insinúa; el servidor DECIDE.

Toda decisión de implementación se deriva de esa frase. Si un cambio le da autoridad al cliente
(velocidad, cooldowns, daño, posición), está MAL aunque funcione.

## 2. Protocolo de trabajo por fase

1. **UNA fase por vez**, en el orden del PLAN §10. No se adelanta trabajo de fases futuras.
2. Antes de codear: presentar el **diseño fino de la fase** (qué clases, qué orden, qué casos borde)
   y esperar **OK explícito del humano**. Sin OK no se escribe código.
3. **CLI-first**: los comandos de scaffolding/build/run los corre el HUMANO. El agente entrega los
   comandos listos para copiar y escribe el contenido de los archivos DESPUÉS de que el CLI generó
   el esqueleto. El agente NO ejecuta builds por su cuenta.
4. **No se avanza de fase con tests rojos ni sin el DoD validado** (checklist en §8).
5. Commits **convencionales** (`feat:`, `fix:`, `test:`, `docs:`). SIN atribución de IA.
6. Toda idea nueva fuera de la fase en curso entra como propuesta AL FINAL del PLAN, jamás se
   implementa "de paso" (anti scope-creep).

## 3. Reglas de código (se revisan en todo PR)

- **PROHIBIDO `var`** — tipo explícito siempre. **PROHIBIDO `record`** — DTOs como clases Lombok.
- **PROHIBIDO `@Autowired`** en cualquier forma — `private final` + `@RequiredArgsConstructor`.
- Idioma: **dominio en español** (`Partida`, `Jugador`, `IntencionJugador`), **técnica en inglés**
  (`Service`, `Handler`, `findById`). Igual en TypeScript.
- Números: **`double` en física** (comparar con epsilon, jamás `==`), **`int` en lo contable**
  (HP, kills, botiquines). `BigDecimal` NO aplica acá (PLAN §8.6) — volvería solo con dinero real.
- Constantes con `static final` en MAYÚSCULAS — cero números mágicos.
- TS: **cero `any`**; mensajes del protocolo como unión discriminada por `tipo` (switch exhaustivo).
- Tests: naming `metodo_escenario_resultadoEsperado`, `@DisplayName`, `@Tag("unit")`, AAA.
  Aserciones **nativas de JUnit 5** (AssertJ no está confirmado en el classpath de Boot 4).

## 4. Fronteras arquitectónicas (la parte que NO se ve en el código de un solo archivo)

Dos arquitecturas bajo un mismo techo (PLAN §3.2):
- `plataforma/` → **capas** (controllers / services+impl / repositories / entities / dtos / mappers /
  exceptions / listeners). Llega en Fase 5.
- `juego/` → **hexagonal**: `dominio/` (POJO puro) ← `motor/` (loop, colas, emisor) ← `red/` (WS).
  `protocolo/` es el contrato de wire.

Reglas que se revisan en TODO PR:
1. `juego/dominio` **no importa Spring, JPA ni nada de `plataforma`**. Recibe argumentos PLANOS y
   el value-object `ParametrosSimulacion` (no `ConfiguracionJuego`, que lleva anotación Spring).
2. **Toda mutación del estado de una partida ocurre en el hilo de SU loop.** Los hilos WS solo
   parsean, validan forma y ENCOLAN. Nada de `synchronized` en el dominio.
3. La **lista de emisión es propiedad del loop**: una sesión entra DESPUÉS de recibir su BIENVENIDA
   (R25). Jamás registrar sesiones para emisión desde el hilo WS.
4. El **snapshot es copia por VALOR** (R14) — jamás referencias a objetos vivos del dominio o del pool.
5. `render/` del cliente solo LEE estado interpolado; no conoce sockets, store ni Angular.
6. Los signals del HUD se escriben **al ritmo de snapshots (≤15/s), jamás por frame** (zoneless).
7. Determinismo (PLAN §2.7): RNG **sembrado e inyectado** (jamás `Math.random()`), dt fijo, cero
   reloj de pared ni I/O en el dominio, comandos ordenados por (orden de unión, sec).
8. Cambios al protocolo → actualizar **`contratos/fixtures/*.json` + DTO Java + tipo TS juntos**.
   El test de contrato (`ContratoProtocoloTest`) y los specs de Vitest son la red.

## 5. Gotchas VERIFICADOS (te van a pasar; acá está la salida)

| Síntoma | Causa real | Fix |
|---|---|---|
| `package com.fasterxml.jackson.databind does not exist` | Boot 4 usa **Jackson 3**: paquete raíz `tools.jackson.*` (groupId `tools.jackson.core`). Además `spring-boot-starter-webmvc` NO arrastra Jackson | Dependencia `spring-boot-starter-json` + importar `tools.jackson.databind.ObjectMapper` |
| `catch (IOException)` sobre `readValue` no compila ("never thrown") | En Jackson 3, `readValue`/`writeValueAsString` lanzan `tools.jackson.core.JacksonException`, que es **unchecked** (`RuntimeException`) | `catch (JacksonException e)` |
| ¿Migro también `@JsonTypeInfo`/`@JsonSubTypes`? | **NO.** Las anotaciones siguen en `com.fasterxml.jackson.annotation` (jackson-annotations 2.20) a propósito | No tocar esos imports |
| Tentación de definir `@Bean ObjectMapper` a mano | Boot auto-configura el `ObjectMapper` de `tools.jackson` con el starter-json; un `new ObjectMapper()` manual PISA esa config (pierde módulos) | No crear el bean; inyectarlo por constructor |
| WebSocket muere en dev con error críptico | `proxy.conf.json` sin `"ws": true` no upgradea la conexión (R19) | Ya está configurado; no quitarlo |
| `ng test` dice "No test files found" | Modo **watch** del builder experimental `@angular/build:unit-test` | `ng test --watch=false` |
| Comandos fallan por el path | La carpeta tiene espacios y paréntesis: `Battle royale (LL)` | Git Bash con comillas: `cd "/f/Proyectos/Battle royale (LL)"` |
| Error raro de librería tras upgrade | El conocimiento del modelo puede ser viejo | **Inspeccionar el jar real**: `unzip -l <jar>` para paquetes, `javap -cp <jar> <Clase>` para firmas. NO adivinar |
| `X is not public in Y; cannot be accessed from outside package` en el dominio | Un método package-private de una clase de `dominio/combate` (ej. `Proyectil.avanzarA`) llamado desde `dominio/partida` (`Partida`) — son paquetes DISTINTOS aunque ambos sean "dominio puro" | Package-private solo sirve si la clase llamante comparte paquete (como `Jugador`↔`Partida`). Cruzando de `combate`↔`partida`, el método debe ser `public` — la seguridad de concurrencia la da el hilo del loop (§2.4), no la visibilidad |

## 6. Comandos (los corre el humano)

```bash
# Backend — desde server/
./mvnw clean test              # compilar + tests (15 verdes al cierre de Fase 0)
./mvnw spring-boot:run         # levanta en :8080 y crea la partida local
./mvnw clean test jacoco:report  # cobertura → target/site/jacoco/index.html

# Frontend — desde client/
npm start                      # ng serve en :4200 (proxy /api y /ws → :8080 ya cableado)
ng test --watch=false          # specs Vitest (una pasada, sin watch)
```

Juego: `http://localhost:4200/partida` (con el backend corriendo).

## 7. Persistencia de contexto (Engram)

Antes de arrancar una fase, buscar contexto previo: `mem_search` en el proyecto `battle royale (ll)`.
Topic keys relevantes:
- `plan/zona-cero-v3` — decisiones del plan v3 y hallazgos R24–R40
- `plan/zona-cero-arquitectura-skills` — stack, arquitectura dual, mapa de skills por fase
- `sdd/zona-cero-fase0/apply-progress` — qué se construyó en Fase 0 y cómo
- `gotcha/boot4-jackson3` — detalle completo del gotcha de Jackson 3

Al terminar trabajo significativo: `mem_save` con lo aprendido (obligatorio, no opcional).

## 8. Estado y checklist de DoD por fase

- [x] **Fase 0 — Fundaciones** *(cerrada 2026-07-05)*
  DoD validado: círculo se mueve suave con WASD, apunta con mouse, y **se congela al apagar el
  server** (prueba de autoridad). 15 tests BE verdes. Fixtures de contrato en `contratos/fixtures/`.
- [x] **Fase 1 — Mundo, colisiones y cámara** *(cerrada 2026-07-06)*
  DoD validado: me muevo por un mapa con obstáculos AABB sin atravesarlos ni engancharme en
  esquinas (deslizamiento), dos pestañas se ven. `ResolutorColisiones` (círculo-vs-AABB push-out),
  carga fail-fast, `GET /api/mapas/{id}`, renderer con culling. Decisiones: move-then-resolve sin
  sweep (obstáculos ≥1u, validado); `mundo` se mantiene en BIENVENIDA.
- [x] **Fase 2 — Combate** *(cerrada 2026-07-06)*
  DoD validado: dos pestañas, una mata a la otra; cadencia server-side (spam no acelera);
  números de daño flotan; kill feed + KILLS suben; muerto queda gris; balas bloqueadas por cajas.
  `idRed` monotónico (pool diferido a F7), colisión por segmento (anti-tunneling real), HUD sin
  munición (R10/R31). Gotcha: métodos de `Proyectil` llamados desde `Partida` (paquete distinto,
  `dominio.combate` vs `dominio.partida`) deben ser `public`, no package-private.
- [x] **Fase 3 — Bots** *(cerrada 2026-07-06)*
  DoD validado: 1 humano vs 9 bots jugable y desafiante; arquetipos con armas variadas; no
  disparan a través de paredes. Arquitectura (a pedido del usuario, máxima abstracción):
  **Abstract Factory** (FabricaParticipante → FabricaHumano/Asaltante/Francotirador/Explorador,
  familias {Arma+Comportamiento}), **Null Object** (ComportamientoRemoto = humano, cero if(esBot)),
  **State** (FSM Merodear/Perseguir/Atacar con histéresis + RepertorioEstados), **Strategy**
  (Comportamiento). Humanos y bots se crean por el MISMO camino (agregarParticipante). Bots-locales
  configurable (no hardcodeado).
- [x] **Fase 4 — Battle royale completo (local)** *(cerrada 2026-07-08)*
  DoD validado: partida completa contra 9 bots de lobby a ganador, HUD Battle Bash (radar,
  GAS CLOSING, TIME, quick-slot botiquín) y pantallas por `snapshot.estado`. State completo
  (EnLobby→CuentaRegresiva→EnCurso→Finalizada), ZonaSegura con acumulador exacto, botín
  (Factory Method) y desempates deterministas. Corrección post-cierre: bots ahora priorizan
  `BuscarZona` con prioridad absoluta (interrumpe combate) — cerraba un gap del propio plan
  §8.3 que en F3 había quedado diferido por no existir la zona todavía.
- [ ] **Fase 5 — Plataforma (cuentas, JWT, persistencia)**
  DoD: me registro, juego contra bots, mis estadísticas (con `muertes` y `top3`, R38) sobreviven
  un reinicio y se ven en `/lobby`; endpoints protegidos → 401/403. Ticket de un solo uso para
  el WS (R1); refresh con rotación y familia (R18); UPDATE atómico de stats (R13).
- [ ] **Fase 6 — Multijugador real**
  DoD: dos navegadores, dos cuentas, misma partida; estadísticas de ambos persistidas.
  **REGLA DE LA FASE: `juego/dominio` NO SE TOCA** — es la prueba de fuego de la arquitectura.
  Test de higiene: 50 partidas creadas y terminadas → cero hilos y cero referencias residuales (R12).
- [ ] **Fase 7 — Calidad de red** (prediction + reconciliación con sec/acks; jugable con 150 ms)
- [ ] **Fase 8 — Renderer isométrico** (cero cambios fuera de `render/` — prueba del Bridge)

**Antes de marcar una fase como cerrada:** tests verdes (BE y FE) + casos borde de la fase con test
o decisión documentada + DoD validado a mano por el humano + `mem_save` del cierre.
