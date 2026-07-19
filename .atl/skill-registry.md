# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| al crear o editar componentes, servicios, rutas, guards, pipes o formularios en Angular/TypeScript | angular-standalone-spa | C:/Users/Luciano Paz/.claude/skills/angular-standalone-spa/SKILL.md |
| When creating a pull request, opening a PR, or preparing changes for review | branch-pr | C:/Users/Luciano Paz/.claude/skills/branch-pr/SKILL.md |
| when a PR would exceed 400 changed lines, when planning chained PRs, stacked PRs, or reviewable slices | chained-pr | C:/Users/Luciano Paz/.claude/skills/chained-pr/SKILL.md |
| al iniciar un proyecto nuevo (Angular o Spring Boot), crear componentes, services, guards, pipes, o cuando el usuario pida scaffolding o estructura de proyecto | cli-first-scaffolding | C:/Users/Luciano Paz/.claude/skills/cli-first-scaffolding/SKILL.md |
| when writing guides, READMEs, RFCs, onboarding docs, architecture docs, or review-facing documentation | cognitive-doc-design | C:/Users/Luciano Paz/.claude/skills/cognitive-doc-design/SKILL.md |
| when drafting or posting feedback, review comments, maintainer replies, Slack messages, or GitHub comments | comment-writer | C:/Users/Luciano Paz/.claude/skills/comment-writer/SKILL.md |
| cuando el usuario pida "modo profundo", "profundidad", "fable-depth", generar un proyecto completo, diseñar una arquitectura, o ejecutar una tarea agéntica larga donde la calidad importa más que la velocidad | fable-depth | C:/Users/Luciano Paz/.claude/skills/fable-depth/SKILL.md |
| al declarar campos de fecha en entidades o DTOs, serializar fechas con Jackson, mostrar fechas con DatePipe, ordenar por fecha, o manejar inputs de tipo date/datetime-local | fechas-argentina-fullstack | C:/Users/Luciano Paz/.claude/skills/fechas-argentina-fullstack/SKILL.md |
| When writing Go tests, using teatest, or adding test coverage | go-testing | C:/Users/Luciano Paz/.claude/skills/go-testing/SKILL.md |
| al escribir o editar templates HTML, estilos CSS/Tailwind, atributos ARIA, navegación por teclado o layouts responsive | html-semantico-accesible-responsive | C:/Users/Luciano Paz/.claude/skills/html-semantico-accesible-responsive/SKILL.md |
| When creating a GitHub issue, reporting a bug, or requesting a feature | issue-creation | C:/Users/Luciano Paz/.claude/skills/issue-creation/SKILL.md |
| al escribir o revisar cualquier método Java — lógica de negocio, transformaciones de colecciones, cálculos, condicionales sobre tipos o estructuras de datos | java21-clean-code-parcial | C:/Users/Luciano Paz/.claude/skills/java21-clean-code-parcial/SKILL.md |
| al crear o editar entidades JPA, relaciones entre entidades, columnas, claves foráneas, DTOs que exponen relaciones, o al diagnosticar consultas N+1 / recursión infinita en JSON | jpa-entities-relaciones | C:/Users/Luciano Paz/.claude/skills/jpa-entities-relaciones/SKILL.md |
| When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen" | judgment-day | C:/Users/Luciano Paz/.claude/skills/judgment-day/SKILL.md |
| al crear, revisar o corregir cualquier clase de test en Java, archivos bajo src/test/java, o al configurar JUnit/Mockito/JaCoCo | junit5-testing-limites | C:/Users/Luciano Paz/.claude/skills/junit5-testing-limites/SKILL.md |
| When user asks to create a new skill, add agent instructions, or document patterns for AI | skill-creator | C:/Users/Luciano Paz/.claude/skills/skill-creator/SKILL.md |
| al crear o editar controllers, services, repositories, entities, DTOs, mappers, exception handlers o clientes de API externa en Java/Spring Boot | springboot4-layered-api | C:/Users/Luciano Paz/.claude/skills/springboot4-layered-api/SKILL.md |
| when implementing a change, preparing commits, splitting PRs, or planning chained or stacked PRs | work-unit-commits | C:/Users/Luciano Paz/.claude/skills/work-unit-commits/SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### angular-standalone-spa
- Usar componentes standalone (desde Angular 19+ no agregar `standalone: true` de forma explícita).
- Usar `ChangeDetectionStrategy.OnPush` en todos los componentes para optimizar la detección de cambios.
- TypeScript estricto: prohibido el uso de `any` (usar tipado explícito o `unknown`).
- Estructura modular y limpia: las páginas manejan lógica/servicios, los componentes de presentación reciben `@Input` y emiten `@Output`.
- Manejar estado local con Signals y consumir servicios HTTP con Observables de RxJS.

### branch-pr
- Todo PR debe enlazar obligatoriamente a un issue de GitHub aprobado (`status:approved`).
- Todo PR debe tener exactamente una etiqueta `type:*` asignada.
- Las ramas deben seguir el formato `type/description` validando contra: `^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)\/[a-z0-9._-]+$`.
- Escribir commits siguiendo los estándares de Conventional Commits (`feat:`, `fix:`, etc.).

### chained-pr
- Si un PR prevé superar las 400 líneas totales de diff (additions + deletions), se debe dividir en PRs encadenados independientes.
- Cada PR de la cadena debe mantener consistencia de compilación, tests y CI green autónomamente.
- Indicar explícitamente en la descripción del PR su origen, su destino, la PR previa y la siguiente.
- Incluir un diagrama visual de dependencias que localice la PR actual en la cadena.

### cli-first-scaffolding
- Entregar siempre los comandos de CLI exactos (ng new, ng generate, curl a start.spring.io) para que el humano los corra.
- El agente solo escribe el contenido de los archivos una vez generado el esqueleto por el CLI.
- No crear estructuras que el CLI genere automáticamente de forma manual.

### cognitive-doc-design
- Diseñar documentación estructurada para reducir carga cognitiva (uso de progressive disclosure, checklists, tablas y jerarquías claras).
- Utilizar bloques de alertas de GitHub (NOTE, TIP, IMPORTANT, WARNING, CAUTION) para destacar información clave.

### comment-writer
- Escribir comentarios con tono cálido, directo, profesional y humano para revisiones, PRs, issues o chats.

### fable-depth
- Activar protocolo de profundidad para tareas arquitectónicas o de análisis que requieran un razonamiento y andamiaje robusto.

### fechas-argentina-fullstack
- Toda la aplicación debe estar fija en la hora de Argentina (America/Argentina/Buenos_Aires, GMT-3).
- DB: almacenar fechas en `TIMESTAMP` (nombre en `snake_case`).
- Backend Java: usar `LocalDateTime` (nombre en `camelCase`) y `@JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")`. En Boot 4, no usar la propiedad deprecated `spring.jackson.serialization.write-dates-as-timestamps`.
- Frontend Angular: modelar fechas como `string` (ISO-8601). Para presentar en pantalla, usar DatePipe con locale `'es-AR'` y formato `dd/MM/yyyy HH:mm`. El backend nunca formatea.

### go-testing
- Escribir tests unitarios en Go usando aserciones estándar y bibliotecas para testing de TUI (como teatest para Bubbletea) cuando corresponda.

### html-semantico-accesible-responsive
- Usar etiquetas HTML5 semánticas nativas (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`).
- Botón vs Enlace: usar `<button type="button">` para acciones con click; usar `<a>` con `href` para navegación. Nunca usar `div` con onClick.
- Ocultar del lector de pantalla elementos visuales puros y SVGs usando `aria-hidden="true"`.
- Jerarquía de encabezados estricta: un único `<h1>` por página, y estructurar h2, h3 de forma secuencial.
- Diseñar de forma responsive usando layouts flexibles y los breakpoints nativos del framework CSS.

### issue-creation
- Utilizar obligatoriamente las plantillas de GitHub oficiales de Bug Report o Feature Request para abrir issues (los issues vacíos serán rechazados).
- Los nuevos issues reciben automáticamente la etiqueta `status:needs-review`.
- Es mandatorio obtener la aprobación de un mantenedor (`status:approved`) antes de abrir una PR que enlace a dicho issue.

### java21-clean-code-parcial
- Prohibido el uso de `var` (tipo explícito siempre) y prohibido `record` en DTOs (usar clases anotadas con Lombok).
- Switch expressions permitidas.
- Dinero y contabilidad: usar `BigDecimal` para importes y comparar usando `compareTo` en lugar de `equals` (no aplica para la física que usa double).
- Principio de responsabilidad única (SRP): evitar clases utilitarias y centralizar lógica en objetos con responsabilidades claras.

### jpa-entities-relaciones
- Lombok en entities: usar `@Getter @Setter @NoArgsConstructor @AllArgsConstructor` (NUNCA usar `@Data` para evitar recursión infinita en hashCode/toString de relaciones).
- Relaciones 1-N: usar `@ManyToOne` en el lado dueño (con `fetch = FetchType.LAZY` y `@JoinColumn`) y `@OneToMany` en el lado inverso (`mappedBy` apuntando al campo dueño).
- Mantener consistencia de nombres: Java en camelCase y DB en snake_case.

### judgment-day
- Ejecutar el proceso de revisión paralela mediante dos agentes independientes ("jueces ciegos") a los cuales se les inyectan los `## Project Standards (auto-resolved)` correspondientes.
- Sintetizar los reportes en una tabla de veredicto (Confirmados, Sospechosos, Contradicciones).
- Iterar en ciclos de corrección e inspección hasta lograr el visto bueno de ambos jueces (máximo 2 iteraciones).

### junit5-testing-limites
- Estructurar tests bajo el formato AAA (Arrange, Act, Assert) demarcando con comentarios `// GIVEN`, `// WHEN`, `// THEN`.
- Nomenclatura del test: `methodName_scenario_expected`.
- Uso obligatorio de `@DisplayName` y `@Tag("unit"|"integration")`.
- Un test prueba un solo escenario. Extraer datos y objetos recurrentes a helpers privados para evitar duplicidad de código.

### skill-creator
- Crear nuevas skills para agentes conforme a la especificación estándar (SKILL.md con metadatos y frontmatter estructurado).

### springboot4-layered-api
- Prohibido el uso de `@Autowired` (usar `private final` en atributos y inyección mediante `@RequiredArgsConstructor`).
- Estructurar backend en capas bien delimitadas: controllers, services (interfaz + impl), repositories, entities, dtos, mappers, exceptions.
- Los controllers deben depender exclusivamente de la interfaz del servicio, nunca de la implementación ni de repositories directamente.
- Las entidades de persistencia no se exponen al cliente REST (mapear a DTOs).

### work-unit-commits
- Estructurar commits por unidades de trabajo entregables y funcionales, no por tipo de archivo.
- Los tests y la documentación relativos a una nueva funcionalidad deben ir en el mismo commit que la implementa.
- Escribir mensajes de commit concisos siguiendo Conventional Commits.

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | AGENTS.md | Index — references files below |
| PLAN.md | PLAN.md | Referenced by AGENTS.md |

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted — no need to read index files to discover more.
