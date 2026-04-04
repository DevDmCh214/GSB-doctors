const https = require('https')
const fs = require('fs')
const path = require('path')
const request = require('supertest')
const bcrypt = require('bcrypt')

jest.mock('../src/lib/prisma', () => ({
  visiteur: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  session: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  connexions: {
    count: jest.fn().mockResolvedValue(0),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
  },
}))

const prisma = require('../src/lib/prisma')
const app = require('../src/app')

describe('TLS certificates', () => {
  const certDir = path.join(__dirname, '../../certs')

  it('should have key.pem in certs/', () => {
    expect(fs.existsSync(path.join(certDir, 'key.pem'))).toBe(true)
  })

  it('should have cert.pem in certs/', () => {
    expect(fs.existsSync(path.join(certDir, 'cert.pem'))).toBe(true)
  })

  it('should have a valid PEM private key', () => {
    const key = fs.readFileSync(path.join(certDir, 'key.pem'), 'utf8')
    expect(key).toContain('-----BEGIN PRIVATE KEY-----')
    expect(key).toContain('-----END PRIVATE KEY-----')
  })

  it('should have a valid PEM certificate', () => {
    const cert = fs.readFileSync(path.join(certDir, 'cert.pem'), 'utf8')
    expect(cert).toContain('-----BEGIN CERTIFICATE-----')
    expect(cert).toContain('-----END CERTIFICATE-----')
  })

  it('should create an HTTPS server that responds', (done) => {
    const key = fs.readFileSync(path.join(certDir, 'key.pem'))
    const cert = fs.readFileSync(path.join(certDir, 'cert.pem'))

    const server = https.createServer({ key, cert }, app)
    server.listen(0, () => {
      const port = server.address().port
      // Use Node https.get with rejectUnauthorized: false for self-signed cert
      const req = https.get(
        `https://localhost:${port}/api/health`,
        { rejectUnauthorized: false },
        (res) => {
          let data = ''
          res.on('data', chunk => { data += chunk })
          res.on('end', () => {
            expect(res.statusCode).toBe(200)
            expect(JSON.parse(data)).toEqual({ ok: true })
            server.close(done)
          })
        }
      )
      req.on('error', (err) => { server.close(); done(err) })
    })
  })
})

describe('Secure cookie flag', () => {
  afterEach(() => jest.clearAllMocks())

  it('should set secure flag on login cookie', async () => {
    const hash = await bcrypt.hash('correct', 10)
    prisma.visiteur.findFirst.mockResolvedValue({ id: 'ab00', nom: 'A', prenom: 'B', mdp: hash, cp: '75001' })
    prisma.session.create.mockResolvedValue({ id: 'sess-id' })
    prisma.connexions.count.mockResolvedValue(0)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'user', mdp: 'correct' })

    expect(res.status).toBe(200)
    const cookies = res.headers['set-cookie']
    expect(cookies).toBeDefined()
    expect(cookies.some(c => c.toLowerCase().includes('secure'))).toBe(true)
  })

  it('should set httpOnly flag on login cookie', async () => {
    const hash = await bcrypt.hash('correct', 10)
    prisma.visiteur.findFirst.mockResolvedValue({ id: 'ab00', nom: 'A', prenom: 'B', mdp: hash, cp: '75001' })
    prisma.session.create.mockResolvedValue({ id: 'sess-id' })
    prisma.connexions.count.mockResolvedValue(0)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'user', mdp: 'correct' })

    const cookies = res.headers['set-cookie']
    expect(cookies.some(c => c.toLowerCase().includes('httponly'))).toBe(true)
  })

  it('should set secure flag on logout cookie clearing', async () => {
    const jwt = require('jsonwebtoken')
    const token = jwt.sign(
      { id: 'ab00', nom: 'A', prenom: 'B', cp: '75001', sessionId: 'sess-id' },
      process.env.JWT_SECRET || 'change_me_in_production'
    )
    prisma.session.findUnique.mockResolvedValue({
      id: 'sess-id', is_active: true, expires_at: new Date(Date.now() + 60000),
    })
    prisma.session.update.mockResolvedValue({})

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', `token=${token}`)

    expect(res.status).toBe(200)
    const cookies = res.headers['set-cookie']
    expect(cookies).toBeDefined()
    expect(cookies.some(c => c.toLowerCase().includes('secure'))).toBe(true)
  })
})
