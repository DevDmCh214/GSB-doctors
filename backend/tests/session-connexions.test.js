const request = require('supertest')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

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

const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_production'

function authCookie(sessionId = 'valid-session-id') {
  const token = jwt.sign(
    { id: 'ab00', sessionId },
    JWT_SECRET
  )
  return `token=${token}`
}

// ─── SESSION TESTS ───────────────────────────────────────────

describe('Session management', () => {
  afterEach(() => jest.clearAllMocks())

  it('should create a session on successful login', async () => {
    const hash = await bcrypt.hash('correct', 10)
    prisma.visiteur.findFirst.mockResolvedValue({ id: 'ab00', nom: 'A', prenom: 'B', mdp: hash, cp: '75001' })
    prisma.session.create.mockResolvedValue({ id: 'new-session-id' })
    prisma.connexions.count.mockResolvedValue(0)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'user', mdp: 'correct' })

    expect(res.status).toBe(200)
    expect(prisma.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id_visiteur: 'ab00',
          ip_address: expect.any(String),
        }),
      })
    )
  })

  it('should create a session on successful registration', async () => {
    prisma.visiteur.findFirst.mockResolvedValue(null)
    prisma.visiteur.findUnique.mockResolvedValue(null)
    prisma.visiteur.create.mockResolvedValue({ id: 'dj00', nom: 'Dupont', prenom: 'Jean', cp: '75001' })
    prisma.session.create.mockResolvedValue({ id: 'reg-session-id' })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Dupont', prenom: 'Jean', login: 'jdupont', mdp: 'Test123!', cp: '75001' })

    expect(res.status).toBe(201)
    expect(prisma.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id_visiteur: 'dj00',
        }),
      })
    )
  })

  it('should reject request if session is inactive', async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: 'valid-session-id',
      is_active: false,
      expires_at: new Date(Date.now() + 60000),
    })

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', authCookie())

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Session expirée')
  })

  it('should reject request if session is expired', async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: 'valid-session-id',
      is_active: true,
      expires_at: new Date(Date.now() - 60000), // expired 1 min ago
    })

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', authCookie())

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Session expirée')
    // Should deactivate the expired session
    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: 'valid-session-id' },
      data: { is_active: false },
    })
  })

  it('should allow request if session is active and not expired', async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: 'valid-session-id',
      is_active: true,
      expires_at: new Date(Date.now() + 60000),
      visiteur: { id: 'ab00', nom: 'Test', prenom: 'User', cp: '75001' },
    })

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', authCookie())

    expect(res.status).toBe(200)
    expect(res.body.visiteur).toHaveProperty('id', 'ab00')
  })

  it('should invalidate session on logout', async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: 'valid-session-id',
      is_active: true,
      expires_at: new Date(Date.now() + 60000),
      visiteur: { id: 'ab00', nom: 'Test', prenom: 'User', cp: '75001' },
    })
    prisma.session.update.mockResolvedValue({})

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', authCookie())

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: 'valid-session-id' },
      data: { is_active: false },
    })
  })
})

// ─── CONNEXIONS / RATE LIMITING TESTS ────────────────────────

describe('Connexions and rate limiting', () => {
  afterEach(() => jest.clearAllMocks())

  it('should record a failed login attempt', async () => {
    prisma.visiteur.findFirst.mockResolvedValue(null)
    prisma.connexions.count.mockResolvedValue(0)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'nobody', mdp: 'wrong' })

    expect(res.status).toBe(401)
    expect(prisma.connexions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: false,
          id_visiteur: null,
        }),
      })
    )
  })

  it('should record a failed attempt with visiteur id when password is wrong', async () => {
    const hash = await bcrypt.hash('correct', 10)
    prisma.visiteur.findFirst.mockResolvedValue({ id: 'ab00', nom: 'A', prenom: 'B', mdp: hash, cp: '75001' })
    prisma.connexions.count.mockResolvedValue(0)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'user', mdp: 'wrong' })

    expect(res.status).toBe(401)
    expect(prisma.connexions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: false,
          id_visiteur: 'ab00',
        }),
      })
    )
  })

  it('should record a successful login attempt', async () => {
    const hash = await bcrypt.hash('correct', 10)
    prisma.visiteur.findFirst.mockResolvedValue({ id: 'ab00', nom: 'A', prenom: 'B', mdp: hash, cp: '75001' })
    prisma.session.create.mockResolvedValue({ id: 'sess-id' })
    prisma.connexions.count.mockResolvedValue(0)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'user', mdp: 'correct' })

    expect(res.status).toBe(200)
    expect(prisma.connexions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: true,
          id_visiteur: 'ab00',
        }),
      })
    )
  })

  it('should return 429 when IP is locked out (5+ failed attempts)', async () => {
    // First checkRateLimit call returns locked
    prisma.connexions.count.mockResolvedValue(5)
    prisma.connexions.findFirst.mockResolvedValue({
      attempted_at: new Date(Date.now() - 5000), // 5 seconds ago
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'user', mdp: 'wrong' })

    expect(res.status).toBe(429)
    expect(res.body.error).toMatch(/Trop de tentatives/)
    expect(res.body.remainingSeconds).toBeGreaterThan(0)
    expect(res.body.remainingSeconds).toBeLessThanOrEqual(30)
  })

  it('should allow login after lockout expires', async () => {
    // Rate limit check returns not locked
    prisma.connexions.count.mockResolvedValue(0)

    const hash = await bcrypt.hash('correct', 10)
    prisma.visiteur.findFirst.mockResolvedValue({ id: 'ab00', nom: 'A', prenom: 'B', mdp: hash, cp: '75001' })
    prisma.session.create.mockResolvedValue({ id: 'sess-id' })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'user', mdp: 'correct' })

    expect(res.status).toBe(200)
  })

  it('should return 429 after wrong password triggers the 5th failed attempt', async () => {
    const hash = await bcrypt.hash('correct', 10)
    prisma.visiteur.findFirst.mockResolvedValue({ id: 'ab00', nom: 'A', prenom: 'B', mdp: hash, cp: '75001' })

    // First checkRateLimit: count=4 → not locked (findFirst not called)
    // Second checkRateLimit: count=5 → locked → findFirst returns recent attempt
    prisma.connexions.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(5)
    prisma.connexions.findFirst
      .mockResolvedValueOnce({ attempted_at: new Date() })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'user', mdp: 'wrong' })

    // After 5th failure, should return 429
    expect(res.status).toBe(429)
    expect(res.body.remainingSeconds).toBeGreaterThan(0)
  })
})
