require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')

const authRouter = require('./routes/auth')

const app = express()

app.use(cors({ origin: 'http://localhost:4200', credentials: true }))
app.use(cookieParser())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRouter)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Erreur serveur' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`)
})
