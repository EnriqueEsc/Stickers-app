// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
}));

app.use(express.json());

// Conexión a MongoDB: se conecta usando process.env.MONGODB_URI
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/miapp';
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> console.log('MongoDB conectado'))
  .catch(err => console.error('MongoDB error:', err));

// Schema y modelo
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  password: { type: String }, // password opcional para endpoints /users; requerido por /auth/register
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Helpers
const JWT_SECRET = process.env.JWT_SECRET || 'cambia_esto_en_produccion';
function signToken(user) {
  return jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

// Rutas públicas
app.get('/', (req,res) => res.send('Hola desde mi-app!'));

// CRUD simple de usuarios (sin auth) — mantiene compatibilidad con lo que ya tienes
app.post('/users', async (req,res) => {
  try {
    const u = new User(req.body);
    await u.save();
    // no devolvemos password
    const obj = u.toObject();
    delete obj.password;
    res.status(201).json(obj);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/users', async (req,res) => {
  const users = await User.find().limit(100).select('-password');
  res.json(users);
});

app.get('/users/:id', async (req,res) => {
  const u = await User.findById(req.params.id).select('-password');
  if (!u) return res.status(404).json({ error: 'No encontrado' });
  res.json(u);
});

app.delete('/users/:id', async (req,res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// --- Autenticación ---
// Register: guarda usuario con password hasheada y devuelve token
app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y password requeridos' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email ya registrado' });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed });
    await user.save();

    const token = signToken(user);
    const userObj = user.toObject(); delete userObj.password;

    res.status(201).json({ token, user: userObj });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login: valida credenciales y devuelve token
app.post('/auth/login', async (req,res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y password requeridos' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const ok = await bcrypt.compare(password, user.password || '');
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = signToken(user);
    const userObj = user.toObject(); delete userObj.password;

    res.json({ token, user: userObj });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export app para testing; solo arrancar servidor si se ejecuta directamente
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server en puerto ${PORT}`));
}

module.exports = app;
