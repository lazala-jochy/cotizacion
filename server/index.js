const express = require('express');
const cors = require('cors');
const path = require('path');
const { PORT } = require('./config');

require('./db');

const authRoutes = require('./routes/auth');
const clientsRoutes = require('./routes/clients');
const quotesRoutes = require('./routes/quotes');
const emisorRoutes = require('./routes/emisor');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, version: require('../package.json').version });
});

app.use('/api/auth', authRoutes);
app.use('/api/emisor', emisorRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/quotes', quotesRoutes);

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const index = path.join(distPath, 'index.html');
  res.sendFile(index, (err) => {
    if (err) next(err);
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).send('Error del servidor');
});

function startServer() {
  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, '127.0.0.1', () => {
      console.log(`Servidor en http://127.0.0.1:${PORT}`);
      resolve(server);
    });
    server.on('error', reject);
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { app, startServer, PORT };
