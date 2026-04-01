const { Router } = require('express')
const prisma = require('../lib/prisma')

const router = Router()

// GET /api/dashboard
router.get('/', async (req, res, next) => {
  try {
    const visiteurId = req.visiteur.id

    // All rapports by this visiteur, with medecin info
    const mesRapports = await prisma.rapport.findMany({
      where: { idVisiteur: visiteurId },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        motif: true,
        medecin: { select: { id: true, nom: true, prenom: true } }
      }
    })

    // Distinct medecins with rapport count for this visiteur
    const rapportsByMedecin = await prisma.rapport.groupBy({
      by: ['idMedecin'],
      where: { idVisiteur: visiteurId },
      _count: { id: true }
    })

    const medecinIds = rapportsByMedecin.map(r => r.idMedecin)
    const medecins = await prisma.medecin.findMany({
      where: { id: { in: medecinIds } },
      select: { id: true, nom: true, prenom: true }
    })

    const countMap = {}
    rapportsByMedecin.forEach(r => { countMap[r.idMedecin] = r._count.id })

    const medecinsSuivis = medecins
      .map(m => ({ ...m, rapportCount: countMap[m.id] || 0 }))
      .sort((a, b) => b.rapportCount - a.rapportCount)

    res.json({ medecinsSuivis, mesRapports })
  } catch (err) {
    next(err)
  }
})

module.exports = router
