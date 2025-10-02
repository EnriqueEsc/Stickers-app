
// tests/users.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  // ahora requerimos la app (que usará process.env.MONGODB_URI)
  app = require('../server');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

afterEach(async () => {
  // limpiar colecciones
  const collections = Object.keys(mongoose.connection.collections);
  for (const c of collections) {
    await mongoose.connection.collections[c].deleteMany({});
  }
});

test('GET / returns saludo', async () => {
  const res = await request(app).get('/');
  expect(res.status).toBe(200);
  expect(res.text).toMatch(/Hola desde mi-app/);
});

test('POST /users crea usuario y GET /users lo lista', async () => {
  const payload = { name: 'Ana', email: 'ana@example.com' };
  const res = await request(app).post('/users').send(payload);
  expect(res.status).toBe(201);
  expect(res.body.email).toBe(payload.email);
  // GET /users
  const list = await request(app).get('/users');
  expect(list.status).toBe(200);
  expect(Array.isArray(list.body)).toBe(true);
  expect(list.body.length).toBe(1);
  expect(list.body[0].email).toBe(payload.email);
});
