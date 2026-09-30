const express = require('express');
const { db } = require('../db');
const { requireAdmin } = require('../auth');
const { getConfig, setConfig } = require('../models/configuracion');

const router = express.Router();

const DEFAULT_UNIDAD_ETIQUETAS = [
  'Utilitarios',
  'Patio',
  'Operación',
  'Tractocamión',
  'Remolque',
  'Cisterna',
  'Siniestrada',
  'No disponible',
  'Fuera de circulación',
];

router.get('/risk-zones', (req, res) => {
  db.all('SELECT * FROM risk_zones ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/risk-zones', (req, res) => {
  const { name, description, severity, lat, lng, radius } = req.body;
  if (!name || lat == null || lng == null) {
    return res.status(400).json({ error: 'name, lat, lng son requeridos' });
  }
  db.run(
    'INSERT INTO risk_zones (name, description, severity, lat, lng, radius) VALUES (?, ?, ?, ?, ?, ?)',
    [name, description || '', severity || 'high', lat, lng, radius || 5000],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, severity, lat, lng, radius });
    }
  );
});

router.delete('/risk-zones/:id', (req, res) => {
  db.run('DELETE FROM risk_zones WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

router.get('/unidades', (req, res) => {
  db.all('SELECT * FROM unidades ORDER BY created_at DESC', [], async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!req.user || req.user.rol === 'admin') return res.json(rows);
    const { getAsignacionesUserId } = require('../models/unidad_usuarios');
    try {
      const claves = new Set(await getAsignacionesUserId(req.user.id));
      const filtered = (rows || []).filter(u => claves.has(`local:${u.id}`));
      res.json(filtered);
    } catch (filterErr) {
      res.status(500).json({ error: filterErr.message });
    }
  });
});

router.post('/unidades', (req, res) => {
  const { nombre, estatus, notas, tipo, samsara_id } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre es requerido' });
  db.run(
    'INSERT INTO unidades (nombre, estatus, notas, tipo, samsara_id) VALUES (?, ?, ?, ?, ?)',
    [nombre, estatus || 'Activa', notas || '', tipo || 'manual', samsara_id || ''],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, nombre, estatus: estatus || 'Activa', notas: notas || '', tipo: tipo || 'manual', samsara_id: samsara_id || '' });
    }
  );
});

// --- Etiquetas de unidades ---
router.get('/unidades/etiquetas-predeterminadas', async (req, res) => {
  try {
    const opciones = await getConfig('unidad_etiquetas_opciones', DEFAULT_UNIDAD_ETIQUETAS);
    res.json({ opciones: Array.isArray(opciones) ? opciones : [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/unidades/etiquetas-predeterminadas', requireAdmin, async (req, res) => {
  const raw = req.body?.opciones;
  if (!Array.isArray(raw)) return res.status(400).json({ error: 'opciones debe ser un arreglo de textos' });
  const opciones = raw.map(o => String(o).trim()).filter(Boolean);
  try {
    await setConfig('unidad_etiquetas_opciones', opciones);
    res.json({ opciones });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/unidades/etiquetas', (req, res) => {
  db.all('SELECT * FROM unidad_etiquetas', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const map = {};
    (Array.isArray(rows) ? rows : []).forEach(r => {
      try { map[r.unidad_clave] = JSON.parse(r.etiquetas || '[]'); }
      catch { map[r.unidad_clave] = []; }
    });
    res.json(map);
  });
});

router.put('/unidades/etiquetas', (req, res) => {
  const { unidad_clave, etiquetas } = req.body || {};
  if (!unidad_clave) return res.status(400).json({ error: 'unidad_clave es requerida' });
  const norm = (Array.isArray(etiquetas) ? etiquetas : []).map(e => String(e).trim()).filter(Boolean);
  db.run(
    `INSERT INTO unidad_etiquetas (unidad_clave, etiquetas, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(unidad_clave) DO UPDATE SET etiquetas = excluded.etiquetas, updated_at = excluded.updated_at`,
    [unidad_clave, JSON.stringify(norm)],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ unidad_clave, etiquetas: norm });
    }
  );
});
// --- Fin etiquetas de unidades ---

router.put('/unidades/:id', (req, res) => {
  db.get('SELECT * FROM unidades WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    const has = (key) => Object.prototype.hasOwnProperty.call(req.body || {}, key);
    const next = {
      nombre: has('nombre') ? req.body.nombre : row.nombre,
      estatus: has('estatus') ? req.body.estatus : row.estatus,
      notas: has('notas') ? req.body.notas : row.notas,
      tipo: has('tipo') ? req.body.tipo : row.tipo,
      samsara_id: has('samsara_id') ? req.body.samsara_id : row.samsara_id,
    };
    db.run(
      `UPDATE unidades SET nombre = ?, estatus = ?, notas = ?, tipo = ?, samsara_id = ?, updated_at = datetime('now') WHERE id = ?`,
      [next.nombre, next.estatus, next.notas, next.tipo, next.samsara_id || '', req.params.id],
      function (runErr) {
        if (runErr) return res.status(500).json({ error: runErr.message });
        res.json({ updated: this.changes });
      }
    );
  });
});

router.delete('/unidades/:id', (req, res) => {
  db.run('DELETE FROM unidades WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Inicializa tabla local de etiquetas si la migración anterior no existiera
db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='unidad_etiquetas'`, [], (err, row) => {
  if (!row) {
    db.run(`CREATE TABLE IF NOT EXISTS unidad_etiquetas (
      unidad_clave TEXT PRIMARY KEY,
      etiquetas TEXT DEFAULT '[]',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, [], () => {});
  }
});

module.exports = router;
