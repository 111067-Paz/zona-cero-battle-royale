-- Fase 5: modulo plataforma (PLAN §4.2). El esquema lo posee Flyway; Hibernate corre con
-- ddl-auto=none — nunca genera ni valida DDL por su cuenta.

CREATE TABLE usuarios (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre_usuario VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL,
    CONSTRAINT uk_usuarios_nombre_usuario UNIQUE (nombre_usuario),
    CONSTRAINT uk_usuarios_email UNIQUE (email)
);

CREATE TABLE tokens_refresco (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    hash_token VARCHAR(255) NOT NULL,
    familia UUID NOT NULL,
    expiracion TIMESTAMP NOT NULL,
    revocado BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMP NOT NULL,
    CONSTRAINT uk_tokens_refresco_hash UNIQUE (hash_token),
    CONSTRAINT fk_tokens_refresco_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
);
CREATE INDEX idx_tokens_refresco_familia ON tokens_refresco (familia);

CREATE TABLE resultados_partida (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    partida_id VARCHAR(64) NOT NULL,
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP NOT NULL,
    cantidad_jugadores INT NOT NULL,
    CONSTRAINT uk_resultados_partida_id UNIQUE (partida_id)
);

CREATE TABLE participaciones_partida (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    resultado_id BIGINT NOT NULL,
    usuario_id BIGINT,
    posicion_final INT NOT NULL,
    kills INT NOT NULL,
    muertes INT NOT NULL,
    CONSTRAINT fk_participaciones_resultado FOREIGN KEY (resultado_id) REFERENCES resultados_partida (id),
    CONSTRAINT fk_participaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
);

CREATE TABLE estadisticas_jugador (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    partidas_jugadas INT NOT NULL DEFAULT 0,
    victorias INT NOT NULL DEFAULT 0,
    kills INT NOT NULL DEFAULT 0,
    muertes INT NOT NULL DEFAULT 0,
    top3 INT NOT NULL DEFAULT 0,
    CONSTRAINT uk_estadisticas_usuario UNIQUE (usuario_id),
    CONSTRAINT fk_estadisticas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
);
