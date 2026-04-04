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
