const express = require('express');
const { db } = require('../db');
const { requireAdmin } = require('../auth');
const { createAlertRecord } = require('../models/alertas');

const router = express.Router();

router.get('/alertas', (req, res) => {
  const archived = req.query.archivadas === '1' || req.query.archivadas === 'true';
  const all = req.query.todas === '1' || req.query.todas === 'true';
  const query = `SELECT * FROM alertas${all ? '' : ' WHERE COALESCE(archivada, 0) = ?'} ORDER BY timestamp DESC`;
  db.all(query, all ? [] : [archived ? 1 : 0], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/alertas', async (req, res) => {
  const { vehicle_id, vehicle_name, tipo, mensaje, severidad } = req.body;
  try {
    const alert = await createAlertRecord({
      vehicle_id,
      vehicle_name,
      tipo: tipo || 'alerta',
      mensaje: mensaje || '',
      severidad: severidad || 'info',
    });
    res.json({ id: alert.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/alertas/:id/leer', (req, res) => {
  db.run('UPDATE alertas SET leida = 1 WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

router.put('/alertas/archivar-todas', (req, res) => {
  db.run("UPDATE alertas SET archivada = 1, leida = 1, archived_at = datetime('now') WHERE COALESCE(archivada, 0) = 0", [], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ archived: this.changes });
  });
});

router.put('/alertas/:id/archivar', (req, res) => {
  db.run("UPDATE alertas SET archivada = 1, leida = 1, archived_at = datetime('now') WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (!this.changes) return res.status(404).json({ error: 'Alerta no encontrada' });
    res.json({ archived: this.changes });
  });
});

router.put('/alertas/:id/restaurar', (req, res) => {
  db.run('UPDATE alertas SET archivada = 0, archived_at = NULL WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (!this.changes) return res.status(404).json({ error: 'Alerta no encontrada' });
    res.json({ restored: this.changes });
  });
});

router.delete('/alertas/:id', (req, res) => {
  db.run("UPDATE alertas SET archivada = 1, leida = 1, archived_at = datetime('now') WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

router.delete('/alertas', requireAdmin, (req, res) => {
  db.run("UPDATE alertas SET archivada = 1, leida = 1, archived_at = datetime('now') WHERE COALESCE(archivada, 0) = 0", [], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

module.exports = router;
