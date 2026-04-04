-- ============================================================
-- Audit log table
-- Tracks all INSERT / UPDATE / DELETE on: rapport, offrir, medecin, visiteur
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id_visiteur CHAR(4)      NULL     COMMENT 'Who performed the action (NULL if unknown at DB level)',
  table_name  VARCHAR(30)  NOT NULL,
  action      ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  record_id   VARCHAR(50)  NOT NULL COMMENT 'Primary key of the affected row',
  old_state   JSON         NULL,
  new_state   JSON         NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
