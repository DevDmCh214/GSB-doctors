const request = require('supertest')
const bcrypt = require('bcrypt')

// Mock prisma before requiring app
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

describe('POST /api/auth/login', () => {
  afterEach(() => jest.clearAllMocks())

  it('should return 401 if user not found', async () => {
    prisma.visiteur.findFirst.mockResolvedValue(null)
    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'nobody', mdp: 'test' })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Identifiants incorrects')
  })

  it('should return 401 if password is wrong', async () => {
    const hash = await bcrypt.hash('correct', 10)
    prisma.visiteur.findFirst.mockResolvedValue({ id: 'ab00', nom: 'A', prenom: 'B', mdp: hash, cp: '75001', role: 'visiteur' })
    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'user', mdp: 'wrong' })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Identifiants incorrects')
  })

  it('should return 200 and set cookie on valid login', async () => {
    const hash = await bcrypt.hash('correct', 10)
    prisma.visiteur.findFirst.mockResolvedValue({ id: 'ab00', nom: 'A', prenom: 'B', mdp: hash, cp: '75001', role: 'visiteur' })
    prisma.session.create.mockResolvedValue({ id: 'test-session-id' })
    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'user', mdp: 'correct' })
    expect(res.status).toBe(200)
    expect(res.body.visiteur).toHaveProperty('id', 'ab00')
    expect(res.headers['set-cookie']).toBeDefined()
    expect(prisma.session.create).toHaveBeenCalled()
  })
})

describe('POST /api/auth/register', () => {
  afterEach(() => jest.clearAllMocks())

  it('should return 400 if nom is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ prenom: 'Jean', login: 'jd', mdp: 'Test123!' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/nom/)
  })

  it('should return 400 if prenom is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Dupont', login: 'jd', mdp: 'Test123!' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/prénom/)
  })

  it('should return 400 if password too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Dupont', prenom: 'Jean', login: 'jd', mdp: 'Ab1!' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/8 caractères/)
  })

  it('should return 400 if password has no lowercase', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Dupont', prenom: 'Jean', login: 'jd', mdp: 'ABCD1234!' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/minuscule/)
  })

  it('should return 400 if password has no uppercase', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Dupont', prenom: 'Jean', login: 'jd', mdp: 'abcd1234!' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/majuscule/)
  })

  it('should return 400 if password has no digit', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Dupont', prenom: 'Jean', login: 'jd', mdp: 'Abcdefgh!' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/chiffre/)
  })

  it('should return 400 if password has no special character', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Dupont', prenom: 'Jean', login: 'jd', mdp: 'Abcdefg1' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/spécial/)
  })

  it('should return 400 if code postal is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Dupont', prenom: 'Jean', login: 'jd', mdp: 'Test123!', cp: '123' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/5 chiffres/)
  })

  it('should return 400 if login already taken', async () => {
    prisma.visiteur.findFirst.mockResolvedValue({ id: 'ab00' })
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Dupont', prenom: 'Jean', login: 'existing', mdp: 'Test123!' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/pseudo/)
  })

  it('should return 201 on successful registration', async () => {
    prisma.visiteur.findFirst.mockResolvedValue(null) // login not taken
    prisma.visiteur.findUnique.mockResolvedValue(null) // id not taken
    prisma.visiteur.create.mockResolvedValue({
      id: 'dj00', nom: 'Dupont', prenom: 'Jean', cp: '75001'
    })
    prisma.session.create.mockResolvedValue({ id: 'test-session-id' })
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Dupont', prenom: 'Jean', login: 'jdupont', mdp: 'Test123!', cp: '75001' })
    expect(res.status).toBe(201)
    expect(res.body.visiteur).toHaveProperty('id', 'dj00')
    expect(prisma.session.create).toHaveBeenCalled()
  })

  it('should return 201 with only required fields (no optional info)', async () => {
    prisma.visiteur.findFirst.mockResolvedValue(null)
    prisma.visiteur.findUnique.mockResolvedValue(null)
    prisma.visiteur.create.mockResolvedValue({
      id: 'dj00', nom: 'Dupont', prenom: 'Jean', cp: null
    })
    prisma.session.create.mockResolvedValue({ id: 'test-session-id' })
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Dupont', prenom: 'Jean', login: 'jdupont', mdp: 'Test123!' })
    expect(res.status).toBe(201)
    expect(res.body.visiteur).toHaveProperty('id', 'dj00')
  })

  it('should return 400 if nom too long', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'A'.repeat(31), prenom: 'Jean', login: 'jd', mdp: 'Test123!' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/nom.*30/)
  })
})
