const express = require('express');
const cors = require('cors');
const path = require('path');
const { PORT } = require('./config');

require('./db');
const { runDgiiStartupTasks } = require('./dgii/startup');
runDgiiStartupTasks();

const authRoutes = require('./routes/auth');
const clientsRoutes = require('./routes/clients');
const quotesRoutes = require('./routes/quotes');
const invoicesRoutes = require('./routes/invoices');
const fiscalRoutes = require('./routes/fiscal');
const dgiiRoutes = require('./routes/dgii');
const expensesRoutes = require('./routes/expenses');
const financeRoutes = require('./routes/finance');
const emisorRoutes = require('./routes/emisor');
const templatesRoutes = require('./routes/templates');
const publicRoutes = require('./routes/public');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, version: require('../package.json').version });
});

app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/emisor', emisorRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/fiscal', fiscalRoutes);
app.use('/api/dgii', dgiiRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/finance', financeRoutes);

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

let activeServer = null;

function startServer() {
  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, '127.0.0.1', () => {
      console.log(`Servidor en http://127.0.0.1:${PORT}`);
      activeServer = server;
      resolve(server);
    });
    server.on('error', reject);
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!activeServer) {
      resolve();
      return;
    }
    activeServer.close(() => {
      activeServer = null;
      resolve();
    });
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { app, startServer, stopServer, PORT };
