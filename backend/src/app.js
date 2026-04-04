require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')

const authRouter = require('./routes/auth')
const medecinRouter = require('./routes/medecins')
const rapportRouter = require('./routes/rapports')
const medicamentRouter = require('./routes/medicaments')
const dashboardRouter = require('./routes/dashboard')
const authMiddleware = require('./middleware/auth')

const app = express()

app.use(cors({ origin: ['http://localhost:4200', 'https://localhost:4200'], credentials: true }))
app.use(cookieParser())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRouter)
app.use('/api/medecins',    authMiddleware, medecinRouter)
app.use('/api/rapports',    authMiddleware, rapportRouter)
app.use('/api/medicaments', authMiddleware, medicamentRouter)
app.use('/api/dashboard',   authMiddleware, dashboardRouter)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Erreur serveur' })
})

module.exports = app
