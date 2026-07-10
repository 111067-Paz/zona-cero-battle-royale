-- Fase "personajes" (PLAN §15): aspecto chibi elegido por el usuario, visible para todos en
-- partida (viaja en el snapshot). Default GATO: las cuentas ya existentes no quedan en un estado
-- invalido (NOT NULL sin DEFAULT rompería filas preexistentes).
ALTER TABLE usuarios ADD COLUMN personaje VARCHAR(20) NOT NULL DEFAULT 'GATO';
