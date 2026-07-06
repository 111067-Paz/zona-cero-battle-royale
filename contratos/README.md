# Contratos compartidos — protocolo v1

Fuente de verdad del contrato cliente <-> servidor (PLAN §9.3). Un JSON canonico por mensaje.

- El **servidor** (JUnit) deserializa y re-serializa cada fixture, comparando arboles JSON: si un
  DTO cambia de forma, el test de contrato falla.
- El **cliente** (Vitest) tipa estos mismos fixtures contra sus interfaces TypeScript: si un tipo
  se desincroniza del wire, el spec falla.

Si un lado cambia el contrato, el OTRO se entera en CI, no en runtime.

## Mensajes (Fase 0)

| Archivo | Direccion | Tipo |
|---|---|---|
| `unirse.json` | cliente -> servidor | UNIRSE |
| `input.json` | cliente -> servidor | INPUT |
| `salir.json` | cliente -> servidor | SALIR |
| `bienvenida.json` | servidor -> cliente | BIENVENIDA |
| `snapshot.json` | servidor -> cliente | SNAPSHOT |

Los campos `estado`, `tickInicio` y `acks` del snapshot viajan desde la Fase 0 aunque el combate,
las fases de partida y la prediccion se ejerciten mas adelante: fijan el contrato de una vez.
