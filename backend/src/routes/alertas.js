const express = require('express');
const { db } = require('../db');
const { requireAdmin } = require('../auth');
const { createAlertRecord, resolverAlerta } = require('../models/alertas');
const { getConfig, setConfig } = require('../models/configuracion');

const router = express.Router();

router.get('/alertas/comentarios-predeterminados', async (req, res) => {
  try {
    const opciones = await getConfig('alerta_comentarios_opciones', []);
    res.json({ opciones: Array.isArray(opciones) ? opciones : [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/alertas/comentarios-predeterminados', requireAdmin, async (req, res) => {
  const raw = req.body?.opciones;
  if (!Array.isArray(raw)) return res.status(400).json({ error: 'opciones debe ser un arreglo de textos' });
  const opciones = raw.map(o => String(o).trim()).filter(Boolean);
  try {
    await setConfig('alerta_comentarios_opciones', opciones);
    const opcionesFinales = opciones.length > 0 ? opciones : [
      'Sin novedad - operación normal',
      'Autorizado: carga/descarga',
      'Visita programada al cliente',
      'Estancia prolongada / sin movimiento',
      'Merodeo: revisar cámara',
      'Problema con operador - contactar',
    ];
    if (opciones.length === 0) await setConfig('alerta_comentarios_opciones', opcionesFinales);
    res.json({ opciones: opcionesFinales });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/alertas', (req, res) => {
  const archived = req.query.archivadas === '1' || req.query.archivadas === 'true';
  const all = req.query.todas === '1' || req.query.todas === 'true';
  const query = `SELECT * FROM alertas${all ? '' : ' WHERE COALESCE(archivada, 0) = ?'} ORDER BY timestamp DESC`;
  db.all(query, all ? [] : [archived ? 1 : 0], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/alertas', requireAdmin, async (req, res) => {
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

router.put('/alertas/:id/resolver', async (req, res) => {
  const comentario = String(req.body?.comentario || '').trim();
  if (!comentario) return res.status(400).json({ error: 'El comentario es obligatorio para cerrar la alerta' });
  try {
    const changes = await resolverAlerta(req.params.id, comentario, req.user?.username || '');
    res.json({ resolved: changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/alertas/archivar-todas', requireAdmin, (req, res) => {
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
