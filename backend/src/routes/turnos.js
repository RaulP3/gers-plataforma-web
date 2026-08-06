const express = require('express');
const { runQuery, getQuery, allQuery } = require('../db');
const { requireAuth } = require('../auth');
const { getTurnoSummary } = require('../services/turnos');

const router = express.Router();

router.post('/turnos/entregar', requireAuth, async (req, res) => {
  try {
    const { horas = 8, turno = '', observaciones = '' } = req.body || {};
    const summary = await getTurnoSummary(horas, turno, observaciones);
    const saved = await runQuery(
      `INSERT INTO turnos_reportes (turno, horas, observaciones, resumen_json, resumen_texto, created_by, created_by_username)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        turno || '',
        summary.horas,
        observaciones || '',
        JSON.stringify(summary),
        summary.texto,
        req.user?.id || null,
        req.user?.username || '',
      ]
    );
    const report = await getQuery('SELECT * FROM turnos_reportes WHERE id = ?', [saved.lastID]);
    res.json({ summary, report });
  } catch (err) {
    console.error('Error al generar entrega de turno:', err);
    res.status(500).json({ error: 'Error al generar entrega de turno' });
  }
});

router.post('/turnos/resumen', requireAuth, async (req, res) => {
  try {
    const { horas = 8, turno = '', observaciones = '' } = req.body || {};
    const summary = await getTurnoSummary(horas, turno, observaciones);
    res.json({ summary });
  } catch (err) {
    console.error('Error al generar resumen de turno:', err);
    res.status(500).json({ error: 'Error al generar resumen de turno' });
  }
});

router.get('/turnos/entregas', requireAuth, async (req, res) => {
  try {
    const reports = await allQuery('SELECT * FROM turnos_reportes ORDER BY created_at DESC LIMIT 50');
    res.json(reports);
  } catch (err) {
    console.error('Error al consultar reportes de turno:', err);
    res.status(500).json({ error: 'Error al consultar reportes de turno' });
  }
});

module.exports = router;
