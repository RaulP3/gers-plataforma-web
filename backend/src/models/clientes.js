const { db, getQuery, runQuery } = require('../db');

function parseWppGroups(value) {
  let raw = [];
  if (Array.isArray(value)) raw = value;
  else if (typeof value === 'string' && value) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) raw = parsed;
    } catch (error) {
      raw = [];
    }
  }
  return raw
    .map(item => typeof item === 'string' ? item : (item?.nombre ?? ''))
    .map(item => String(item || '').trim())
    .filter(Boolean);
}

function normalizeWppGroups(value, current = []) {
  if (value === undefined || value === null) return current;
  if (!Array.isArray(value)) throw new Error('wpp_groups debe ser una lista de grupos');
  const grupos = value.map((item, index) => {
    const nombre = typeof item === 'string' ? item : item?.nombre;
    const limpio = String(nombre ?? '').trim().replace(/\s+/g, ' ');
    if (!limpio) throw new Error(`Grupo de WPP ${index + 1} requiere nombre`);
    if (limpio.length > 150) throw new Error(`Grupo de WPP ${index + 1}: el nombre es muy largo`);
    return limpio;
  });
  return [...new Set(grupos)];
}

function serializeCliente(row) {
  return { ...row, wpp_groups: parseWppGroups(row?.wpp_groups) };
}

function normalizeClientPayload(body, current = {}) {
  const has = key => Object.prototype.hasOwnProperty.call(body || {}, key);
  const text = (key, fallback = '') => {
    const value = has(key) ? body[key] : (current[key] ?? fallback);
    if (value !== null && value !== undefined && typeof value !== 'string') throw new Error(`${key} debe ser texto`);
    return String(value || '').trim().replace(/\s+/g, ' ');
  };
  const client = {
    nombre: text('nombre'),
    contacto: text('contacto'),
    telefono: text('telefono'),
    email: text('email').toLowerCase(),
    wpp_groups: JSON.stringify(
      normalizeWppGroups(has('wpp_groups') ? body.wpp_groups : undefined, parseWppGroups(current.wpp_groups))
    ),
  };
  if (!client.nombre) throw new Error('nombre es requerido');
  if (client.nombre.length > 150) throw new Error('nombre no puede exceder 150 caracteres');
  if (client.contacto.length > 150) throw new Error('contacto no puede exceder 150 caracteres');
  if (client.telefono.length > 40) throw new Error('telefono no puede exceder 40 caracteres');
  if (client.email.length > 254 || (client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email))) {
    throw new Error('email no es válido');
  }
  return client;
}

function listClientes() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM clientes ORDER BY nombre ASC', [], (err, rows) => {
      if (err) return reject(err);
      resolve((rows || []).map(serializeCliente));
    });
  });
}

function getCliente(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM clientes WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function getClienteId(id) {
  return getQuery('SELECT id FROM clientes WHERE id = ?', [id]);
}

function createCliente(client) {
  return runQuery('INSERT INTO clientes (nombre, contacto, telefono, email, wpp_groups) VALUES (?, ?, ?, ?, ?)', [client.nombre, client.contacto, client.telefono, client.email, client.wpp_groups]);
}

function updateCliente(id, client) {
  return runQuery('UPDATE clientes SET nombre = ?, contacto = ?, telefono = ?, email = ?, wpp_groups = ? WHERE id = ?', [client.nombre, client.contacto, client.telefono, client.email, client.wpp_groups, id]);
}

function deleteCliente(id) {
  return runQuery('DELETE FROM clientes WHERE id = ?', [id]);
}

module.exports = {
  parseWppGroups,
  normalizeWppGroups,
  serializeCliente,
  normalizeClientPayload,
  listClientes,
  getCliente,
  getClienteId,
  createCliente,
  updateCliente,
  deleteCliente,
};
