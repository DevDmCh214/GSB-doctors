const { Router } = require('express')
const prisma = require('../lib/prisma')

const router = Router()

// GET /api/medecins
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query

    const where = {}

    if (search) {
      where.OR = [
        { nom: { contains: search } },
        { prenom: { contains: search } }
      ]
    }

    const LIMIT = Math.min(parseInt(req.query.limit, 10) || 20, 100)
    const PAGE  = Math.max(parseInt(req.query.page,  10) || 1, 1)
    const SKIP  = (PAGE - 1) * LIMIT

    const [total, medecins] = await Promise.all([
      prisma.medecin.count({ where }),
      prisma.medecin.findMany({
        where,
        orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
        skip: SKIP,
        take: LIMIT,
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
    ])

    res.json({ medecins, count: total, totalPages: Math.ceil(total / LIMIT) })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/medecins/:id — update adresse, tel
router.patch('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    const { adresse, tel } = req.body

    if (typeof adresse !== 'string' || !adresse.trim()) {
      return res.status(400).json({ error: 'L\'adresse est requise.' })
    }

    const adresseTrim = adresse.trim()
    if (adresseTrim.length > 80) {
      return res.status(400).json({ error: 'L\'adresse est trop longue (80 caractères max).' })
    }

    let telValue = null
    if (tel !== undefined && tel !== null && String(tel).trim() !== '') {
      const t = String(tel).trim()
      if (t.length > 15) {
        return res.status(400).json({ error: 'Le numéro est trop long (15 caractères max).' })
      }
      if (!/^[\d\s\+\-\.()]+$/.test(t)) {
        return res.status(400).json({ error: 'Le numéro de téléphone contient des caractères invalides.' })
      }
      telValue = t
    }

    const medecin = await prisma.medecin.update({
      where: { id },
      data: {
        adresse: adresseTrim,
        tel: telValue
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        adresse: true,
        tel: true,
        specialitecomplementaire: true
      }
    })

    res.json({ medecin })
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Médecin non trouvé' })
    }
    next(err)
  }
})

// DELETE /api/medecins/:id — cascade delete: offrir → rapports → medecin
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)

    const medecin = await prisma.medecin.findUnique({ where: { id } })
    if (!medecin) {
      return res.status(404).json({ error: 'Médecin non trouvé' })
    }

    await prisma.$transaction(async (tx) => {
      // Delete all offrir rows for all rapports of this medecin
      await tx.offrir.deleteMany({
        where: { rapport: { idMedecin: id } }
      })
      // Delete all rapports for this medecin
      await tx.rapport.deleteMany({
        where: { idMedecin: id }
      })
      // Delete the medecin
      await tx.medecin.delete({
        where: { id }
      })
    })

    res.json({ success: true })
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

    res.json({ medecin, rapports, rapportCount: rapports.length })
  } catch (err) {
    next(err)
  }
})

module.exports = router
