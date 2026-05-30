/**
 * @deprecated Use fiscalSequenceRepository. Mantiene compatibilidad con rutas legadas.
 */
const fiscalSequenceRepo = require('./fiscalSequenceRepository');

function listByUser(userId) {
  return fiscalSequenceRepo.listByUser(userId);
}

function getById(id, userId) {
  return fiscalSequenceRepo.getById(id, userId);
}

function getActiveRange(userId) {
  const all = fiscalSequenceRepo.listByUser(userId);
  return all.find((s) => s.is_active) || null;
}

function create(userId, data) {
  return fiscalSequenceRepo.create(userId, {
    fiscal_document_type_id: data.fiscal_document_type_id,
    start_number: data.numero_inicial ?? data.start_number,
    end_number: data.numero_final ?? data.end_number,
    last_used_number: data.ultimo_numero_utilizado ?? data.last_used_number,
    expiration_date: data.fecha_vencimiento ?? data.expiration_date,
    is_active: data.estado !== 'inactivo',
  });
}

function update(id, userId, data) {
  return fiscalSequenceRepo.update(id, userId, {
    fiscal_document_type_id: data.fiscal_document_type_id,
    start_number: data.numero_inicial,
    end_number: data.numero_final,
    last_used_number: data.ultimo_numero_utilizado,
    expiration_date: data.fecha_vencimiento,
    is_active: data.estado !== undefined ? data.estado === 'activo' : undefined,
  });
}

module.exports = {
  listByUser,
  getById,
  getActiveRange,
  create,
  update,
};
