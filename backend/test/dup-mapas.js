const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const port = 3200 + Math.floor(Math.random() * 500);
const dbPath = path.join(os.tmpdir(), `gers-dup-${process.pid}-${Date.now()}.db`);
const baseUrl = `http://127.0.0.1:${port}/api`;
const ADMIN = 'dup-admin', PASS = 'DupPass-2026!';
let token = '';
let server = null;

function startServer() {
  server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), DATABASE_PATH: dbPath, ADMIN_USERNAME: ADMIN, ADMIN_PASSWORD: PASS, ADMIN_NAME: 'Dup Admin', NODE_ENV: 'test', ALLOW_PRIVATE_NETWORK_ORIGINS: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', () => {});
  server.stderr.on('data', () => {});
}

async function request(pathname, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${baseUrl}${pathname}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

async function waitForServer() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const login = await request('/auth/login', { method: 'POST', body: JSON.stringify({ username: ADMIN, password: PASS }) });
      token = login.data.token; return;
    } catch { await new Promise(r => setTimeout(r, 200)); }
  }
  throw new Error('backend no inició');
}

const url = 'https://www.google.com/maps/d/viewer?mid=duptest-mid-1';

(async () => {
  startServer();
  await waitForServer();

  // 1) crear
  const r1 = await request('/mapas', {
    method: 'POST',
    body: JSON.stringify({ nombre: 'Ruta Duplicado', origen: 'Monterrey', destino: 'Saltillo', tipo_entrega: 'directo', destinos: ['Saltillo'], descripcion: 'test', url }),
  });
  assert.equal(r1.ok, true, `1er POST debería 201: ${r1.status} ${JSON.stringify(r1.data)}`);
  const createdId = r1.data.id;
  console.log('1er POST creado id=', createdId);

  // 2) repetir con misma url (ya existe) -> 409
  const r2 = await request('/mapas', {
    method: 'POST',
    body: JSON.stringify({ nombre: 'Ruta Duplicado 2', origen: 'Monterrey', destino: 'Saltillo', tipo_entrega: 'directo', destinos: ['Saltillo'], descripcion: 'test2', url }),
  });
  assert.equal(r2.status, 409, `2do POST mismo url debería 409, obtuvo ${r2.status}: ${JSON.stringify(r2.data)}`);
  assert.match(r2.data.error, /ya está guardada/i);
  console.log('2do POST duplicado -> 409 (validado que existe).');

  // 3) url distinto -> 201
  const r3 = await request('/mapas', {
    method: 'POST',
    body: JSON.stringify({ nombre: 'Otra', origen: 'Monterrey', destino: 'Guadalajara', tipo_entrega: 'directo', destinos: ['Guadalajara'], descripcion: 'x', url: 'https://www.google.com/maps/d/viewer?mid=duptest-mid-2' }),
  });
  assert.equal(r3.ok, true, `url distinta debería crear 201: ${r3.status}`);
  console.log('3er POST url distinta -> 201 OK.');

  // cleanup
  await request(`/mapas/${createdId}`, { method: 'DELETE' });
  await request(`/mapas/${r3.data.id}`, { method: 'DELETE' });
  console.log('CONCURRENCY/DUP TEST OK');
})().catch(e => { console.error('FALLO:', e.message || e); process.exitCode = 1; })
  .finally(() => { server?.kill(); for (const s of ['', '-shm', '-wal']) { try { fs.rmSync(`${dbPath}${s}`, { force: true }); } catch {} } });
