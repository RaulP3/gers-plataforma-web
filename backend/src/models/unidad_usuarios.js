const { allQuery, runQuery } = require('../db');

async function listAsignaciones() {
  const rows = await allQuery(
    `SELECT uu.user_id, uu.unidad_clave, u.id AS user_id_num, u.username, u.nombre AS user_nombre, u.rol
     FROM unidad_usuarios uu
     JOIN users u ON u.id = uu.user_id
     ORDER BY u.username, uu.unidad_clave`
  );
  return rows || [];
}

async function getAsignacionesUserId(userId) {
  const rows = await allQuery('SELECT unidad_clave FROM unidad_usuarios WHERE user_id = ?', [userId]);
  return (rows || []).map(r => r.unidad_clave);
}

async function setAsignacionesUserId(userId, unidadClaves) {
  return runQuery('DELETE FROM unidad_usuarios WHERE user_id = ?', [userId]).then(() => {
    const claves = (Array.isArray(unidadClaves) ? unidadClaves : []).map(c => String(c).trim()).filter(Boolean);
    if (claves.length === 0) return { changes: 0 };
    const inserts = claves.map(clave => runQuery(
      'INSERT OR IGNORE INTO unidad_usuarios (unidad_clave, user_id) VALUES (?, ?)',
      [clave, userId]
    ));
    return Promise.all(inserts).then(results => ({ changes: results.reduce((n, r) => n + (r?.changes || 0), 0) }));
  });
}

async function deleteAsignacionesUserId(userId) {
  return runQuery('DELETE FROM unidad_usuarios WHERE user_id = ?', [userId]);
}

async function getAvailableUnidadClavesUsuarios(userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) return [];
  const placeholders = userIds.map(() => '?').join(',');
  const rows = await allQuery(
    `SELECT user_id, unidad_clave FROM unidad_usuarios WHERE user_id IN (${placeholders})`,
    userIds
  );
  return rows || [];
}

module.exports = {
  listAsignaciones,
  getAsignacionesUserId,
  setAsignacionesUserId,
  deleteAsignacionesUserId,
  getAvailableUnidadClavesUsuarios,
};