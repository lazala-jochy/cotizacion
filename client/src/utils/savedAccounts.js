const STORAGE_KEY = 'cotizaciones-saved-accounts';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function encodeSecret(value) {
  try {
    return btoa(unescape(encodeURIComponent(value)));
  } catch {
    return value;
  }
}

function decodeSecret(value) {
  try {
    return decodeURIComponent(escape(atob(value)));
  } catch {
    return '';
  }
}

export function listSavedAccounts() {
  return readAll()
    .map((item) => ({
      id: item.id,
      email: item.email,
      nombre: item.nombre || item.email,
      rememberPassword: Boolean(item.passwordEnc),
      lastUsedAt: item.lastUsedAt || 0,
    }))
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt);
}

export function getSavedAccount(id) {
  const row = readAll().find((item) => item.id === id);
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    nombre: row.nombre || row.email,
    password: row.passwordEnc ? decodeSecret(row.passwordEnc) : '',
    rememberPassword: Boolean(row.passwordEnc),
    lastUsedAt: row.lastUsedAt || 0,
  };
}

export function saveAccountAfterLogin({ user, password, rememberPassword }) {
  const email = String(user?.email || '').trim().toLowerCase();
  if (!email) return;

  const list = readAll();
  const now = Date.now();
  const existing = list.find((item) => item.email === email);
  const entry = {
    id: existing?.id || `acc-${now}-${Math.random().toString(36).slice(2, 9)}`,
    email,
    nombre: user?.nombre || email,
    lastUsedAt: now,
    passwordEnc: rememberPassword && password ? encodeSecret(password) : null,
  };

  const next = list.filter((item) => item.email !== email);
  next.push(entry);
  writeAll(next);
  return entry.id;
}

export function removeSavedAccount(id) {
  writeAll(readAll().filter((item) => item.id !== id));
}

export function getAccountInitials(nombre, email) {
  const source = String(nombre || email || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}
