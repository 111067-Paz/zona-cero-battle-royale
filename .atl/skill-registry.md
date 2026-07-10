# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| al crear o editar componentes, servicios, rutas, guards, pipes o formularios en Angular/TypeScript | angular-standalone-spa | C:/Users/Luciano Paz/.claude/skills/angular-standalone-spa/SKILL.md |
| al iniciar un proyecto nuevo (Angular o Spring Boot), crear componentes, services, guards, pipes, o cuando el usuario pida scaffolding o estructura de proyecto | cli-first-scaffolding | C:/Users/Luciano Paz/.claude/skills/cli-first-scaffolding/SKILL.md |
| al declarar campos de fecha en entidades o DTOs, serializar fechas con Jackson, mostrar fechas con DatePipe, ordenar por fecha, o manejar inputs de tipo date/datetime-local | fechas-argentina-fullstack | C:/Users/Luciano Paz/.claude/skills/fechas-argentina-fullstack/SKILL.md |
| al escribir o editar templates HTML, estilos CSS/Tailwind, atributos ARIA, navegación por teclado o layouts responsive | html-semantico-accesible-responsive | C:/Users/Luciano Paz/.claude/skills/html-semantico-accesible-responsive/SKILL.md |
| al escribir o revisar cualquier método Java — lógica de negocio, transformaciones de colecciones, cálculos, condicionales sobre tipos o estructuras de datos | java21-clean-code-parcial | C:/Users/Luciano Paz/.claude/skills/java21-clean-code-parcial/SKILL.md |
| al crear o editar entidades JPA, relaciones entre entidades, columnas, claves foráneas, DTOs que exponen relaciones, o al diagnosticar consultas N+1 / recursión infinita en JSON | jpa-entities-relaciones | C:/Users/Luciano Paz/.claude/skills/jpa-entities-relaciones/SKILL.md |
| al crear, revisar o corregir cualquier clase de test en Java, archivos bajo src/test/java, o al configurar JUnit/Mockito/JaCoCo | junit5-testing-limites | C:/Users/Luciano Paz/.claude/skills/junit5-testing-limites/SKILL.md |
| al crear o editar controllers, services, repositories, entities, DTOs, mappers, exception handlers o clientes de API externa en Java/Spring Boot | springboot4-layered-api | C:/Users/Luciano Paz/.claude/skills/springboot4-layered-api/SKILL.md |
| when implementing a change, preparing commits, splitting PRs, or planning chained or stacked PRs | work-unit-commits | C:/Users/Luciano Paz/.gemini/config/skills/work-unit-commits/SKILL.md |
| When creating a pull request, opening a PR, or preparing changes for review | branch-pr | C:/Users/Luciano Paz/.gemini/config/skills/branch-pr/SKILL.md |
| when writing guides, READMEs, RFCs, onboarding docs, architecture docs, or review-facing documentation | cognitive-doc-design | C:/Users/Luciano Paz/.gemini/config/skills/cognitive-doc-design/SKILL.md |
| when drafting or posting feedback, review comments, maintainer replies, Slack messages, or GitHub comments | comment-writer | C:/Users/Luciano Paz/.gemini/config/skills/comment-writer/SKILL.md |
| when a PR would exceed 400 changed lines, when planning chained PRs, stacked PRs, or reviewable slices | gentle-ai-chained-pr | C:/Users/Luciano Paz/.gemini/config/skills/chained-pr/SKILL.md |
| When writing Go tests, using teatest, or adding test coverage | go-testing | C:/Users/Luciano Paz/.gemini/config/skills/go-testing/SKILL.md |
| When creating a GitHub issue, reporting a bug, or requesting a feature | issue-creation | C:/Users/Luciano Paz/.gemini/config/skills/issue-creation/SKILL.md |
| When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen" | judgment-day | C:/Users/Luciano Paz/.gemini/config/skills/judgment-day/SKILL.md |
| When user asks to create a new skill, add agent instructions, or document patterns for AI | skill-creator | C:/Users/Luciano Paz/.gemini/config/skills/skill-creator/SKILL.md |

## Compact Rules

### angular-standalone-spa
- Do NOT write `standalone: true` (it is default in Angular 19+).
- Always use `ChangeDetectionStrategy.OnPush`.
- Smart/Dumb component separation: Dumb components don't inject services.
- Clean subscriptions with `takeUntilDestroyed` or the `async` pipe.
- Prefer class/style bindings `[class.x]` over `ngClass`/`ngStyle`.
- Use control flow `@if`, `@for` with `track` on ID, and `@switch`.
- Forms MUST use Reactive Forms (template-driven forms are deprecated).
- All routes must be lazy (`loadComponent`), functional guards, wildcard at the end.

### cli-first-scaffolding
- Propose CLI commands (e.g. `ng generate`, `mvn`) and let the human run them.
- Only write content to files after CLI scaffolding is generated.
- Save tokens and preserve structure by avoiding manual creation of skeleton files.

### fechas-argentina-fullstack
- Use `America/Argentina/Buenos_Aires` (GMT-3) timezone.
- Format dates consistently: `dd/MM/yyyy HH:mm` in frontend, `LocalDateTime` in backend.
- ISO-8601 wire format.

### html-semantico-accesible-responsive
- Semantic HTML tags (`<header>`, `<nav>`, `<main>`, `<article>`, `<footer>`).
- ARIA attributes only if native HTML fails.
- Keyboard navigation support.
- Responsive design.

### java21-clean-code-parcial
- No `var` (explicit types always).
- No `record` (Lombok classes instead).
- Choose collections wisely based on complexity.
- Handle nulls and use modern switch expressions.

### jpa-entities-relaciones
- Entities CamelCase in Java, snake_case in DB, json camelCase.
- Relationships: fetch LAZY by default, CascadeType selection.
- Lombok in entities: `@Getter @Setter @NoArgsConstructor`, never `@Data`.
- DTOs to expose data to prevent recursion.

### junit5-testing-limites
- Method naming: `methodName_scenario_expected`.
- `@DisplayName` and `@Tag` required on tests.
- High JaCoCo test coverage, test both success and error paths.
- Reflection for private method testing if needed.

### springboot4-layered-api
- Layers: controller -> service (interface) -> repository.
- No `@Autowired` (use Lombok `@RequiredArgsConstructor` + `private final`).
- Controllers only handle routing, validation, mapping; no business logic.
- Single error DTO (`ErrorApi`) for all exceptions.
- DTOs for requests/responses (no entity exposure).

### work-unit-commits
- Structure commits as deliverable work units.
- Keep tests and docs beside the code they verify.

### branch-pr
- Follow the issue-first enforcement system.
- Match commits to branch name.

### cognitive-doc-design
- Design documentation to reduce reader cognitive load.
- strategic use of alerts, tables, checklists, and progressive disclosure.

### comment-writer
- Write warm, direct, professional, and caring comments.

### gentle-ai-chained-pr
- Split large changes into chained/stacked PRs under 400 changed lines.

### go-testing
- Go testing patterns for Gentleman.Dots.

### issue-creation
- Issue creation workflow following the issue-first system.

### judgment-day
- Parallel adversarial review protocol with two independent blind judge sub-agents.

### skill-creator
- Create new AI agent skills following the Agent Skills spec.

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | AGENTS.md | Project conventions, rules, architecture, DoD checklist, and gotchas |

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted — no need to read index files to discover more.
