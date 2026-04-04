const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')
const auth = require('../middleware/auth')

const router = express.Router()

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
}

function signAndSetCookie(res, visiteur) {
  const payload = { id: visiteur.id, nom: visiteur.nom, prenom: visiteur.prenom, cp: visiteur.cp }
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' })
  res.cookie('token', token, COOKIE_OPTIONS)
  return payload
}

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { login, mdp } = req.body
    const visiteur = await prisma.visiteur.findFirst({ where: { login } })
    if (!visiteur) {
      return res.status(401).json({ error: 'Identifiants incorrects' })
    }
    const match = await bcrypt.compare(mdp, visiteur.mdp)
    if (!match) {
      return res.status(401).json({ error: 'Identifiants incorrects' })
    }
    const payload = signAndSetCookie(res, visiteur)
    return res.status(200).json({ visiteur: payload })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { nom, prenom, login, mdp, adresse, cp, ville, dateEmbauche } = req.body

    // Required fields
    if (!nom || !nom.trim()) {
      return res.status(400).json({ error: 'Le nom est requis.' })
    }
    if (!prenom || !prenom.trim()) {
      return res.status(400).json({ error: 'Le prénom est requis.' })
    }
    if (!login || !login.trim()) {
      return res.status(400).json({ error: 'Le pseudo est requis.' })
    }
    if (!mdp || mdp.length < 4) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 4 caractères.' })
    }

    // Field length validations (match DB column sizes)
    if (nom.trim().length > 30) {
      return res.status(400).json({ error: 'Le nom est trop long (30 caractères max).' })
    }
    if (prenom.trim().length > 30) {
      return res.status(400).json({ error: 'Le prénom est trop long (30 caractères max).' })
    }
    if (login.trim().length > 20) {
      return res.status(400).json({ error: 'Le pseudo est trop long (20 caractères max).' })
    }
    if (adresse && adresse.trim().length > 30) {
      return res.status(400).json({ error: 'L\'adresse est trop longue (30 caractères max).' })
    }

    // Code postal: exactly 5 digits
    if (cp && !/^\d{5}$/.test(cp.trim())) {
      return res.status(400).json({ error: 'Le code postal doit contenir exactement 5 chiffres.' })
    }

    // Ville
    if (ville && ville.trim().length > 30) {
      return res.status(400).json({ error: 'La ville est trop longue (30 caractères max).' })
    }

    const existing = await prisma.visiteur.findFirst({ where: { login } })
    if (existing) {
      return res.status(400).json({ error: 'Ce pseudo est déjà utilisé' })
    }

    // Generate id: first char of nom + first char of prenom + 2 digits, lowercased
    const base = ((nom?.[0] ?? 'x') + (prenom?.[0] ?? 'x')).toLowerCase()
    let id
    for (let i = 0; i <= 99; i++) {
      const digits = String(i).padStart(2, '0')
      const candidate = base + digits
      const taken = await prisma.visiteur.findUnique({ where: { id: candidate } })
      if (!taken) { id = candidate; break }
    }
    if (!id) {
      return res.status(500).json({ error: 'Impossible de générer un identifiant' })
    }

    const hash = await bcrypt.hash(mdp, 10)
    const visiteur = await prisma.visiteur.create({
      data: {
        id,
        nom: nom.trim(),
        prenom: prenom.trim(),
        login: login.trim(),
        mdp: hash,
        adresse: adresse ? adresse.trim() : null,
        cp: cp ? cp.trim() : null,
        ville: ville ? ville.trim() : null,
        dateEmbauche: dateEmbauche ? new Date(dateEmbauche) : null,
        timespan: 0,
      },
    })
    const payload = signAndSetCookie(res, visiteur)
    return res.status(201).json({ visiteur: payload })
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Ce pseudo est déjà utilisé.' })
    }
    if (err.code && err.code.startsWith('P')) {
      return res.status(400).json({ error: 'Données invalides. Vérifiez les champs du formulaire.' })
    }
    next(err)
  }
})

// POST /api/auth/logout
router.post('/logout', auth, (req, res) => {
  res.cookie('token', '', { httpOnly: true, sameSite: 'lax', maxAge: 0 })
  return res.status(200).json({ success: true })
})

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  return res.status(200).json({ visiteur: req.visiteur })
})

module.exports = router
