const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

const port = 3200 + Math.floor(Math.random() * 500);
const databasePath = path.join(os.tmpdir(), `gers-resguardo-${process.pid}-${Date.now()}.db`);
const baseUrl = `http://127.0.0.1:${port}/api`;
const healthUrl = `http://127.0.0.1:${port}/health`;
let server = null;
let serverOutput = '';
let token = '';

const samsaraServer = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ addresses: [], pagination: { hasNextPage: false } }));
});

async function request(pathname, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${pathname}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

(async () => {
  try {
    samsaraServer.listen(port + 600, '127.0.0.1');
    server = spawn(process.execPath, ['server.js'], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        PORT: String(port),
        DATABASE_PATH: databasePath,
        ADMIN_USERNAME: 'smoke-admin',
        ADMIN_PASSWORD: 'SmokePass-2026!',
        ADMIN_NAME: 'Smoke Admin',
        SAMSARA_API_TOKEN: 'smoke-token',
        SAMSARA_API_BASE_URL: `http://127.0.0.1:${port + 600}`,
        NODE_ENV: 'test',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    server.stdout.on('data', chunk => { serverOutput += chunk; });
    server.stderr.on('data', chunk => { serverOutput += chunk; });

    // wait for server + DB ready
    const deadline = Date.now() + 20000;
    let started = false;
    while (Date.now() < deadline) {
      try {
        const r = await fetch(healthUrl);
        if (r.ok) { started = true; break; }
      } catch { }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (!started) throw new Error('Server did not start\n' + serverOutput);

    const login = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'smoke-admin', password: 'SmokePass-2026!' }),
    });
    if (!login.ok || !login.data.token) throw new Error(`login falló: ${login.status} ${JSON.stringify(login.data)}`);
    token = login.data.token;

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const cita = now;

    const creado = await request('/remolques', { method: 'POST', body: JSON.stringify({ numero: 'T1', categoria: 'Tanque' }) });
    if (!creado.ok || !creado.data.id) throw new Error(`no se creó el remolque: ${creado.status} ${JSON.stringify(creado.data)}\n${serverOutput}`);
    const id = creado.data.id;

    const list = await request('/remolques');
    const rem = list.data.find(r => r.id === id);
    assert.equal(rem.resguardo, 0, 'resguardo default 0');
    assert.equal(rem.status, 'disponible', 'status default disponible');

    const res = await request(`/remolques/${id}/resguardo`, { method: 'PUT', body: JSON.stringify({ resguardo: true, fecha_cita: cita }) });
    assert.ok(res.ok, `no se activó resguardo: ${res.status} ${JSON.stringify(res.data)}`);

    const listAfter = await request('/remolques');
    const remAfter = listAfter.data.find(r => r.id === id);
    assert.equal(remAfter.resguardo, 1, 'resguardo debe ser 1');
    assert.equal(remAfter.status, 'resguardo', 'status debe ser resguardo');
    assert.equal(remAfter.fecha_cita, cita, 'fecha_cita debe persistir');

    const id2 = await request('/remolques', { method: 'POST', body: JSON.stringify({ numero: 'T2', categoria: 'Tanque' }) }).then(r => r.data.id);
    const fullBlocked = await request('/remolques/full/asignar', {
      method: 'POST',
      body: JSON.stringify({ remolque_ids: [id, id2], vehicle_id: 'unit-test', vehicle_name: 'U1' }),
    });
    assert.equal(fullBlocked.status, 409, 'no debe armar full con remolque en resguardo');

    const asigBlocked = await request(`/remolques/${id}/asignar`, { method: 'POST', body: JSON.stringify({ vehicle_id: 'unit-test', vehicle_name: 'U1' }) });
    assert.equal(asigBlocked.status, 409, 'no debe asignar remolque en resguardo');

    const fin = await request(`/remolques/${id}/resguardo`, { method: 'PUT', body: JSON.stringify({ resguardo: false }) });
    assert.ok(fin.ok, 'no se desactivó resguardo');

    const asig = await request(`/remolques/${id}/asignar`, { method: 'POST', body: JSON.stringify({ vehicle_id: 'unit-test', vehicle_name: 'U1' }) });
    assert.ok(asig.ok && asig.data.id, 'no se pudo asignar tras quitar resguardo');

    // cleanup
    await request(`/remolques/${id}/desasignar`, { method: 'POST' });
    await request(`/remolques/${id}`, { method: 'PUT', body: JSON.stringify({ resguardo: true }) }).catch(() => {});
    await request(`/remolques/${id2}`, { method: 'DELETE' }).catch(() => {});
    await request(`/remolques/${id}`, { method: 'DELETE' }).catch(() => {});

    console.log('RESGUARDO TEST OK');
    process.exit(0);
  } catch (e) {
    console.error('ERR', e.message);
    console.error('SERVER_OUTPUT', serverOutput);
    process.exit(1);
  }
  try { server && server.kill(); } catch { }
  process.exit(0);
})();
