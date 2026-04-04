const request = require('supertest')
const jwt = require('jsonwebtoken')

jest.mock('../src/lib/prisma', () => ({
  medecin: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  rapport: { findMany: jest.fn(), deleteMany: jest.fn() },
  offrir: { deleteMany: jest.fn() },
  session: {
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(cb => cb({
    offrir: { deleteMany: jest.fn() },
    rapport: { deleteMany: jest.fn() },
    medecin: { delete: jest.fn() },
  })),
}))

const prisma = require('../src/lib/prisma')
const app = require('../src/app')

function authCookie() {
  const token = jwt.sign(
    { id: 'ab00', nom: 'Test', prenom: 'User', cp: '75001' },
    process.env.JWT_SECRET || 'change_me_in_production'
  )
  return `token=${token}`
}

describe('PATCH /api/medecins/:id — validation', () => {
  afterEach(() => jest.clearAllMocks())

  it('should return 400 if adresse is missing', async () => {
    const res = await request(app)
      .patch('/api/medecins/1')
      .set('Cookie', authCookie())
      .send({ tel: '0123456789' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/adresse/)
  })

  it('should return 400 if adresse too long', async () => {
    const res = await request(app)
      .patch('/api/medecins/1')
      .set('Cookie', authCookie())
      .send({ adresse: 'A'.repeat(81) })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/80/)
  })

  it('should return 400 if tel has invalid characters', async () => {
    const res = await request(app)
      .patch('/api/medecins/1')
      .set('Cookie', authCookie())
      .send({ adresse: '1 rue Test', tel: 'abc!!' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalides/)
  })

  it('should return 200 on valid update', async () => {
    prisma.medecin.update.mockResolvedValue({
      id: 1, nom: 'M', prenom: 'P', adresse: '1 rue Test', tel: '0123456789', specialitecomplementaire: null
    })
    const res = await request(app)
      .patch('/api/medecins/1')
      .set('Cookie', authCookie())
      .send({ adresse: '1 rue Test', tel: '0123456789' })
    expect(res.status).toBe(200)
    expect(res.body.medecin.adresse).toBe('1 rue Test')
  })
})

describe('DELETE /api/medecins/:id', () => {
  afterEach(() => jest.clearAllMocks())

  it('should return 404 if medecin not found', async () => {
    prisma.medecin.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .delete('/api/medecins/999')
      .set('Cookie', authCookie())
    expect(res.status).toBe(404)
  })

  it('should return 200 on successful delete', async () => {
    prisma.medecin.findUnique.mockResolvedValue({ id: 1 })
    const res = await request(app)
      .delete('/api/medecins/1')
      .set('Cookie', authCookie())
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

describe('Auth middleware', () => {
  it('should return 401 if no cookie', async () => {
    const res = await request(app).get('/api/medecins')
    expect(res.status).toBe(401)
  })

  it('should return 401 if invalid token', async () => {
    const res = await request(app)
      .get('/api/medecins')
      .set('Cookie', 'token=invalidtoken')
    expect(res.status).toBe(401)
  })
})

describe('GET /api/health', () => {
  it('should return ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})
