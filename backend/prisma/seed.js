require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mysql = require('mysql2/promise')
const bcrypt = require('bcrypt')
const fs = require('fs')
const path = require('path')

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'gsb',
    password: 'gsb',
    database: 'gsbrapports',
    multipleStatements: true
  })

  // Read and execute the SQL dump
  const sqlPath = path.join(__dirname, '../../sql/sql.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0)

  for (const stmt of statements) {
    try {
      await connection.query(stmt)
    } catch (err) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.message.includes('already exists')) {
        // skip — table already created
      } else if (err.code === 'ER_DUP_ENTRY') {
        // skip — data already inserted
      } else {
        // skip other non-fatal errors silently (e.g. SET statements)
      }
    }
  }

  // Widen mdp column to CHAR(60) for bcrypt
  await connection.query('ALTER TABLE visiteur MODIFY mdp CHAR(60)')

  // Create audit_log table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      id_visiteur CHAR(4)      NULL,
      table_name  VARCHAR(30)  NOT NULL,
      action      ENUM('INSERT','UPDATE','DELETE') NOT NULL,
      record_id   VARCHAR(50)  NOT NULL,
      old_state   JSON         NULL,
      new_state   JSON         NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  // Create session table (id_visiteur uses latin1 to match visiteur.id charset)
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS session (
        id          VARCHAR(36)  NOT NULL PRIMARY KEY,
        id_visiteur CHAR(4)      CHARACTER SET latin1 NOT NULL,
        ip_address  VARCHAR(45)  NOT NULL,
        created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at  DATETIME     NOT NULL,
        is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
        CONSTRAINT fk_session_visiteur FOREIGN KEY (id_visiteur) REFERENCES visiteur(id) ON DELETE CASCADE,
        INDEX idx_session_visiteur (id_visiteur),
        INDEX idx_session_active (is_active, expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    console.log('✅ Session table created')
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('✅ Session table already exists')
    } else {
      console.error('❌ Failed to create session table:', err.message)
      throw err
    }
  }

  // Create connexions table (id_visiteur uses latin1 to match visiteur.id charset)
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS connexions (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        ip_address     VARCHAR(45)  NOT NULL,
        id_visiteur    CHAR(4)      CHARACTER SET latin1 NULL,
        attempted_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        success        BOOLEAN      NOT NULL DEFAULT FALSE,
        CONSTRAINT fk_connexions_visiteur FOREIGN KEY (id_visiteur) REFERENCES visiteur(id) ON DELETE SET NULL,
        INDEX idx_connexions_ip (ip_address, attempted_at),
        INDEX idx_connexions_visiteur (id_visiteur)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    console.log('✅ Connexions table created')
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('✅ Connexions table already exists')
    } else {
      console.error('❌ Failed to create connexions table:', err.message)
      throw err
    }
  }

  // Verify tables were actually created
  const [tables] = await connection.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'gsbrapports' AND TABLE_NAME IN ('session', 'connexions')`
  )
  const tableNames = tables.map(t => t.TABLE_NAME)
  if (!tableNames.includes('session')) {
    throw new Error('Table "session" was not created — check MySQL errors above')
  }
  if (!tableNames.includes('connexions')) {
    throw new Error('Table "connexions" was not created — check MySQL errors above')
  }
  console.log('✅ Tables session et connexions vérifiées')

  // Create triggers (each sent as a single statement to mysql2)
  const triggers = [
    // -- RAPPORT --
    `CREATE TRIGGER trg_rapport_insert AFTER INSERT ON rapport FOR EACH ROW
     INSERT INTO audit_log (id_visiteur, table_name, action, record_id, old_state, new_state)
     VALUES (NEW.idVisiteur, 'rapport', 'INSERT', CAST(NEW.id AS CHAR), NULL,
       JSON_OBJECT('id', NEW.id, 'date', DATE_FORMAT(NEW.date,'%Y-%m-%d'), 'motif', NEW.motif, 'bilan', NEW.bilan, 'idVisiteur', NEW.idVisiteur, 'idMedecin', NEW.idMedecin))`,

    `CREATE TRIGGER trg_rapport_update AFTER UPDATE ON rapport FOR EACH ROW
     INSERT INTO audit_log (id_visiteur, table_name, action, record_id, old_state, new_state)
     VALUES (NEW.idVisiteur, 'rapport', 'UPDATE', CAST(NEW.id AS CHAR),
       JSON_OBJECT('id', OLD.id, 'date', DATE_FORMAT(OLD.date,'%Y-%m-%d'), 'motif', OLD.motif, 'bilan', OLD.bilan, 'idVisiteur', OLD.idVisiteur, 'idMedecin', OLD.idMedecin),
       JSON_OBJECT('id', NEW.id, 'date', DATE_FORMAT(NEW.date,'%Y-%m-%d'), 'motif', NEW.motif, 'bilan', NEW.bilan, 'idVisiteur', NEW.idVisiteur, 'idMedecin', NEW.idMedecin))`,

    `CREATE TRIGGER trg_rapport_delete AFTER DELETE ON rapport FOR EACH ROW
     INSERT INTO audit_log (id_visiteur, table_name, action, record_id, old_state, new_state)
     VALUES (OLD.idVisiteur, 'rapport', 'DELETE', CAST(OLD.id AS CHAR),
       JSON_OBJECT('id', OLD.id, 'date', DATE_FORMAT(OLD.date,'%Y-%m-%d'), 'motif', OLD.motif, 'bilan', OLD.bilan, 'idVisiteur', OLD.idVisiteur, 'idMedecin', OLD.idMedecin), NULL)`,

    // -- OFFRIR --
    `CREATE TRIGGER trg_offrir_insert AFTER INSERT ON offrir FOR EACH ROW
     INSERT INTO audit_log (id_visiteur, table_name, action, record_id, old_state, new_state)
     VALUES ((SELECT idVisiteur FROM rapport WHERE id = NEW.idRapport), 'offrir', 'INSERT',
       CONCAT(NEW.idRapport, ':', NEW.idMedicament), NULL,
       JSON_OBJECT('idRapport', NEW.idRapport, 'idMedicament', NEW.idMedicament, 'quantite', NEW.quantite))`,

    `CREATE TRIGGER trg_offrir_delete AFTER DELETE ON offrir FOR EACH ROW
     INSERT INTO audit_log (id_visiteur, table_name, action, record_id, old_state, new_state)
     VALUES ((SELECT idVisiteur FROM rapport WHERE id = OLD.idRapport), 'offrir', 'DELETE',
       CONCAT(OLD.idRapport, ':', OLD.idMedicament),
       JSON_OBJECT('idRapport', OLD.idRapport, 'idMedicament', OLD.idMedicament, 'quantite', OLD.quantite), NULL)`,

    // -- MEDECIN --
    `CREATE TRIGGER trg_medecin_update AFTER UPDATE ON medecin FOR EACH ROW
     INSERT INTO audit_log (id_visiteur, table_name, action, record_id, old_state, new_state)
     VALUES (NULL, 'medecin', 'UPDATE', CAST(NEW.id AS CHAR),
       JSON_OBJECT('id', OLD.id, 'nom', OLD.nom, 'prenom', OLD.prenom, 'adresse', OLD.adresse, 'tel', IFNULL(OLD.tel,''), 'specialitecomplementaire', IFNULL(OLD.specialitecomplementaire,''), 'departement', OLD.departement),
       JSON_OBJECT('id', NEW.id, 'nom', NEW.nom, 'prenom', NEW.prenom, 'adresse', NEW.adresse, 'tel', IFNULL(NEW.tel,''), 'specialitecomplementaire', IFNULL(NEW.specialitecomplementaire,''), 'departement', NEW.departement))`,

    `CREATE TRIGGER trg_medecin_delete AFTER DELETE ON medecin FOR EACH ROW
     INSERT INTO audit_log (id_visiteur, table_name, action, record_id, old_state, new_state)
     VALUES (NULL, 'medecin', 'DELETE', CAST(OLD.id AS CHAR),
       JSON_OBJECT('id', OLD.id, 'nom', OLD.nom, 'prenom', OLD.prenom, 'adresse', OLD.adresse, 'tel', IFNULL(OLD.tel,''), 'specialitecomplementaire', IFNULL(OLD.specialitecomplementaire,''), 'departement', OLD.departement), NULL)`,

    // -- VISITEUR --
    `CREATE TRIGGER trg_visiteur_insert AFTER INSERT ON visiteur FOR EACH ROW
     INSERT INTO audit_log (id_visiteur, table_name, action, record_id, old_state, new_state)
     VALUES (NEW.id, 'visiteur', 'INSERT', NEW.id, NULL,
       JSON_OBJECT('id', NEW.id, 'nom', IFNULL(NEW.nom,''), 'prenom', IFNULL(NEW.prenom,''), 'login', IFNULL(NEW.login,''), 'adresse', IFNULL(NEW.adresse,''), 'cp', IFNULL(NEW.cp,''), 'ville', IFNULL(NEW.ville,'')))`,
  ]

  for (const trigger of triggers) {
    try { await connection.query(trigger) } catch (err) {
      // skip if trigger already exists
      if (!err.message.includes('already exists')) {
        console.warn('Trigger warning:', err.message.substring(0, 80))
      }
    }
  }
  console.log('✅ Audit log table and triggers created')

  // Per-user passwords
  const userPasswords = {
    aribiA:   'Gsb@2025!a',
    ltusseau: 'Pharma#L8x',
    fdaburon: 'Visite$F94',
    fdudouit: 'Rapport&D7',
  }

  // Set specific passwords for demo users, fallback for the rest
  const fallbackHash = await bcrypt.hash('Gsb_User!01', 10)
  await connection.query('UPDATE visiteur SET mdp = ?', [fallbackHash])

  for (const [login, pwd] of Object.entries(userPasswords)) {
    const hash = await bcrypt.hash(pwd, 10)
    await connection.query('UPDATE visiteur SET mdp = ? WHERE login = ?', [hash, login])
  }

  await connection.end()

  // Print confirmation table
  console.log('\n✅ Seed complete\n')
  console.log('login       | mot de passe   | nom        | prenom')
  console.log('------------|----------------|------------|--------')
  console.log('aribiA      | Gsb@2025!a     | Aribi      | Alain')
  console.log('ltusseau    | Pharma#L8x     | Tusseau    | Louis')
  console.log('fdaburon    | Visite$F94     | Daburon    | François')
  console.log('fdudouit    | Rapport&D7     | Dudouit    | Frédéric')
  console.log('')
  console.log('Tous les autres utilisateurs : Gsb_User!01')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
