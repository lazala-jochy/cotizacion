const express = require('express');
const cors = require('cors');
const path = require('path');
const { PORT, EMISOR } = require('./config');

require('./db');

const authRoutes = require('./routes/auth');
const clientsRoutes = require('./routes/clients');
const quotesRoutes = require('./routes/quotes');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, version: require('../package.json').version });
});

app.get('/api/emisor', (_req, res) => {
  res.json(EMISOR);
});

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/quotes', quotesRoutes);

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const index = path.join(distPath, 'index.html');
  res.sendFile(index, (err) => {
    if (err) next();
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor en http://127.0.0.1:${PORT}`);
});

module.exports = app;
