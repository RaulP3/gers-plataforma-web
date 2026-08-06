const express = require('express');
const axios = require('axios');
const { db, getQuery, withTransaction } = require('../db');
const { requireAdmin } = require('../auth');
const { checkGeofences, handleSamsaraWebhook } = require('../services/geofences');

const router = express.Router();

router.get('/geofences', (req, res) => {
  const clienteId = req.query.cliente_id;
  const query = clienteId ? 'SELECT * FROM geofences WHERE cliente_id = ? ORDER BY created_at DESC' : 'SELECT * FROM geofences ORDER BY created_at DESC';
  const params = clienteId ? [clienteId] : [];
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/geofences', async (req, res) => {
  const { nombre, direccion, latitud, longitud, radio_metros, descripcion, color, cliente_id: clienteId } = req.body;
  if (!nombre || latitud === undefined || longitud === undefined) {
    return res.status(400).json({ error: 'nombre, latitud y longitud son requeridos' });
  }
  if (clienteId !== undefined && clienteId !== null && clienteId !== '') {
    const client = await getQuery('SELECT id FROM clientes WHERE id = ?', [clienteId]).catch(error => {
      res.status(500).json({ error: error.message });
      return null;
    });
    if (res.headersSent) return;
    if (!client) return res.status(400).json({ error: 'Cliente no encontrado' });
  }
  db.run(
    'INSERT INTO geofences (nombre, direccion, latitud, longitud, radio_metros, descripcion, color, cliente_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [nombre, direccion || '', latitud, longitud, radio_metros || 500, descripcion || '', color || '#3b82f6', clienteId || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

router.put('/geofences/toggle', (req, res) => {
  const { ids, activa } = req.body;
  if (!Array.isArray(ids) || ids.length === 0 || activa === undefined) {
    return res.status(400).json({ error: 'ids (array) y activa (0/1) son requeridos' });
  }
  const placeholders = ids.map(() => '?').join(',');
  db.run(`UPDATE geofences SET activa = ? WHERE id IN (${placeholders})`, [activa, ...ids], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

router.put('/geofences/:id', (req, res) => {
  const { nombre, direccion, latitud, longitud, radio_metros, descripcion, color, activa, cliente_id: clienteId } = req.body;
  db.run(
    `UPDATE geofences SET nombre = COALESCE(?, nombre), latitud = COALESCE(?, latitud),
     direccion = COALESCE(?, direccion), longitud = COALESCE(?, longitud), radio_metros = COALESCE(?, radio_metros),
     descripcion = COALESCE(?, descripcion), color = COALESCE(?, color), activa = COALESCE(?, activa), cliente_id = COALESCE(?, cliente_id)
     WHERE id = ?`,
    [nombre, latitud, direccion, longitud, radio_metros, descripcion, color, activa, clienteId, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

router.post('/geocode-address', async (req, res) => {
  const { address } = req.body || {};
  if (!address || !String(address).trim()) return res.status(400).json({ error: 'address es requerido' });
  try {
    const geoRes = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: address, format: 'jsonv2', limit: 1 },
      headers: { 'User-Agent': 'gers-plataforma-web/1.0' },
      timeout: 15000,
    });
    const first = Array.isArray(geoRes.data) ? geoRes.data[0] : null;
    if (!first) return res.status(404).json({ error: 'No se encontró la dirección' });
    res.json({
      latitud: Number(first.lat),
      longitud: Number(first.lon),
      direccion: first.display_name || address,
      nombre: first.name || address,
    });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo geocodificar la dirección', details: error.message });
  }
});

router.delete('/geofences/:id', (req, res) => {
  db.run('DELETE FROM geofences WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

router.get('/geofence-events', (req, res) => {
  const { vehicle_id, geofence_id, limit: lim } = req.query;
  let query = 'SELECT * FROM geofence_events WHERE 1=1';
  const params = [];
  if (vehicle_id) { query += ' AND vehicle_id = ?'; params.push(vehicle_id); }
  if (geofence_id) { query += ' AND geofence_id = ?'; params.push(geofence_id); }
  query += ' ORDER BY created_at DESC';
  if (lim) { query += ' LIMIT ?'; params.push(Number(lim)); }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.delete('/geofence-events', requireAdmin, async (req, res) => {
  try {
    const deleted = await withTransaction(async tx => {
      await tx.run('DELETE FROM geofence_events');
      const states = await tx.run('DELETE FROM vehicle_geofence_state');
      return states.changes;
    });
    res.json({ deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/webhooks/samsara', async (req, res) => {
  try {
    res.json(await handleSamsaraWebhook(req));
  } catch (err) {
    console.error('Webhook Samsara inválido:', err.message);
    res.status(err.status || 400).json({ error: err.message });
  }
});

router.post('/check-geofences', async (req, res) => {
  try {
    res.json(await checkGeofences());
  } catch (error) {
    console.error('Error checking geofences:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
