-- ============================================================
-- Session table
-- Server-side sessions linked to JWT tokens
-- Allows invalidation on logout and 30-min expiration
-- ============================================================

CREATE TABLE IF NOT EXISTS session (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY COMMENT 'UUID v4 session identifier (stored in JWT)',
  id_visiteur CHAR(4)      CHARACTER SET latin1 NOT NULL,
  ip_address  VARCHAR(45)  NOT NULL COMMENT 'IPv4 or IPv6 address',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at  DATETIME     NOT NULL,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_session_visiteur FOREIGN KEY (id_visiteur) REFERENCES visiteur(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_session_visiteur ON session(id_visiteur);
CREATE INDEX idx_session_active   ON session(is_active, expires_at);
