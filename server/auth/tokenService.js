const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../db');
const {
  JWT_SECRET,
  JWT_ACCESS_EXPIRES,
  JWT_REFRESH_EXPIRES,
} = require('../config');

const REFRESH_MS = parseDurationMs(JWT_REFRESH_EXPIRES, 30 * 24 * 60 * 60 * 1000);

function parseDurationMs(value, fallback) {
  const raw = String(value || '').trim();
  const m = raw.match(/^(\d+)([smhd])$/i);
  if (!m) return fallback;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  if (unit === 's') return n * 1000;
  if (unit === 'm') return n * 60 * 1000;
  if (unit === 'h') return n * 60 * 60 * 1000;
  return n * 24 * 60 * 60 * 1000;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

function getUserById(id) {
  const row = db.prepare('SELECT id, nombre, email FROM users WHERE id = ?').get(id);
  if (!row) return null;
  return { id: row.id, nombre: row.nombre, email: row.email };
}

function createAccessToken(user) {
  return jwt.sign({ id: user.id, email: user.email, type: 'access' }, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES,
  });
}

function storeRefreshToken(userId, rawToken) {
  const expiresAt = new Date(Date.now() + REFRESH_MS).toISOString();
  db.prepare(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
  ).run(userId, hashToken(rawToken), expiresAt);
}

function issueTokenPair(user) {
  const normalizedUser = {
    id: Number(user.id),
    nombre: user.nombre,
    email: user.email,
  };
  const accessToken = createAccessToken(normalizedUser);
  const refreshToken = generateRefreshToken();
  storeRefreshToken(normalizedUser.id, refreshToken);
  return {
    user: normalizedUser,
    accessToken,
    refreshToken,
    token: accessToken,
  };
}

function isRefreshExpired(row) {
  return !row?.expires_at || new Date(row.expires_at) < new Date();
}

function revokeRefreshTokenById(id, replacedByHash = null) {
  db.prepare(
    `UPDATE refresh_tokens
     SET revoked_at = datetime('now'), replaced_by = COALESCE(?, replaced_by)
     WHERE id = ? AND revoked_at IS NULL`
  ).run(replacedByHash, id);
}

function rotateRefreshToken(rawRefreshToken) {
  const hash = hashToken(rawRefreshToken);
  const row = db
    .prepare(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = ? AND revoked_at IS NULL`
    )
    .get(hash);

  if (!row || isRefreshExpired(row)) {
    if (row) revokeRefreshTokenById(row.id);
    return null;
  }

  const user = getUserById(row.user_id);
  if (!user) {
    revokeRefreshTokenById(row.id);
    return null;
  }

  const newRefreshToken = generateRefreshToken();
  const newHash = hashToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_MS).toISOString();

  const rotate = db.transaction(() => {
    revokeRefreshTokenById(row.id, newHash);
    db.prepare(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
    ).run(user.id, newHash, expiresAt);
  });
  rotate();

  const accessToken = createAccessToken(user);
  return {
    user,
    accessToken,
    refreshToken: newRefreshToken,
    token: accessToken,
  };
}

function revokeRefreshToken(rawRefreshToken) {
  if (!rawRefreshToken) return;
  const hash = hashToken(rawRefreshToken);
  const row = db.prepare('SELECT id FROM refresh_tokens WHERE token_hash = ?').get(hash);
  if (row) revokeRefreshTokenById(row.id);
}

function revokeAllUserRefreshTokens(userId) {
  db.prepare(
    `UPDATE refresh_tokens SET revoked_at = datetime('now')
     WHERE user_id = ? AND revoked_at IS NULL`
  ).run(userId);
}

module.exports = {
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  hashToken,
  createAccessToken,
};
