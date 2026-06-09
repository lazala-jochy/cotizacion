const { randomUUID } = require('crypto');

const MAX_DATASETS = 20;
const TTL_MS = 60 * 60 * 1000;
const store = new Map();

function prune() {
  const now = Date.now();
  for (const [id, entry] of store.entries()) {
    if (now - entry.createdAt > TTL_MS) store.delete(id);
  }
  if (store.size <= MAX_DATASETS) return;
  const sorted = [...store.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
  while (store.size > MAX_DATASETS && sorted.length) {
    const [id] = sorted.shift();
    store.delete(id);
  }
}

function saveDataset({ userId, fileName, schema, records, sheets }) {
  prune();
  const id = randomUUID();
  store.set(id, {
    id,
    userId,
    fileName,
    schema,
    records,
    sheets,
    createdAt: Date.now(),
  });
  return id;
}

function getDataset(id, userId) {
  const entry = store.get(id);
  if (!entry) return null;
  if (userId && entry.userId && entry.userId !== userId) return null;
  if (Date.now() - entry.createdAt > TTL_MS) {
    store.delete(id);
    return null;
  }
  return entry;
}

function clearDataset(id) {
  store.delete(id);
}

module.exports = { saveDataset, getDataset, clearDataset };
