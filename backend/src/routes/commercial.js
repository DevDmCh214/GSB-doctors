const { Router } = require('express')
const prisma = require('../lib/prisma')

const router = Router()

// GET /api/commercial/stats
router.get('/stats', async (req, res, next) => {
  if (req.visiteur.role !== 'commercial') {
    return res.status(403).json({ error: 'Accès réservé au service commercial' })
  }

  try {
    const rows = await prisma.$queryRaw`
      SELECT m.specialitecomplementaire AS specialite, COUNT(r.id) AS nbRapports
      FROM rapport r
      JOIN medecin m ON m.id = r.idMedecin
      WHERE m.specialitecomplementaire IS NOT NULL
        AND m.specialitecomplementaire != ''
      GROUP BY m.specialitecomplementaire
      ORDER BY nbRapports DESC
    `

    const stats = rows.map((row, i) => ({
      rang: i + 1,
      specialite: row.specialite,
      nbRapports: Number(row.nbRapports),
    }))

    res.json({ stats })
  } catch (err) {
    next(err)
  }
})

module.exports = router
