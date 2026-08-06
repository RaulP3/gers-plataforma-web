const express = require('express');
const { db } = require('../db');

const router = express.Router();

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
  db.all('SELECT * FROM unidades ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
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

module.exports = router;
