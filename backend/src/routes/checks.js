const express = require('express');
const { runQuery, getQuery, allQuery } = require('../db');
const { parseFechaLocal } = require('../utils');
const { checkFuel, checkMantenimiento, mantenimientoStatus } = require('../services/checks');

const router = express.Router();

router.post('/check-fuel', async (req, res) => {
  try {
    res.json(await checkFuel());
  } catch (error) {
    console.error('Error checking fuel:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/check-mantenimiento', async (req, res) => {
  try {
    res.json(await checkMantenimiento());
  } catch (error) {
    console.error('Error checking mantenimiento:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/mantenimientos', async (req, res) => {
  try {
    const rows = await allQuery('SELECT * FROM mantenimientos ORDER BY CASE estado WHEN \'vencido\' THEN 0 WHEN \'proximo\' THEN 1 WHEN \'programado\' THEN 2 WHEN \'completado\' THEN 3 ELSE 4 END, fecha_proxima ASC');
    res.json(rows.map(m => ({ ...m, status: mantenimientoStatus(m) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/mantenimientos', async (req, res) => {
  const { entidad_tipo = 'unidad', entidad_id = '', entidad_nombre = '', tipo_servicio = 'general', fecha_ultimo, fecha_proxima, intervalo_dias = 30, kilometraje_ultimo, kilometraje_proximo, estado = 'programado', notas = '' } = req.body || {};
  try {
    const result = await runQuery(
      `INSERT INTO mantenimientos (entidad_tipo, entidad_id, entidad_nombre, tipo_servicio, fecha_ultimo, fecha_proxima, intervalo_dias, kilometraje_ultimo, kilometraje_proximo, estado, notas, created_by_username)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [entidad_tipo, String(entidad_id), String(entidad_nombre), String(tipo_servicio), fecha_ultimo || null, fecha_proxima || null, Number(intervalo_dias) || 30, kilometraje_ultimo || null, kilometraje_proximo || null, String(estado), String(notas), req.user?.username || '']
    );
    const row = await getQuery('SELECT * FROM mantenimientos WHERE id = ?', [result.lastID]);
    res.json({ ...row, status: mantenimientoStatus(row) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/mantenimientos/:id', async (req, res) => {
  const { estado, fecha_proxima, fecha_ultimo, notas, kilometraje_proximo, kilometraje_ultimo, intervalo_dias, tipo_servicio } = req.body || {};
  try {
    const row = await getQuery('SELECT * FROM mantenimientos WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Mantenimiento no encontrado' });
    const next = {
      estado: estado !== undefined ? String(estado) : row.estado,
      fecha_proxima: fecha_proxima !== undefined ? fecha_proxima : row.fecha_proxima,
      fecha_ultimo: fecha_ultimo !== undefined ? fecha_ultimo : row.fecha_ultimo,
      notas: notas !== undefined ? String(notas) : row.notas,
      kilometraje_proximo: kilometraje_proximo !== undefined ? kilometraje_proximo : row.kilometraje_proximo,
      kilometraje_ultimo: kilometraje_ultimo !== undefined ? kilometraje_ultimo : row.kilometraje_ultimo,
      intervalo_dias: intervalo_dias !== undefined ? Number(intervalo_dias) : row.intervalo_dias,
      tipo_servicio: tipo_servicio !== undefined ? String(tipo_servicio) : row.tipo_servicio,
    };
    if (estado === 'completado' && !fecha_ultimo) {
      next.fecha_ultimo = new Date().toISOString();
    }
    if (estado === 'completado' && !fecha_proxima && next.intervalo_dias) {
      const base = parseFechaLocal(next.fecha_ultimo) || new Date();
      const prox = new Date(base);
      prox.setDate(prox.getDate() + Number(next.intervalo_dias));
      next.fecha_proxima = prox.toISOString();
    }
    await runQuery(
      'UPDATE mantenimientos SET estado = ?, fecha_proxima = ?, fecha_ultimo = ?, notas = ?, kilometraje_proximo = ?, kilometraje_ultimo = ?, intervalo_dias = ?, tipo_servicio = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [next.estado, next.fecha_proxima, next.fecha_ultimo, next.notas, next.kilometraje_proximo, next.kilometraje_ultimo, next.intervalo_dias, next.tipo_servicio, req.params.id]
    );
    const updated = await getQuery('SELECT * FROM mantenimientos WHERE id = ?', [req.params.id]);
    res.json({ ...updated, status: mantenimientoStatus(updated) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/mantenimientos/:id', async (req, res) => {
  try {
    await runQuery('DELETE FROM mantenimientos WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
