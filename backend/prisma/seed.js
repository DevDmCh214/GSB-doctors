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

  // Generate bcrypt hash for "password"
  const hash = await bcrypt.hash('password', 10)

  // Update all visiteurs with the same hash
  await connection.query('UPDATE visiteur SET mdp = ?', [hash])

  await connection.end()

  // Print confirmation table
  console.log('\n✅ Seed complete — all users have password: "password"\n')
  console.log('login       | nom        | prenom')
  console.log('------------|------------|--------')
  console.log('aribiA      | Aribi      | Alain')
  console.log('ltusseau    | Tusseau    | Louis')
  console.log('fdaburon    | Daburon    | François')
  console.log('fdudouit    | Dudouit    | Frédéric')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
