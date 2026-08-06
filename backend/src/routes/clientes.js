const express = require('express');
const { db, getQuery, runQuery, withTransaction } = require('../db');
const { fetchSamsaraAddresses } = require('../services/samsara');

const router = express.Router();

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

router.get('/clientes', (req, res) => {
  db.all('SELECT * FROM clientes ORDER BY nombre ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json((rows || []).map(serializeCliente));
  });
});

router.get('/clientes/geofence-links', (req, res) => {
  db.all('SELECT * FROM cliente_geofence_links ORDER BY created_at ASC, id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

router.get('/clientes/:id', (req, res) => {
  db.get('SELECT * FROM clientes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(serializeCliente(row));
  });
});

router.post('/clientes', (req, res) => {
  let client;
  try {
    client = normalizeClientPayload(req.body);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  db.run('INSERT INTO clientes (nombre, contacto, telefono, email, wpp_groups) VALUES (?, ?, ?, ?, ?)', [client.nombre, client.contacto, client.telefono, client.email, client.wpp_groups], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM clientes WHERE id = ?', [this.lastID], (getErr, row) => {
      if (getErr) return res.status(500).json({ error: getErr.message });
      res.status(201).json(serializeCliente(row));
    });
  });
});

router.put('/clientes/:id', (req, res) => {
  db.get('SELECT * FROM clientes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Cliente no encontrado' });
    let client;
    try {
      client = normalizeClientPayload(req.body, serializeCliente(row));
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    db.run(
      'UPDATE clientes SET nombre = ?, contacto = ?, telefono = ?, email = ?, wpp_groups = ? WHERE id = ?',
      [client.nombre, client.contacto, client.telefono, client.email, client.wpp_groups, req.params.id],
      function (runErr) {
        if (runErr) return res.status(500).json({ error: runErr.message });
        db.get('SELECT * FROM clientes WHERE id = ?', [req.params.id], (getErr, updated) => {
          if (getErr) return res.status(500).json({ error: getErr.message });
          res.json(serializeCliente(updated));
        });
      }
    );
  });
});

router.post('/clientes/:id/geofences/link', async (req, res) => {
  const source = String(req.body?.source || '').toLowerCase();
  const geofenceRef = String(req.body?.geofence_id ?? '').trim();
  if (!['local', 'samsara'].includes(source) || !geofenceRef) {
    return res.status(400).json({ error: 'source y geofence_id son requeridos' });
  }
  try {
    const client = await getQuery('SELECT id FROM clientes WHERE id = ?', [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

    if (source === 'local') {
      const geofence = await getQuery('SELECT id, nombre, cliente_id FROM geofences WHERE id = ?', [geofenceRef]);
      if (!geofence) return res.status(404).json({ error: 'Geocerca no encontrada' });
      if (geofence.cliente_id && String(geofence.cliente_id) !== String(client.id)) {
        return res.status(409).json({ error: 'La geocerca ya está asociada a otro cliente' });
      }
      await runQuery('UPDATE geofences SET cliente_id = ? WHERE id = ?', [client.id, geofence.id]);
      return res.json({ cliente_id: client.id, source, geofence_ref: String(geofence.id), geofence_nombre: geofence.nombre });
    }

    const addresses = await fetchSamsaraAddresses();
    const geofence = addresses.find(address => String(address.id) === geofenceRef);
    if (!geofence) return res.status(404).json({ error: 'Geocerca Samsara no encontrada' });
    const existing = await getQuery('SELECT * FROM cliente_geofence_links WHERE source = ? AND geofence_ref = ?', [source, geofenceRef]);
    if (existing && String(existing.cliente_id) !== String(client.id)) {
      return res.status(409).json({ error: 'La geocerca ya está asociada a otro cliente' });
    }
    if (!existing) {
      await runQuery(
        'INSERT INTO cliente_geofence_links (cliente_id, source, geofence_ref, geofence_nombre) VALUES (?, ?, ?, ?)',
        [client.id, source, geofenceRef, geofence.nombre]
      );
    }
    res.json(await getQuery('SELECT * FROM cliente_geofence_links WHERE source = ? AND geofence_ref = ?', [source, geofenceRef]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/clientes/:id/geofences/:source/:geofenceRef', async (req, res) => {
  const source = String(req.params.source || '').toLowerCase();
  try {
    if (source === 'local') {
      const result = await runQuery('UPDATE geofences SET cliente_id = NULL WHERE id = ? AND cliente_id = ?', [req.params.geofenceRef, req.params.id]);
      return res.json({ unlinked: result.changes });
    }
    if (source !== 'samsara') return res.status(400).json({ error: 'Fuente de geocerca inválida' });
    const result = await runQuery(
      'DELETE FROM cliente_geofence_links WHERE cliente_id = ? AND source = ? AND geofence_ref = ?',
      [req.params.id, source, req.params.geofenceRef]
    );
    res.json({ unlinked: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/clientes/:id', (req, res) => {
  withTransaction(async tx => {
    await tx.run('UPDATE geofences SET cliente_id = NULL WHERE cliente_id = ?', [req.params.id]);
    await tx.run('DELETE FROM cliente_geofence_links WHERE cliente_id = ?', [req.params.id]);
    return tx.run('DELETE FROM clientes WHERE id = ?', [req.params.id]);
  }).then(result => {
    if (!result.changes) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ deleted: result.changes });
  }).catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;
