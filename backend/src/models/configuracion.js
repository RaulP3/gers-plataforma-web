const { getQuery, runQuery } = require('../db');

async function getConfig(clave, fallback = null) {
  const row = await getQuery('SELECT valor FROM configuracion WHERE clave = ?', [clave]);
  if (!row || row.valor == null) return fallback;
  try {
    return JSON.parse(row.valor);
  } catch (e) {
    return row.valor;
  }
}

async function setConfig(clave, valor) {
  const serialized = typeof valor === 'string' ? valor : JSON.stringify(valor);
  await runQuery(
    `INSERT INTO configuracion (clave, valor, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, updated_at = excluded.updated_at`,
    [clave, serialized]
  );
}

module.exports = { getConfig, setConfig };