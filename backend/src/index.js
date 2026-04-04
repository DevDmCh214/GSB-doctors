const https = require('https')
const fs = require('fs')
const path = require('path')
const app = require('./app')

const PORT = process.env.PORT || 3001

const certDir = path.join(__dirname, '../../certs')
const key = fs.readFileSync(path.join(certDir, 'key.pem'))
const cert = fs.readFileSync(path.join(certDir, 'cert.pem'))

https.createServer({ key, cert }, app).listen(PORT, () => {
  console.log(`Backend running on https://localhost:${PORT}`)
})
