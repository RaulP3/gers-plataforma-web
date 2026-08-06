const express = require('express');
const { db, runQuery, withTransaction } = require('../db');
const { actorFromReq, requireAdmin } = require('../auth');

const router = express.Router();

router.get('/pendientes', (req, res) => {
  const { turno, estado } = req.query;
  let query = 'SELECT * FROM pendientes WHERE 1=1';
  const params = [];
  if (turno) { query += ' AND turno = ?'; params.push(turno); }
  if (estado) { query += ' AND estado = ?'; params.push(estado); }
  query += ' ORDER BY CASE prioridad WHEN "alta" THEN 1 WHEN "media" THEN 2 WHEN "baja" THEN 3 ELSE 4 END, fecha_creacion DESC';
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/pendientes', (req, res) => {
  const { titulo, descripcion, prioridad, asignado_a, turno, notas, creado_por } = req.body;
  if (!titulo) return res.status(400).json({ error: 'Título es requerido' });
  const userName = actorFromReq(req);
  const userId = req.user?.id || null;
  db.run(
    'INSERT INTO pendientes (titulo, descripcion, prioridad, asignado_a, turno, notas, creado_por, created_by_user_id, created_by_username) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [titulo, descripcion || '', prioridad || 'media', asignado_a || '', turno || '', notas || '', userName, userId, userName],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

router.put('/pendientes/:id', (req, res) => {
  db.get('SELECT * FROM pendientes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    const has = (key) => Object.prototype.hasOwnProperty.call(req.body || {}, key);
    const next = {
      titulo: has('titulo') ? req.body.titulo : row.titulo,
      descripcion: has('descripcion') ? req.body.descripcion : row.descripcion,
      prioridad: has('prioridad') ? req.body.prioridad : row.prioridad,
      estado: has('estado') ? req.body.estado : row.estado,
      asignado_a: has('asignado_a') ? req.body.asignado_a : row.asignado_a,
      turno: has('turno') ? req.body.turno : row.turno,
      notas: has('notas') ? req.body.notas : row.notas,
    };
    db.run(
      'UPDATE pendientes SET titulo = ?, descripcion = ?, prioridad = ?, estado = ?, asignado_a = ?, turno = ?, notas = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?',
      [next.titulo, next.descripcion, next.prioridad, next.estado, next.asignado_a, next.turno, next.notas, req.params.id],
      function (runErr) {
        if (runErr) return res.status(500).json({ error: runErr.message });
        res.json({ changes: this.changes });
      }
    );
  });
});

router.delete('/pendientes/:id', async (req, res) => {
  try {
    const changes = await withTransaction(async tx => {
      await tx.run('DELETE FROM comentarios_pendientes WHERE pendiente_id = ?', [req.params.id]);
      const result = await tx.run('DELETE FROM pendientes WHERE id = ?', [req.params.id]);
      return result.changes;
    });
    res.json({ changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pendientes/:id/comentarios', (req, res) => {
  db.all('SELECT * FROM comentarios_pendientes WHERE pendiente_id = ? ORDER BY fecha_creacion DESC', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

router.post('/pendientes/:id/comentarios', (req, res) => {
  const { contenido } = req.body;
  if (!contenido) return res.status(400).json({ error: 'Contenido es requerido' });
  const userName = actorFromReq(req);
  const userId = req.user?.id || null;
  db.run(
    'INSERT INTO comentarios_pendientes (pendiente_id, autor, contenido, created_by_user_id, created_by_username) VALUES (?, ?, ?, ?, ?)',
    [req.params.id, userName, contenido, userId, userName],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

router.delete('/pendientes/:id/comentarios/:comentarioId', (req, res) => {
  db.run('DELETE FROM comentarios_pendientes WHERE id = ? AND pendiente_id = ?', [req.params.comentarioId, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

router.get('/pendientes/historial', (req, res) => {
  db.all('SELECT * FROM pendientes_historial ORDER BY archived_at DESC, id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

router.post('/pendientes/archivar-completados', requireAdmin, async (req, res) => {
  try {
    const archivedByUserId = req.user?.id || null;
    const archivedByUsername = actorFromReq(req);
    const archived = await withTransaction(async tx => {
      const rows = await tx.all('SELECT * FROM pendientes WHERE estado = "completado" ORDER BY fecha_actualizacion DESC');
      if (!rows.length) return 0;
      for (const row of rows) {
        const comments = await tx.all('SELECT autor, contenido FROM comentarios_pendientes WHERE pendiente_id = ? ORDER BY fecha_creacion ASC', [row.id]);
        await tx.run(`
          INSERT INTO pendientes_historial (
            pendiente_id, titulo, descripcion, prioridad, estado, asignado_a, turno, notas,
            creado_por, created_by_user_id, created_by_username, fecha_creacion, fecha_actualizacion,
            archived_by_user_id, archived_by_username, comentarios_resumen
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          row.id, row.titulo, row.descripcion || '', row.prioridad || 'media', row.estado || 'completado',
          row.asignado_a || '', row.turno || '', row.notas || '', row.creado_por || '',
          row.created_by_user_id || null, row.created_by_username || '', row.fecha_creacion || null,
          row.fecha_actualizacion || null, archivedByUserId, archivedByUsername,
          comments.map(c => `${c.autor || 'Sistema'}: ${c.contenido}`).join('\n'),
        ]);
      }
      const ids = rows.map(row => row.id);
      const placeholders = ids.map(() => '?').join(',');
      await tx.run(`DELETE FROM comentarios_pendientes WHERE pendiente_id IN (${placeholders})`, ids);
      const deleted = await tx.run(`DELETE FROM pendientes WHERE id IN (${placeholders}) AND estado = 'completado'`, ids);
      if (deleted.changes !== ids.length) throw new Error('Los pendientes cambiaron durante el archivado');
      return deleted.changes;
    });

    res.json({ archived });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reportes/pendientes-completados', (req, res) => {
  db.all('SELECT * FROM pendientes_historial ORDER BY archived_at DESC, id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

router.get('/reportes/notas', (req, res) => {
  const { tipo, vehicle_id, fecha_inicio, fecha_fin } = req.query;
  let query = "SELECT * FROM comentarios WHERE tipo IN ('bitacora', 'incidencia', 'seguimiento', 'mantenimiento', 'incidente')";
  const params = [];
  if (tipo) { query += ' AND tipo = ?'; params.push(tipo); }
  if (vehicle_id) { query += ' AND vehicle_id = ?'; params.push(vehicle_id); }
  if (fecha_inicio) { query += ' AND created_at >= ?'; params.push(fecha_inicio); }
  if (fecha_fin) { query += ' AND created_at <= ?'; params.push(fecha_fin + ' 23:59:59'); }
  query += ' ORDER BY created_at DESC';
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

router.get('/comentarios', (req, res) => {
  const { vehicle_id } = req.query;
  let query = 'SELECT * FROM comentarios';
  const params = [];
  if (vehicle_id) {
    query += ' WHERE vehicle_id = ?';
    params.push(vehicle_id);
  }
  query += ' ORDER BY created_at DESC';
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/comentarios', (req, res) => {
  const { vehicle_id, vehicle_name, tipo, titulo, contenido, kilometraje, remolque, grupo, origen, destino, estatus } = req.body;
  const userName = actorFromReq(req);
  const userId = req.user?.id || null;
  db.run(
    'INSERT INTO comentarios (vehicle_id, vehicle_name, autor, tipo, titulo, contenido, kilometraje, estatus, remolque, grupo, origen, destino, created_by_user_id, created_by_username) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [vehicle_id, vehicle_name, userName, tipo || 'seguimiento', titulo || null, contenido, kilometraje || null, estatus || '', remolque || '', grupo || '', origen || '', destino || '', userId, userName],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

router.put('/comentarios/:id', (req, res) => {
  db.get('SELECT * FROM comentarios WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    const has = (key) => Object.prototype.hasOwnProperty.call(req.body || {}, key);
    const next = {
      titulo: has('titulo') ? req.body.titulo : row.titulo,
      contenido: has('contenido') ? req.body.contenido : row.contenido,
      tipo: has('tipo') ? req.body.tipo : row.tipo,
    };
    db.run(
      'UPDATE comentarios SET titulo = ?, contenido = ?, tipo = ? WHERE id = ?',
      [next.titulo, next.contenido, next.tipo, req.params.id],
      function (runErr) {
        if (runErr) return res.status(500).json({ error: runErr.message });
        res.json({ changes: this.changes });
      }
    );
  });
});

router.delete('/comentarios/:id', (req, res) => {
  db.run('DELETE FROM comentarios WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

module.exports = router;
