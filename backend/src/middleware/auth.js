const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

module.exports = async function auth(req, res, next) {
  const token = req.cookies?.token
  if (!token) {
    return res.status(401).json({ error: 'Non authentifié' })
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)

    // Validate server-side session
    if (payload.sessionId) {
      const session = await prisma.session.findUnique({ where: { id: payload.sessionId } })
      if (!session || !session.is_active || new Date(session.expires_at) < new Date()) {
        // Invalidate expired session
        if (session && session.is_active && new Date(session.expires_at) < new Date()) {
          await prisma.session.update({ where: { id: session.id }, data: { is_active: false } })
        }
        res.cookie('token', '', { httpOnly: true, sameSite: 'lax', maxAge: 0 })
        return res.status(401).json({ error: 'Session expirée' })
      }
    }

    req.visiteur = { id: payload.id, nom: payload.nom, prenom: payload.prenom, cp: payload.cp }
    next()
  } catch {
    return res.status(401).json({ error: 'Non authentifié' })
  }
}
