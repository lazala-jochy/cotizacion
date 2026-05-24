const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

module.exports = { authMiddleware };
