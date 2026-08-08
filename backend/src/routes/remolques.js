const express = require('express');
const crypto = require('crypto');
const { db, getQuery, runQuery, withTransaction } = require('../db');
const {
  getTrailerTempsCached,
  mapTrailerLocation,
  mapTrailerTemp,
} = require('../services/samsara');
const { setRemolqueResguardo } = require('../models/remolques');

const router = express.Router();

router.get('/remolques', async (req, res) => {
  await getTrailerTempsCached().catch(() => {});
  db.all(`SELECT r.*,
    (SELECT ra.vehicle_name FROM remolque_asignaciones ra WHERE ra.remolque_id = r.id AND ra.activa = 1 LIMIT 1) as unidad_asignada,
    (SELECT ra.vehicle_id FROM remolque_asignaciones ra WHERE ra.remolque_id = r.id AND ra.activa = 1 LIMIT 1) as vehicle_id_asignado,
    (SELECT ra.tipo_asignacion FROM remolque_asignaciones ra WHERE ra.remolque_id = r.id AND ra.activa = 1 LIMIT 1) as tipo_asignacion,
    (SELECT ra.grupo_full FROM remolque_asignaciones ra WHERE ra.remolque_id = r.id AND ra.activa = 1 LIMIT 1) as grupo_full
    FROM remolques r ORDER BY r.numero ASC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const enriched = (rows || []).map(r => ({
      ...r,
      trailer_gps: mapTrailerLocation(r.numero),
      temperatura: mapTrailerTemp(r.numero),
    }));
    res.json(enriched);
  });
});

router.post('/remolques', (req, res) => {
  const { numero, categoria = 'Caja Seca' } = req.body;
  if (!numero) return res.status(400).json({ error: 'numero es requerido' });
  db.run('INSERT INTO remolques (numero, categoria) VALUES (?, ?)', [numero.trim(), categoria || 'Caja Seca'], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Este número de remolque ya existe' });
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID });
  });
});

router.post('/remolques/full/asignar', async (req, res) => {
  const { remolque_ids, vehicle_id, vehicle_name } = req.body || {};
  if (!Array.isArray(remolque_ids) || remolque_ids.length !== 2) {
    return res.status(400).json({ error: 'remolque_ids debe contener exactamente dos remolques' });
  }
  const ids = remolque_ids.map(Number);
  if (ids.some(id => !Number.isInteger(id) || id <= 0) || ids[0] === ids[1]) {
    return res.status(400).json({ error: 'Los remolques deben ser distintos y válidos' });
  }
  if (!vehicle_id) return res.status(400).json({ error: 'vehicle_id es requerido' });

  try {
    const full = await withTransaction(async tx => {
      const tanks = await tx.all(
        'SELECT id, numero, categoria, status, resguardo FROM remolques WHERE id IN (?, ?) ORDER BY id',
        ids
      );
      if (tanks.length !== 2) {
        const error = new Error('Uno o más remolques no fueron encontrados');
        error.status = 404;
        throw error;
      }
      if (tanks.some(tank => String(tank.categoria || '').trim().toLowerCase() !== 'tanque')) {
        const error = new Error('Full requiere exactamente dos remolques de categoría Tanque');
        error.status = 400;
        throw error;
      }
      if (tanks.some(tank => Number(tank.resguardo))) {
        const error = new Error('No se puede armar un full con remolques en resguardo');
        error.status = 409;
        throw error;
      }
      const activeElsewhere = await tx.get(
        'SELECT id FROM remolque_asignaciones WHERE activa = 1 AND remolque_id IN (?, ?) AND vehicle_id <> ? LIMIT 1',
        [ids[0], ids[1], vehicle_id]
      );
      if (activeElsewhere) {
        const error = new Error('Uno de los tanques ya está asignado a otra unidad');
        error.status = 409;
        throw error;
      }

      const displaced = await tx.all(
        'SELECT DISTINCT remolque_id FROM remolque_asignaciones WHERE activa = 1 AND vehicle_id = ?',
        [vehicle_id]
      );
      await tx.run(
        'UPDATE remolque_asignaciones SET activa = 0, fecha_fin = CURRENT_TIMESTAMP WHERE activa = 1 AND vehicle_id = ?',
        [vehicle_id]
      );
      for (const row of displaced) {
        await tx.run('UPDATE remolques SET status = ? WHERE id = ?', ['disponible', row.remolque_id]);
      }

      const grupoFull = crypto.randomUUID();
      const assignments = [];
      for (const id of ids) {
        const result = await tx.run(
          `INSERT INTO remolque_asignaciones
             (remolque_id, vehicle_id, vehicle_name, tipo_asignacion, grupo_full)
           VALUES (?, ?, ?, 'full', ?)`,
          [id, vehicle_id, vehicle_name || '', grupoFull]
        );
        assignments.push(result.lastID);
        await tx.run('UPDATE remolques SET status = ? WHERE id = ?', ['asignado', id]);
      }
      return {
        tipo_asignacion: 'full',
        grupo_full: grupoFull,
        vehicle_id,
        vehicle_name: vehicle_name || '',
        tanques: tanks.map(tank => ({ ...tank, status: 'asignado' })),
        asignacion_ids: assignments,
      };
    });
    res.json(full);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete('/remolques/:id', async (req, res) => {
  try {
    const changes = await withTransaction(async tx => {
      const active = await tx.get(
        'SELECT grupo_full FROM remolque_asignaciones WHERE remolque_id = ? AND activa = 1',
        [req.params.id]
      );
      if (active?.grupo_full) {
        const members = await tx.all(
          'SELECT remolque_id FROM remolque_asignaciones WHERE grupo_full = ? AND activa = 1',
          [active.grupo_full]
        );
        await tx.run(
          'UPDATE remolque_asignaciones SET activa = 0, fecha_fin = CURRENT_TIMESTAMP WHERE grupo_full = ? AND activa = 1',
          [active.grupo_full]
        );
        for (const member of members) {
          await tx.run('UPDATE remolques SET status = ? WHERE id = ?', ['disponible', member.remolque_id]);
        }
      }
      await tx.run(
        'UPDATE remolque_asignaciones SET activa = 0, fecha_fin = COALESCE(fecha_fin, CURRENT_TIMESTAMP) WHERE remolque_id = ? AND activa = 1',
        [req.params.id]
      );
      await tx.run('DELETE FROM remolque_asignaciones WHERE remolque_id = ?', [req.params.id]);
      const result = await tx.run('DELETE FROM remolques WHERE id = ?', [req.params.id]);
      return result.changes;
    });
    res.json({ changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/remolques/:id', (req, res) => {
  db.get('SELECT * FROM remolques WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    const has = (key) => Object.prototype.hasOwnProperty.call(req.body || {}, key);
    const numero = has('numero') ? req.body.numero : row.numero;
    const categoria = has('categoria') ? req.body.categoria : row.categoria;
    const resguardo = has('resguardo') ? (req.body.resguardo ? 1 : 0) : row.resguardo;
    const fecha_cita = has('fecha_cita') ? (req.body.fecha_cita || null) : row.fecha_cita;
    if (!numero) return res.status(400).json({ error: 'numero es requerido' });
    db.run(
      'UPDATE remolques SET numero = ?, categoria = ?, resguardo = ?, fecha_cita = ? WHERE id = ?',
      [String(numero).trim(), categoria || 'Caja Seca', resguardo, fecha_cita, req.params.id],
      function (runErr) {
        if (runErr) return res.status(500).json({ error: runErr.message });
        res.json({ changes: this.changes });
      }
    );
  });
});

router.put('/remolques/:id/resguardo', async (req, res) => {
  const { resguardo, fecha_cita } = req.body || {};
  try {
    const row = await getQuery('SELECT id FROM remolques WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Remolque no encontrado' });
    const result = await setRemolqueResguardo(req.params.id, { resguardo, fecha_cita });
    res.json({ changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/remolques/:id/asignar', async (req, res) => {
  const { vehicle_id, vehicle_name } = req.body;
  if (!vehicle_id) return res.status(400).json({ error: 'vehicle_id es requerido' });
  try {
    const id = await withTransaction(async tx => {
      const trailer = await tx.get('SELECT id, resguardo FROM remolques WHERE id = ?', [req.params.id]);
      if (!trailer) {
        const error = new Error('Remolque no encontrado');
        error.status = 404;
        throw error;
      }
      if (trailer.resguardo) {
        const error = new Error('No se puede asignar un remolque en resguardo');
        error.status = 409;
        throw error;
      }
      const current = await tx.get(
        'SELECT grupo_full FROM remolque_asignaciones WHERE activa = 1 AND remolque_id = ?',
        [req.params.id]
      );
      const displaced = await tx.all(
        `SELECT DISTINCT remolque_id FROM remolque_asignaciones
         WHERE activa = 1 AND (remolque_id = ? OR vehicle_id = ? OR (? IS NOT NULL AND grupo_full = ?))`,
        [req.params.id, vehicle_id, current?.grupo_full || null, current?.grupo_full || null]
      );
      await tx.run(
        `UPDATE remolque_asignaciones SET activa = 0, fecha_fin = CURRENT_TIMESTAMP
         WHERE activa = 1 AND (remolque_id = ? OR vehicle_id = ? OR (? IS NOT NULL AND grupo_full = ?))`,
        [req.params.id, vehicle_id, current?.grupo_full || null, current?.grupo_full || null]
      );
      for (const row of displaced) {
        await tx.run('UPDATE remolques SET status = ? WHERE id = ?', ['disponible', row.remolque_id]);
      }
      const result = await tx.run(
        `INSERT INTO remolque_asignaciones
           (remolque_id, vehicle_id, vehicle_name, tipo_asignacion, grupo_full)
         VALUES (?, ?, ?, 'sencillo', NULL)`,
        [req.params.id, vehicle_id, vehicle_name || '']
      );
      await tx.run('UPDATE remolques SET status = ? WHERE id = ?', ['asignado', req.params.id]);
      return result.lastID;
    });
    res.json({ id });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/remolques/:id/desasignar', async (req, res) => {
  try {
    const changes = await withTransaction(async tx => {
      const active = await tx.get(
        'SELECT grupo_full FROM remolque_asignaciones WHERE remolque_id = ? AND activa = 1',
        [req.params.id]
      );
      if (!active) return 0;
      const members = active.grupo_full
        ? await tx.all('SELECT remolque_id FROM remolque_asignaciones WHERE grupo_full = ? AND activa = 1', [active.grupo_full])
        : [{ remolque_id: req.params.id }];
      const result = active.grupo_full
        ? await tx.run('UPDATE remolque_asignaciones SET activa = 0, fecha_fin = CURRENT_TIMESTAMP WHERE grupo_full = ? AND activa = 1', [active.grupo_full])
        : await tx.run('UPDATE remolque_asignaciones SET activa = 0, fecha_fin = CURRENT_TIMESTAMP WHERE remolque_id = ? AND activa = 1', [req.params.id]);
      for (const member of members) {
        await tx.run('UPDATE remolques SET status = ? WHERE id = ?', ['disponible', member.remolque_id]);
      }
      return result.changes;
    });
    res.json({ changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/remolques/:id/historial', (req, res) => {
  db.all('SELECT * FROM remolque_asignaciones WHERE remolque_id = ? ORDER BY created_at DESC', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

router.get('/remolques/asignaciones/activas', (req, res) => {
  db.all('SELECT ra.*, r.numero as remolque_numero FROM remolque_asignaciones ra JOIN remolques r ON r.id = ra.remolque_id WHERE ra.activa = 1', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

module.exports = router;
