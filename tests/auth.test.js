// tests/auth.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.JWT_SECRET = 'testsecret';
  app = require('../server');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

afterEach(async () => {
  const collections = Object.keys(mongoose.connection.collections);
  for (const c of collections) {
    await mongoose.connection.collections[c].deleteMany({});
  }
});

test('POST /auth/register crea usuario y devuelve token', async () => {
  const payload = { name: 'Juan', email: 'juan@test.com', password: 'passwd123' };
  const res = await request(app).post('/auth/register').send(payload);
  expect(res.status).toBe(201);
  expect(res.body).toHaveProperty('token');
  expect(res.body).toHaveProperty('user');
  expect(res.body.user.email).toBe(payload.email);
});

test('POST /auth/login devuelve token con credenciales correctas', async () => {
  const payload = { name: 'Luisa', email: 'luisa@test.com', password: 'mipass' };
  // registrar primero
  const r1 = await request(app).post('/auth/register').send(payload);
  expect(r1.status).toBe(201);

  // login
  const r2 = await request(app).post('/auth/login').send({ email: payload.email, password: payload.password });
  expect(r2.status).toBe(200);
  expect(r2.body).toHaveProperty('token');
});

test('POST /auth/login falla con password incorrecto', async () => {
  const payload = { name: 'Paco', email: 'paco@test.com', password: 'correcto' };
  await request(app).post('/auth/register').send(payload);

  const res = await request(app).post('/auth/login').send({ email: payload.email, password: 'mal' });
  expect(res.status).toBe(401);
});
