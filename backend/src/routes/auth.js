const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const prisma = require('../lib/prisma')
const auth = require('../middleware/auth')

const router = express.Router()

const SESSION_DURATION_MIN = 30
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_SECONDS = 30

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: SESSION_DURATION_MIN * 60 * 1000,
}

function getClientIp(req) {
  return req.ip || req.connection?.remoteAddress || '0.0.0.0'
}

function signAndSetCookie(res, visiteur, sessionId) {
  const payload = { id: visiteur.id, nom: visiteur.nom, prenom: visiteur.prenom, cp: visiteur.cp, sessionId }
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: `${SESSION_DURATION_MIN}m` })
  res.cookie('token', token, COOKIE_OPTIONS)
  return { id: visiteur.id, nom: visiteur.nom, prenom: visiteur.prenom, cp: visiteur.cp }
}

async function checkRateLimit(ip) {
  const windowStart = new Date(Date.now() - LOCKOUT_SECONDS * 1000)

  // Count recent failed attempts from this IP
  const recentFailed = await prisma.connexions.count({
    where: {
      ip_address: ip,
      success: false,
      attempted_at: { gte: windowStart },
    },
  })

  if (recentFailed >= MAX_FAILED_ATTEMPTS) {
    // Find the most recent failed attempt to calculate remaining lockout
    const lastFailed = await prisma.connexions.findFirst({
      where: {
        ip_address: ip,
        success: false,
        attempted_at: { gte: windowStart },
      },
      orderBy: { attempted_at: 'desc' },
    })

    if (lastFailed) {
      const unlockAt = new Date(lastFailed.attempted_at.getTime() + LOCKOUT_SECONDS * 1000)
      const remainingMs = unlockAt.getTime() - Date.now()
      if (remainingMs > 0) {
        return { locked: true, remainingSeconds: Math.ceil(remainingMs / 1000) }
      }
    }
  }

  return { locked: false, remainingSeconds: 0 }
}

async function recordAttempt(ip, visiteurId, success) {
  await prisma.connexions.create({
    data: {
      ip_address: ip,
      id_visiteur: visiteurId,
      success,
    },
  })
}

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const ip = getClientIp(req)

    // Check rate limit
    const rateLimit = await checkRateLimit(ip)
    if (rateLimit.locked) {
      return res.status(429).json({
        error: `Trop de tentatives. Réessayez dans ${rateLimit.remainingSeconds} secondes.`,
        remainingSeconds: rateLimit.remainingSeconds,
      })
    }

    const { login, mdp } = req.body
    const visiteur = await prisma.visiteur.findFirst({ where: { login } })
    if (!visiteur) {
      await recordAttempt(ip, null, false)
      return res.status(401).json({ error: 'Identifiants incorrects' })
    }
    const match = await bcrypt.compare(mdp, visiteur.mdp)
    if (!match) {
      await recordAttempt(ip, visiteur.id, false)

      // Check if this attempt triggers lockout
      const newRateLimit = await checkRateLimit(ip)
      if (newRateLimit.locked) {
        return res.status(429).json({
          error: `Trop de tentatives. Réessayez dans ${newRateLimit.remainingSeconds} secondes.`,
          remainingSeconds: newRateLimit.remainingSeconds,
        })
      }
      return res.status(401).json({ error: 'Identifiants incorrects' })
    }

    // Record successful attempt
    await recordAttempt(ip, visiteur.id, true)

    // Create server-side session
    const sessionId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MIN * 60 * 1000)
    await prisma.session.create({
      data: {
        id: sessionId,
        id_visiteur: visiteur.id,
        ip_address: ip,
        expires_at: expiresAt,
      },
    })

    const payload = signAndSetCookie(res, visiteur, sessionId)
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
    if (!mdp || mdp.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' })
    }
    if (!/[a-z]/.test(mdp)) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins une lettre minuscule.' })
    }
    if (!/[A-Z]/.test(mdp)) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins une lettre majuscule.' })
    }
    if (!/[0-9]/.test(mdp)) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins un chiffre.' })
    }
    if (!/[^a-zA-Z0-9]/.test(mdp)) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins un caractère spécial.' })
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

    // Create session for the newly registered user
    const ip = getClientIp(req)
    const sessionId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MIN * 60 * 1000)
    await prisma.session.create({
      data: {
        id: sessionId,
        id_visiteur: visiteur.id,
        ip_address: ip,
        expires_at: expiresAt,
      },
    })

    const payload = signAndSetCookie(res, visiteur, sessionId)
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
router.post('/logout', auth, async (req, res) => {
  try {
    // Invalidate the server-side session
    const token = req.cookies?.token
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      if (payload.sessionId) {
        await prisma.session.update({
          where: { id: payload.sessionId },
          data: { is_active: false },
        })
      }
    }
  } catch {
    // Token may be invalid, proceed with cookie clearing
  }
  res.cookie('token', '', { httpOnly: true, sameSite: 'lax', maxAge: 0 })
  return res.status(200).json({ success: true })
})

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  return res.status(200).json({ visiteur: req.visiteur })
})

module.exports = router
