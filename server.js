require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/miapp';
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> console.log('MongoDB conectado'))
  .catch(err => console.error('MongoDB error:', err));

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

app.get('/', (req,res)=> res.send('Hola desde mi-app!'));

app.post('/users', async (req,res)=>{
  try {
    const u = new User(req.body);
    await u.save();
    res.status(201).json(u);
  } catch(err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/users', async (req,res)=>{
  const users = await User.find().limit(100);
  res.json(users);
});

app.get('/users/:id', async (req,res)=>{
  const u = await User.findById(req.params.id);
  if(!u) return res.status(404).json({ error: 'No encontrado' });
  res.json(u);
});

app.delete('/users/:id', async (req,res)=>{
  await User.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Server en puerto ${PORT}`));
