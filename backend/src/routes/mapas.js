const express = require('express');
const { runQuery, getQuery, allQuery } = require('../db');
const { validMyMapsUrl } = require('../services/geocode');

const router = express.Router();

router.get('/mapas', async (req, res) => {
  try {
    res.json(await allQuery('SELECT * FROM mapas_mymaps ORDER BY created_at DESC, id DESC'));
  } catch (err) {
    console.error('Error al listar mapas:', err);
    res.status(500).json({ error: 'Error al listar mapas' });
  }
});

router.post('/mapas', async (req, res) => {
  const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
  if (!validMyMapsUrl(url)) return res.status(400).json({ error: 'url debe ser HTTP(S) de google.com o googleusercontent.com' });
  try {
    const result = await runQuery(
      `INSERT INTO mapas_mymaps (nombre, descripcion, origen, destino, url, created_by_user_id, created_by_username)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre, req.body.descripcion ?? null, req.body.origen ?? null, req.body.destino ?? null, url, req.user.id, req.user.username]
    );
    res.status(201).json(await getQuery('SELECT * FROM mapas_mymaps WHERE id = ?', [result.lastID]));
  } catch (err) {
    console.error('Error al crear mapa:', err);
    res.status(500).json({ error: 'Error al crear mapa' });
  }
});

router.put('/mapas/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Mapa inválido' });
  const has = key => Object.prototype.hasOwnProperty.call(req.body || {}, key);
  try {
    const current = await getQuery('SELECT * FROM mapas_mymaps WHERE id = ?', [id]);
    if (!current) return res.status(404).json({ error: 'Mapa no encontrado' });
    if (has('nombre') && typeof req.body.nombre !== 'string') {
      return res.status(400).json({ error: 'nombre debe ser texto' });
    }
    if (has('url') && typeof req.body.url !== 'string') {
      return res.status(400).json({ error: 'url debe ser texto' });
    }
    const nombre = has('nombre') ? req.body.nombre.trim() : current.nombre;
    const url = has('url') ? req.body.url.trim() : current.url;
    if (!nombre) return res.status(400).json({ error: 'nombre no puede estar vacío' });
    if (!validMyMapsUrl(url)) return res.status(400).json({ error: 'url debe ser HTTP(S) de google.com o googleusercontent.com' });
    await runQuery(
      `UPDATE mapas_mymaps SET nombre = ?, descripcion = ?, origen = ?, destino = ?, url = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        nombre,
        has('descripcion') ? req.body.descripcion : current.descripcion,
        has('origen') ? req.body.origen : current.origen,
        has('destino') ? req.body.destino : current.destino,
        url,
        id,
      ]
    );
    res.json(await getQuery('SELECT * FROM mapas_mymaps WHERE id = ?', [id]));
  } catch (err) {
    console.error('Error al actualizar mapa:', err);
    res.status(500).json({ error: 'Error al actualizar mapa' });
  }
});

router.delete('/mapas/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Mapa inválido' });
  try {
    const current = await getQuery('SELECT id, created_by_user_id FROM mapas_mymaps WHERE id = ?', [id]);
    if (!current) return res.status(404).json({ error: 'Mapa no encontrado' });
    if (req.user.rol !== 'admin' && current.created_by_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el propietario o un administrador puede eliminar este mapa' });
    }
    const result = await runQuery('DELETE FROM mapas_mymaps WHERE id = ?', [id]);
    res.json({ deleted: result.changes, id });
  } catch (err) {
    console.error('Error al eliminar mapa:', err);
    res.status(500).json({ error: 'Error al eliminar mapa' });
  }
});

module.exports = router;
