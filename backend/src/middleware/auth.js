const jwt = require('jsonwebtoken')

module.exports = function auth(req, res, next) {
  const token = req.cookies?.token
  if (!token) {
    return res.status(401).json({ error: 'Non authentifié' })
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.visiteur = { id: payload.id, nom: payload.nom, prenom: payload.prenom, cp: payload.cp }
    next()
  } catch {
    return res.status(401).json({ error: 'Non authentifié' })
  }
}
