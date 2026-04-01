const { Router } = require('express')
const prisma = require('../lib/prisma')

const router = Router()

// GET /api/medicaments
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query

    const where = search
      ? {
          OR: [
            { nomCommercial: { contains: search } },
            { famille: { libelle: { contains: search } } }
          ]
        }
      : {}

    const results = await prisma.medicament.findMany({
      where,
      include: { famille: { select: { libelle: true } } }
    })

    const medicaments = results.map(m => ({
      id: m.id,
      nomCommercial: m.nomCommercial,
      libelle: m.famille.libelle,
      idFamille: m.idFamille
    }))

    res.json({ medicaments })
  } catch (err) {
    next(err)
  }
})

// GET /api/medicaments/:id
router.get('/:id', async (req, res, next) => {
  try {
    const m = await prisma.medicament.findUnique({
      where: { id: req.params.id },
      include: { famille: { select: { libelle: true } } }
    })

    if (!m) {
      return res.status(404).json({ error: 'Médicament non trouvé' })
    }

    res.json({
      medicament: {
        id: m.id,
        nomCommercial: m.nomCommercial,
        idFamille: m.idFamille,
        libelle: m.famille.libelle,
        composition: m.composition,
        effets: m.effets,
        contreIndications: m.contreIndications
      }
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
