const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

module.exports = async function auth(req, res, next) {
  const token = req.cookies?.token
  if (!token) {
    return res.status(401).json({ error: 'Non authentifié' })
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)

    // Validate server-side session and load visiteur
    if (payload.sessionId) {
      const session = await prisma.session.findUnique({
        where: { id: payload.sessionId },
        include: { visiteur: true },
      })
      if (!session || !session.is_active || new Date(session.expires_at) < new Date()) {
        if (session && session.is_active && new Date(session.expires_at) < new Date()) {
          await prisma.session.update({ where: { id: session.id }, data: { is_active: false } })
        }
        res.cookie('token', '', { httpOnly: true, sameSite: 'lax', secure: true, maxAge: 0 })
        return res.status(401).json({ error: 'Session expirée' })
      }
      const v = session.visiteur
      req.visiteur = { id: v.id, nom: v.nom, prenom: v.prenom, cp: v.cp }
    } else {
      // Legacy token without sessionId — reject
      return res.status(401).json({ error: 'Non authentifié' })
    }

    next()
  } catch {
    return res.status(401).json({ error: 'Non authentifié' })
  }
}
