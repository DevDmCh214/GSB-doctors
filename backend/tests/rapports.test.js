const request = require('supertest')
const jwt = require('jsonwebtoken')

jest.mock('../src/lib/prisma', () => ({
  rapport: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  medecin: { findUnique: jest.fn() },
  offrir: { createMany: jest.fn(), deleteMany: jest.fn() },
  session: {
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(cb => cb({
    rapport: {
      create: jest.fn().mockResolvedValue({ id: 1, date: new Date(), motif: 'test', bilan: 'ok', idMedecin: 1 }),
      update: jest.fn().mockResolvedValue({ id: 1, date: new Date(), motif: 'updated', bilan: 'ok' }),
      delete: jest.fn(),
    },
    offrir: { createMany: jest.fn(), deleteMany: jest.fn() },
  })),
}))

const prisma = require('../src/lib/prisma')
const app = require('../src/app')

// Helper: generate a valid auth cookie
function authCookie() {
  const token = jwt.sign(
    { id: 'ab00', nom: 'Test', prenom: 'User', cp: '75001' },
    process.env.JWT_SECRET || 'change_me_in_production'
  )
  return `token=${token}`
}

describe('POST /api/rapports — validation', () => {
  afterEach(() => jest.clearAllMocks())

  it('should return 400 if idMedecin missing', async () => {
    const res = await request(app)
      .post('/api/rapports')
      .set('Cookie', authCookie())
      .send({ date: '2024-01-01', motif: 'test', bilan: 'ok' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/médecin/)
  })

  it('should return 400 if date missing', async () => {
    const res = await request(app)
      .post('/api/rapports')
      .set('Cookie', authCookie())
      .send({ idMedecin: 1, motif: 'test', bilan: 'ok' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/date/)
  })

  it('should return 400 if date invalid', async () => {
    const res = await request(app)
      .post('/api/rapports')
      .set('Cookie', authCookie())
      .send({ idMedecin: 1, date: 'not-a-date', motif: 'test', bilan: 'ok' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/)
  })

  it('should return 400 if motif missing', async () => {
    const res = await request(app)
      .post('/api/rapports')
      .set('Cookie', authCookie())
      .send({ idMedecin: 1, date: '2024-01-01', bilan: 'ok' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/motif/)
  })

  it('should return 400 if motif too long', async () => {
    const res = await request(app)
      .post('/api/rapports')
      .set('Cookie', authCookie())
      .send({ idMedecin: 1, date: '2024-01-01', motif: 'x'.repeat(101), bilan: 'ok' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/motif.*100/)
  })

  it('should return 400 if bilan missing', async () => {
    const res = await request(app)
      .post('/api/rapports')
      .set('Cookie', authCookie())
      .send({ idMedecin: 1, date: '2024-01-01', motif: 'test' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/bilan/)
  })

  it('should return 400 if echantillon has no quantite', async () => {
    const res = await request(app)
      .post('/api/rapports')
      .set('Cookie', authCookie())
      .send({
        idMedecin: 1, date: '2024-01-01', motif: 'test', bilan: 'ok',
        echantillons: [{ idMedicament: 'MED1', quantite: 0 }]
      })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/quantité positive/)
  })

  it('should return 404 if medecin not found', async () => {
    prisma.medecin.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .post('/api/rapports')
      .set('Cookie', authCookie())
      .send({ idMedecin: 999, date: '2024-01-01', motif: 'test', bilan: 'ok' })
    expect(res.status).toBe(404)
  })

  it('should return 201 on valid creation', async () => {
    prisma.medecin.findUnique.mockResolvedValue({ id: 1 })
    const res = await request(app)
      .post('/api/rapports')
      .set('Cookie', authCookie())
      .send({ idMedecin: 1, date: '2024-01-01', motif: 'test', bilan: 'ok' })
    expect(res.status).toBe(201)
    expect(res.body.rapport).toHaveProperty('id')
  })
})

describe('GET /api/rapports/:id', () => {
  afterEach(() => jest.clearAllMocks())

  it('should return 404 if rapport not found', async () => {
    prisma.rapport.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .get('/api/rapports/999')
      .set('Cookie', authCookie())
    expect(res.status).toBe(404)
  })

  it('should return 403 if not owner', async () => {
    prisma.rapport.findUnique.mockResolvedValue({
      id: 1, idVisiteur: 'xx99', date: new Date(), motif: 'test', bilan: 'ok',
      medecin: { id: 1, nom: 'M', prenom: 'P', specialitecomplementaire: null },
      offrir: []
    })
    const res = await request(app)
      .get('/api/rapports/1')
      .set('Cookie', authCookie())
    expect(res.status).toBe(403)
  })

  it('should return 200 with rapport detail for owner', async () => {
    prisma.rapport.findUnique.mockResolvedValue({
      id: 1, idVisiteur: 'ab00', date: new Date('2024-01-01'), motif: 'visite', bilan: 'ok',
      medecin: { id: 1, nom: 'Martin', prenom: 'Sophie', specialitecomplementaire: 'Cardio' },
      offrir: [{
        idMedicament: 'MED1',
        medicament: { nomCommercial: 'Doliprane', famille: { libelle: 'Antalgique' } },
        quantite: 3
      }]
    })
    const res = await request(app)
      .get('/api/rapports/1')
      .set('Cookie', authCookie())
    expect(res.status).toBe(200)
    expect(res.body.rapport.motif).toBe('visite')
    expect(res.body.echantillons).toHaveLength(1)
    expect(res.body.echantillons[0].quantite).toBe(3)
  })
})

describe('DELETE /api/rapports/:id', () => {
  afterEach(() => jest.clearAllMocks())

  it('should return 404 if rapport not found', async () => {
    prisma.rapport.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .delete('/api/rapports/999')
      .set('Cookie', authCookie())
    expect(res.status).toBe(404)
  })

  it('should return 403 if not owner', async () => {
    prisma.rapport.findUnique.mockResolvedValue({ id: 1, idVisiteur: 'xx99' })
    const res = await request(app)
      .delete('/api/rapports/1')
      .set('Cookie', authCookie())
    expect(res.status).toBe(403)
  })
})
