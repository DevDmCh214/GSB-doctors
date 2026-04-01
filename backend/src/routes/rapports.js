const { Router } = require('express')
const prisma = require('../lib/prisma')

const router = Router()

// GET /api/rapports
router.get('/', async (req, res, next) => {
  try {
    const { search, sortDate, sortMotif, sortNom } = req.query

    const where = { idVisiteur: req.visiteur.id }

    if (search) {
      where.OR = [
        { medecin: { nom: { contains: search } } },
        { medecin: { prenom: { contains: search } } },
        { motif: { contains: search } }
      ]
    }

    let orderBy = [{ date: 'desc' }]
    if (sortDate) orderBy = [{ date: sortDate }]
    else if (sortMotif) orderBy = [{ motif: sortMotif }]
    else if (sortNom) orderBy = [{ medecin: { nom: sortNom } }]

    const rapports = await prisma.rapport.findMany({
      where,
      orderBy,
      select: {
        id: true,
        date: true,
        motif: true,
        medecin: { select: { id: true, nom: true, prenom: true } }
      }
    })

    res.json({ rapports, count: rapports.length })
  } catch (err) {
    next(err)
  }
})

// GET /api/rapports/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)

    const found = await prisma.rapport.findUnique({
      where: { id },
      include: {
        medecin: { select: { id: true, nom: true, prenom: true, specialitecomplementaire: true } },
        offrir: {
          include: {
            medicament: {
              include: { famille: { select: { libelle: true } } }
            }
          }
        }
      }
    })

    if (!found) {
      return res.status(404).json({ error: 'Rapport non trouvé' })
    }

    if (found.idVisiteur !== req.visiteur.id) {
      return res.status(403).json({ error: 'Accès refusé' })
    }

    const echantillons = found.offrir.map(o => ({
      idMedicament: o.idMedicament,
      nomCommercial: o.medicament.nomCommercial,
      libelle: o.medicament.famille.libelle,
      quantite: o.quantite
    }))

    res.json({
      rapport: { id: found.id, date: found.date, motif: found.motif, bilan: found.bilan },
      medecin: found.medecin,
      echantillons
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/rapports
router.post('/', async (req, res, next) => {
  try {
    const { idMedecin, date, motif, bilan, echantillons = [] } = req.body

    const medecin = await prisma.medecin.findUnique({ where: { id: parseInt(idMedecin, 10) } })
    if (!medecin) {
      return res.status(404).json({ error: 'Médecin non trouvé' })
    }

    const rapport = await prisma.$transaction(async (tx) => {
      const created = await tx.rapport.create({
        data: {
          date: new Date(date),
          motif,
          bilan,
          idVisiteur: req.visiteur.id,
          idMedecin: parseInt(idMedecin, 10)
        }
      })

      if (echantillons.length > 0) {
        await tx.offrir.createMany({
          data: echantillons.map(e => ({
            idRapport: created.id,
            idMedicament: e.idMedicament,
            quantite: e.quantite
          }))
        })
      }

      return created
    })

    res.status(201).json({
      rapport: {
        id: rapport.id,
        date: rapport.date,
        motif: rapport.motif,
        bilan: rapport.bilan,
        idMedecin: rapport.idMedecin
      }
    })
  } catch (err) {
    next(err)
  }
})

// PUT /api/rapports/:id
router.put('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    const { date, motif, bilan, echantillons = [] } = req.body

    const existing = await prisma.rapport.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Rapport non trouvé' })
    }
    if (existing.idVisiteur !== req.visiteur.id) {
      return res.status(403).json({ error: 'Accès refusé' })
    }

    const rapport = await prisma.$transaction(async (tx) => {
      const updated = await tx.rapport.update({
        where: { id },
        data: { date: new Date(date), motif, bilan }
      })

      await tx.offrir.deleteMany({ where: { idRapport: id } })

      if (echantillons.length > 0) {
        await tx.offrir.createMany({
          data: echantillons.map(e => ({
            idRapport: id,
            idMedicament: e.idMedicament,
            quantite: e.quantite
          }))
        })
      }

      return updated
    })

    res.json({
      rapport: { id: rapport.id, date: rapport.date, motif: rapport.motif, bilan: rapport.bilan }
    })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/rapports/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)

    const existing = await prisma.rapport.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Rapport non trouvé' })
    }
    if (existing.idVisiteur !== req.visiteur.id) {
      return res.status(403).json({ error: 'Accès refusé' })
    }

    await prisma.$transaction(async (tx) => {
      await tx.offrir.deleteMany({ where: { idRapport: id } })
      await tx.rapport.delete({ where: { id } })
    })

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

module.exports = router
