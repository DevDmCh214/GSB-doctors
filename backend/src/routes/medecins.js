const { Router } = require('express')
const prisma = require('../lib/prisma')

const router = Router()

// GET /api/medecins
router.get('/', async (req, res, next) => {
  try {
    const { search, dept } = req.query

    const where = {}

    if (search) {
      where.OR = [
        { nom: { contains: search } },
        { prenom: { contains: search } }
      ]
    }

    if (dept !== undefined && dept !== '') {
      where.departement = parseInt(dept, 10)
    }

    const medecins = await prisma.medecin.findMany({
      where,
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
      select: {
        id: true,
        nom: true,
        prenom: true,
        adresse: true,
        tel: true,
        specialitecomplementaire: true,
        departement: true
      }
    })

    res.json({ medecins, count: medecins.length })
  } catch (err) {
    next(err)
  }
})

// GET /api/medecins/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)

    const medecin = await prisma.medecin.findUnique({
      where: { id },
      select: {
        id: true,
        nom: true,
        prenom: true,
        adresse: true,
        tel: true,
        specialitecomplementaire: true
      }
    })

    if (!medecin) {
      return res.status(404).json({ error: 'Médecin non trouvé' })
    }

    const rapports = await prisma.rapport.findMany({
      where: { idMedecin: id, idVisiteur: req.visiteur.id },
      orderBy: { date: 'desc' },
      select: { id: true, date: true, motif: true }
    })

    const rapportCount = await prisma.rapport.count({
      where: { idMedecin: id }
    })

    res.json({ medecin, rapports, rapportCount })
  } catch (err) {
    next(err)
  }
})

module.exports = router
