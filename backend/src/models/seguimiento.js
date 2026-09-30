const { db, runQuery } = require('../db');

const SEGUIMIENTO_FIELDS = ['unidad', 'operador', 'remolque', 'ruta', 'origen', 'destino', 'cita_carga', 'cita_descarga', 'hora_llegada', 'hora_liberacion', 'estatus', 'comentarios_cliente', 'comentarios_monitoreo', 'grupo'];

function listSeguimiento() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM seguimiento ORDER BY id ASC', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function buildSeguimientoData(body) {
  return SEGUIMIENTO_FIELDS.reduce((acc, f) => { acc[f] = body[f] || ''; return acc; }, {});
}

function createSeguimiento(data) {
  const cols = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  return runQuery(`INSERT INTO seguimiento (${cols}) VALUES (${placeholders})`, Object.values(data));
}

function getSeguimiento(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM seguimiento WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function resolveSeguimientoValues(body, row) {
  const values = [];
  const changed = [];
  SEGUIMIENTO_FIELDS.forEach(f => {
    const newVal = body[f] !== undefined ? body[f] : row[f];
    if (String(newVal) !== String(row[f])) {
      changed.push({ campo: f, anterior: row[f] || '', nuevo: newVal || '' });
    }
    values.push(newVal || '');
  });
  return { values, changed };
}

function updateSeguimiento(id, values) {
  const updates = SEGUIMIENTO_FIELDS.map(f => `${f} = ?`).concat(["fecha_actualizacion = datetime('now')"]);
  return runQuery(`UPDATE seguimiento SET ${updates.join(', ')} WHERE id = ?`, [...values, id]);
}

function deleteSeguimiento(id) {
  return runQuery('DELETE FROM seguimiento WHERE id = ?', [id]);
}

function listSeguimientoHistorial(seguimientoId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM seguimiento_historial WHERE seguimiento_id = ? ORDER BY fecha_cambio DESC', [seguimientoId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function listSeguimientoHistorialTodas() {
  return new Promise((resolve, reject) => {
    db.all('SELECT sh.*, s.unidad FROM seguimiento_historial sh LEFT JOIN seguimiento s ON s.id = sh.seguimiento_id ORDER BY sh.fecha_cambio DESC LIMIT 500', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function insertSeguimientoHistorial(seguimientoId, campo, valorAnterior, valorNuevo, usuario) {
  return runQuery('INSERT INTO seguimiento_historial (seguimiento_id, campo, valor_anterior, valor_nuevo, usuario) VALUES (?, ?, ?, ?, ?)', [seguimientoId, campo, valorAnterior, valorNuevo, usuario]);
}

function clearSeguimiento() {
  return runQuery('DELETE FROM seguimiento');
}

function createSeguimientoImport(item, userId, userName) {
  const data = {
    unidad: item.UNIDAD || '',
    operador: item.OPERADOR || '',
    remolque: item.REMOLQUE || '',
    ruta: item.RUTA || '',
    origen: item.ORIGEN || '',
    destino: item.DESTINO || '',
    cita_carga: item['CITA CARGA'] || '',
    cita_descarga: item['CITA DESCARGA'] || '',
    hora_llegada: item['HORA LLEGADA CON CLIENTE'] || '',
    hora_liberacion: item['HORA LIBERACION CLIENTE'] || '',
    estatus: item.ESTATUS || 'Disponible',
    comentarios_cliente: item['COMENTARIOS CLIENTE'] || '',
    comentarios_monitoreo: item['COMENTARIOS MONITOREO'] || '',
    grupo: item.GRUPO || '',
    created_by_user_id: userId,
    created_by_username: userName,
    fecha_actualizacion: item['HORA ACTUALIZACION'] || new Date().toISOString().replace('T', ' ').substring(0, 19),
  };
  const cols = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  return runQuery(`INSERT INTO seguimiento (${cols}) VALUES (${placeholders})`, Object.values(data));
}

module.exports = {
  SEGUIMIENTO_FIELDS,
  listSeguimiento,
  buildSeguimientoData,
  createSeguimiento,
  getSeguimiento,
  resolveSeguimientoValues,
  updateSeguimiento,
  deleteSeguimiento,
  listSeguimientoHistorial,
  listSeguimientoHistorialTodas,
  insertSeguimientoHistorial,
  clearSeguimiento,
  createSeguimientoImport,
};
