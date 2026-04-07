const request = require('supertest')
const jwt = require('jsonwebtoken')

jest.mock('../src/lib/prisma', () => ({
  session: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $queryRaw: jest.fn(),
  rapport: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  medecin: { findUnique: jest.fn() },
  offrir: { createMany: jest.fn(), deleteMany: jest.fn() },
  $transaction: jest.fn(cb => cb({
    rapport: { create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    offrir: { createMany: jest.fn(), deleteMany: jest.fn() },
  })),
}))

const prisma = require('../src/lib/prisma')
const app = require('../src/app')

const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_production'

function authCookie(role = 'visiteur') {
  const token = jwt.sign(
    { id: role === 'commercial' ? 'sc01' : 'ab00', sessionId: 'test-session' },
    JWT_SECRET
  )
  return `token=${token}`
}

function mockSession(role = 'visiteur') {
  const id = role === 'commercial' ? 'sc01' : 'ab00'
  prisma.session.findUnique.mockResolvedValue({
    id: 'test-session', is_active: true, expires_at: new Date(Date.now() + 60000),
    visiteur: { id, nom: 'Test', prenom: 'User', cp: '75001', role },
  })
}

// ─── COMMERCIAL STATS ─────────────────────────────────────────

describe('GET /api/commercial/stats', () => {
  afterEach(() => jest.clearAllMocks())

  it('should return 403 for visiteur role', async () => {
    mockSession('visiteur')
    const res = await request(app)
      .get('/api/commercial/stats')
      .set('Cookie', authCookie('visiteur'))
    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/commercial/)
  })

  it('should return 200 with stats for commercial role', async () => {
    mockSession('commercial')
    prisma.$queryRaw.mockResolvedValue([
      { specialite: 'HOMEOPATHIE', nbRapports: BigInt(15) },
      { specialite: 'ALLERGOLOGIE', nbRapports: BigInt(8) },
    ])

    const res = await request(app)
      .get('/api/commercial/stats')
      .set('Cookie', authCookie('commercial'))
    expect(res.status).toBe(200)
    expect(res.body.stats).toHaveLength(2)
    expect(res.body.stats[0]).toEqual({ rang: 1, specialite: 'HOMEOPATHIE', nbRapports: 15 })
    expect(res.body.stats[1]).toEqual({ rang: 2, specialite: 'ALLERGOLOGIE', nbRapports: 8 })
  })

  it('should return empty array when no data', async () => {
    mockSession('commercial')
    prisma.$queryRaw.mockResolvedValue([])

    const res = await request(app)
      .get('/api/commercial/stats')
      .set('Cookie', authCookie('commercial'))
    expect(res.status).toBe(200)
    expect(res.body.stats).toEqual([])
  })
})

// ─── RAPPORTS BLOCKED FOR COMMERCIAL ──────────────────────────

describe('Rapports blocked for commercial users', () => {
  afterEach(() => jest.clearAllMocks())

  it('should return 403 on GET /api/rapports for commercial', async () => {
    mockSession('commercial')
    const res = await request(app)
      .get('/api/rapports')
      .set('Cookie', authCookie('commercial'))
    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/visiteurs/)
  })

  it('should return 403 on POST /api/rapports for commercial', async () => {
    mockSession('commercial')
    const res = await request(app)
      .post('/api/rapports')
      .set('Cookie', authCookie('commercial'))
      .send({ idMedecin: 1, date: '2024-01-01', motif: 'test', bilan: 'ok' })
    expect(res.status).toBe(403)
  })

  it('should return 403 on DELETE /api/rapports/:id for commercial', async () => {
    mockSession('commercial')
    const res = await request(app)
      .delete('/api/rapports/1')
      .set('Cookie', authCookie('commercial'))
    expect(res.status).toBe(403)
  })
})
