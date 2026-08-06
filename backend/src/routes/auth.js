const express = require('express');
const { db, runQuery, getQuery, withTransaction } = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { hashPassword, verifyPassword, createSessionToken } = require('../models/users');
const { SESSION_DAYS } = require('../config');

const router = express.Router();

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
    }

    const user = await getQuery('SELECT * FROM users WHERE username = ? AND activo = 1', [username.trim()]);
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
    if (!verifyPassword(password, user.password_salt, user.password_hash)) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * SESSION_DAYS).toISOString();
    await runQuery(`INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+${SESSION_DAYS} days'))`, [user.id, token]);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nombre: user.nombre,
        rol: user.rol,
      },
      expiresAt,
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

router.get('/auth/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

router.post('/auth/logout', requireAuth, async (req, res) => {
  try {
    await runQuery('UPDATE sessions SET revoked = 1 WHERE token = ?', [req.authToken]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error al cerrar sesión:', err);
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
});

router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await new Promise((resolve, reject) => {
      db.all('SELECT id, username, nombre, rol, activo, created_at, updated_at FROM users ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
    res.json(users);
  } catch (err) {
    console.error('Error al listar usuarios:', err);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

router.post('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, password, nombre = '', rol = 'user' } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
    }
    const existing = await getQuery('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (existing) return res.status(409).json({ error: 'El usuario ya existe' });
    const { salt, hash } = hashPassword(password);
    const result = await runQuery(
      'INSERT INTO users (username, password_hash, password_salt, nombre, rol, activo) VALUES (?, ?, ?, ?, ?, 1)',
      [username.trim(), hash, salt, nombre.trim(), rol]
    );
    const user = await getQuery('SELECT id, username, nombre, rol, activo, created_at, updated_at FROM users WHERE id = ?', [result.lastID]);
    res.status(201).json(user);
  } catch (err) {
    console.error('Error al crear usuario:', err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: 'Usuario inválido' });
  if (userId === req.user.id) return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
  try {
    const target = await getQuery('SELECT id, username, rol, activo FROM users WHERE id = ?', [userId]);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (target.rol === 'admin' && target.activo) {
      const admins = await getQuery("SELECT COUNT(*) AS total FROM users WHERE rol = 'admin' AND activo = 1");
      if (admins.total <= 1) return res.status(400).json({ error: 'No se puede eliminar el último administrador activo' });
    }
    await withTransaction(async tx => {
      await tx.run('DELETE FROM sessions WHERE user_id = ?', [userId]);
      await tx.run('DELETE FROM users WHERE id = ?', [userId]);
    });
    res.json({ deleted: 1, id: userId });
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    res.status(500).json({ error: 'No se pudo eliminar el usuario' });
  }
});

module.exports = router;
