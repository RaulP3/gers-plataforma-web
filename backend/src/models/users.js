const crypto = require('crypto');
const { db, getQuery, runQuery } = require('../db');
const { PBKDF2_ITERATIONS, SESSION_DAYS, IS_PRODUCTION } = require('../config');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, storedHash) {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

function createSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function getUserByToken(token) {
  return getQuery(
    `SELECT u.id, u.username, u.nombre, u.rol
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.revoked = 0 AND s.expires_at > CURRENT_TIMESTAMP AND u.activo = 1`,
    [token]
  );
}

async function refreshSession(token) {
  await runQuery(`UPDATE sessions SET expires_at = datetime('now', '+${SESSION_DAYS} days') WHERE token = ? AND revoked = 0`, [token]);
}

async function ensureDefaultAdmin() {
  try {
    const user = await getQuery('SELECT COUNT(*) as total FROM users');
    const configuredUser = String(process.env.ADMIN_USERNAME || '').trim();
    const configuredPass = String(process.env.ADMIN_PASSWORD || '');
    if (user?.total > 0 && !configuredUser) return;
    const adminUser = configuredUser || (!IS_PRODUCTION ? 'admin' : '');
    const adminPass = configuredPass || (!IS_PRODUCTION ? 'admin123' : '');
    if (!adminUser || !adminPass) {
      throw new Error('ADMIN_USERNAME y ADMIN_PASSWORD son requeridos para crear el primer administrador');
    }
    const existing = await getQuery('SELECT id FROM users WHERE username = ?', [adminUser]);
    if (existing) return;
    const name = process.env.ADMIN_NAME || 'Administrador';
    const { salt, hash } = hashPassword(adminPass);
    await runQuery(
      'INSERT INTO users (username, password_hash, password_salt, nombre, rol, activo) VALUES (?, ?, ?, ?, ?, 1)',
      [adminUser, hash, salt, name, 'admin']
    );
    console.log(`Usuario admin inicial creado: ${adminUser}`);
  } catch (err) {
    console.error('No se pudo crear el usuario admin inicial:', err.message);
    throw err;
  }
}

async function listUsers() {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, username, nombre, rol, activo, created_at, updated_at FROM users ORDER BY created_at DESC', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

async function getUserByUsername(username) {
  return getQuery('SELECT id FROM users WHERE username = ?', [username]);
}

async function createUser({ username, password, nombre, rol }) {
  const { salt, hash } = hashPassword(password);
  const result = await runQuery(
    'INSERT INTO users (username, password_hash, password_salt, nombre, rol, activo) VALUES (?, ?, ?, ?, ?, 1)',
    [username, hash, salt, nombre, rol]
  );
  return getQuery('SELECT id, username, nombre, rol, activo, created_at, updated_at FROM users WHERE id = ?', [result.lastID]);
}

async function getUserForDelete(id) {
  return getQuery('SELECT id, username, rol, activo FROM users WHERE id = ?', [id]);
}

async function countActiveAdmins() {
  const row = await getQuery("SELECT COUNT(*) AS total FROM users WHERE rol = 'admin' AND activo = 1");
  return row?.total || 0;
}

async function deleteUser(id) {
  const result = await runQuery('DELETE FROM users WHERE id = ?', [id]);
  return result.changes;
}

async function deleteUserSessions(userId) {
  await runQuery('DELETE FROM sessions WHERE user_id = ?', [userId]);
}

async function revokeSession(token) {
  await runQuery('UPDATE sessions SET revoked = 1 WHERE token = ?', [token]);
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSessionToken,
  getUserByToken,
  refreshSession,
  ensureDefaultAdmin,
  listUsers,
  getUserByUsername,
  createUser,
  getUserForDelete,
  countActiveAdmins,
  deleteUser,
  deleteUserSessions,
  revokeSession,
};
