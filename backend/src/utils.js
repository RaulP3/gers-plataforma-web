function parseFechaLocal(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const str = String(value);
  if (str.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(str)) return new Date(str);
  return new Date(str.replace(' ', 'T'));
}

function localTimestampISO(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

function normalizeDestination(value) {
  return String(value).trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-MX');
}

module.exports = { parseFechaLocal, localTimestampISO, normalizeDestination };
