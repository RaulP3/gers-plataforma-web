const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const sqlite3 = require('sqlite3');

const port = 3200 + Math.floor(Math.random() * 500);
const dbPath = path.join(os.tmpdir(), `gers-conc-${process.pid}-${Date.now()}.db`);
const baseUrl = `http://127.0.0.1:${port}/api`;
const ADMIN = 'concurrency-admin';
const PASS = 'ConcPass-2026!';
let token = '';
let server = null;

function startServer() {
  server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_PATH: dbPath,
      ADMIN_USERNAME: ADMIN,
      ADMIN_PASSWORD: PASS,
      ADMIN_NAME: 'Conc Admin',
      NODE_ENV: 'test',
      ALLOW_PRIVATE_NETWORK_ORIGINS: 'true',
    },
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
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${pathname}: ${response.status} ${JSON.stringify(data)}`);
  return data;
}

function waitForServer() {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 15000;
    const attempt = async () => {
      if (Date.now() > deadline) return reject(new Error('backend no inició'));
      try {
        const login = await request('/auth/login', { method: 'POST', body: JSON.stringify({ username: ADMIN, password: PASS }) });
        token = login.token; resolve();
      } catch { setTimeout(attempt, 200); }
    };
    attempt();
  });
}

async function run() {
  startServer();
  await waitForServer();

  const payload = (i) => ({
    nombre: `Ruta paralela ${i}`,
    origen: 'Monterrey',
    destino: `Destino ${i}`,
    tipo_entrega: 'directo',
    destinos: [`Destino ${i}`],
    descripcion: 'Detectada test concurrency',
    url: `https://www.google.com/maps/d/viewer?mid=mid${i}`,
  });

  const N = 4;
  const start = Date.now();
  const resultados = await Promise.allSettled(
    Array.from({ length: N }, (_, i) => request('/mapas', { method: 'POST', body: JSON.stringify(payload(i)) }))
  );
  const elapsed = Date.now() - start;
  resultados.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      assert.equal(r.value.nombre, `Ruta paralela ${i}`, `ruta ${i} nombre`);
    } else {
      throw new Error(`ruta ${i} falló: ${r.reason.message}`);
    }
  });
  console.log(`OK: ${N} rutas guardadas en paralelo en ${elapsed}ms (sin cuelgue).`);
  assert.ok(elapsed < 15000, 'las guardadas paralelas no deberían tardar >15s');

  // reparto multi-destino concurrency (el path que valida destinos distintos)
  const repartoPayload = (i) => ({
    nombre: `Reparto ${i}`,
    origen: 'Monterrey',
    tipo_entrega: 'reparto',
    destinos: [`P${i}-A`, `P${i}-B`, `P${i}-C`],
    url: `https://www.google.com/maps/d/viewer?mid=rm${i}`,
  });
  const repartoRes = await Promise.allSettled(
    Array.from({ length: 3 }, (_, i) => request('/mapas', { method: 'POST', body: JSON.stringify(repartoPayload(i)) }))
  );
  repartoRes.forEach((r, i) => assert.equal(r.status, 'fulfilled', `reparto ${i}: ${r.reason && r.reason.message}`));
  console.log('OK: 3 repartos multi-destino guardados en paralelo.');

  // cleanup
  const mapas = await request('/mapas');
  await Promise.all(mapas.map(m => request(`/mapas/${m.id}`, { method: 'DELETE' }).catch(() => {})));
  console.log('Limpieza OK.');
}

run()
  .then(() => console.log('CONCURRENCY TEST OK'))
  .catch(e => { console.error('FALLO:', e.message || e); process.exitCode = 1; })
  .finally(() => {
    server?.kill();
    for (const suffix of ['', '-shm', '-wal']) { try { require('node:fs').rmSync(`${dbPath}${suffix}`, { force: true }); } catch {} }
  });
