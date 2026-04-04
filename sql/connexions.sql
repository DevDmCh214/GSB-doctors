-- ============================================================
-- Connexions table
-- Tracks login attempts (successful and failed) per IP
-- After 5 failed attempts, the IP is locked out for 30 seconds
-- ============================================================

CREATE TABLE IF NOT EXISTS connexions (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  ip_address     VARCHAR(45)  NOT NULL COMMENT 'IPv4 or IPv6 address',
  id_visiteur    CHAR(4)      NULL     COMMENT 'NULL if login does not match any user',
  attempted_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  success        BOOLEAN      NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_connexions_visiteur FOREIGN KEY (id_visiteur) REFERENCES visiteur(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_connexions_ip      ON connexions(ip_address, attempted_at);
CREATE INDEX idx_connexions_visiteur ON connexions(id_visiteur);
