const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const sqlite3 = require('sqlite3');

const port = 3200 + Math.floor(Math.random() * 500);
const databasePath = path.join(os.tmpdir(), `gers-smoke-${process.pid}-${Date.now()}.db`);
const baseUrl = `http://127.0.0.1:${port}/api`;
let token = '';

const server = spawn(process.execPath, ['server.js'], {
  cwd: path.join(__dirname, '..'),
  env: {
    ...process.env,
    PORT: String(port),
    DATABASE_PATH: databasePath,
    ADMIN_USERNAME: 'smoke-admin',
    ADMIN_PASSWORD: 'SmokePass-2026!',
    ADMIN_NAME: 'Smoke Admin',
    SAMSARA_API_TOKEN: 'smoke-token',
    NODE_ENV: 'test',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverOutput = '';
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });

async function request(pathname, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${baseUrl}${pathname}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${pathname}: ${response.status} ${JSON.stringify(data)}`);
  return data;
}

async function waitForServer() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const login = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'smoke-admin', password: 'SmokePass-2026!' }),
      });
      token = login.token;
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  throw new Error(`El backend no inició a tiempo.\n${serverOutput}`);
}

function seedRouteHistory(rows) {
  return new Promise((resolve, reject) => {
    const database = new sqlite3.Database(databasePath);
    const statement = database.prepare(
      `INSERT INTO route_history
       (vehicle_id, vehicle_name, latitude, longitude, speed, heading, location, source_time_ms, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    database.serialize(() => {
      for (const row of rows) statement.run(row);
      statement.finalize(err => {
        if (err) return database.close(() => reject(err));
        database.close(closeErr => closeErr ? reject(closeErr) : resolve());
      });
    });
  });
}

async function run() {
  await waitForServer();

  const health = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(health.status, 200);
  const anonymousLive = await fetch(`${baseUrl}/live`);
  assert.equal(anonymousLive.status, 401);

  const now = Date.now();
  await seedRouteHistory([
    ['smoke-stop', 'Smoke truck', 20.67, -103.35, 0, 0, 'Patio', now - 50 * 60000, new Date(now - 50 * 60000).toISOString()],
    ['smoke-stop', 'Smoke truck', 20.6701, -103.3501, 0, 0, 'Patio', now - 35 * 60000, new Date(now - 35 * 60000).toISOString()],
    ['smoke-stop', 'Smoke truck', 20.6701, -103.35, 0, 0, 'Patio', now - 25 * 60000, new Date(now - 25 * 60000).toISOString()],
    ['smoke-stop', 'Smoke truck', 20.68, -103.36, 20, 0, 'En ruta', now - 20 * 60000, new Date(now - 20 * 60000).toISOString()],
    ['smoke-stop', 'Smoke truck', 20.69, -103.37, 0, 0, 'Cliente', now - 10 * 60000, new Date(now - 10 * 60000).toISOString()],
    ['smoke-stop', 'Smoke truck', 20.6901, -103.3701, 0, 0, 'Cliente', now - 5 * 60000, new Date(now - 5 * 60000).toISOString()],
  ]);
  const stops = await request('/route-history/last?vehicle_id=smoke-stop&hours=2&stops_minutes=20');
  assert.equal(stops.length, 1);
  assert.equal(stops[0].is_stop, true);
  assert.equal(stops[0].stop_duration_minutes, 25);

  const disposableUser = await request('/users', {
    method: 'POST',
    body: JSON.stringify({ username: 'smoke-disposable', password: 'DisposablePass-2026!', nombre: 'Disposable', rol: 'user' }),
  });
  assert.equal((await request(`/users/${disposableUser.id}`, { method: 'DELETE' })).deleted, 1);
  assert.equal((await request('/users')).some(user => user.id === disposableUser.id), false);

  const pending = await request('/pendientes', {
    method: 'POST',
    body: JSON.stringify({ titulo: 'Smoke pending', prioridad: 'media' }),
  });
  await request(`/pendientes/${pending.id}`, {
    method: 'PUT',
    body: JSON.stringify({ prioridad: 'alta' }),
  });
  const pendingRows = await request('/pendientes');
  assert.equal(pendingRows.find(row => row.id === pending.id)?.prioridad, 'alta');
  assert.equal((await request(`/pendientes/${pending.id}`, { method: 'DELETE' })).changes, 1);

  const map = await request('/mapas', {
    method: 'POST',
    body: JSON.stringify({
      nombre: 'Smoke My Map',
      descripcion: 'Mapa para CRUD smoke',
      origen: 'Monterrey',
      destino: 'Saltillo',
      url: 'https://www.google.com/maps/d/viewer?mid=smoke-test',
    }),
  });
  assert.equal(map.nombre, 'Smoke My Map');
  assert.equal(map.created_by_username, 'smoke-admin');
  const updatedMap = await request(`/mapas/${map.id}`, {
    method: 'PUT',
    body: JSON.stringify({ descripcion: 'Descripción actualizada' }),
  });
  assert.equal(updatedMap.descripcion, 'Descripción actualizada');
  assert.equal(updatedMap.nombre, 'Smoke My Map');
  assert.equal(updatedMap.url, map.url);
  assert.equal((await request('/mapas')).some(row => row.id === map.id), true);
  assert.equal((await request(`/mapas/${map.id}`, { method: 'DELETE' })).deleted, 1);
  assert.equal((await request('/mapas')).some(row => row.id === map.id), false);

  const directTrip = await request('/viajes', {
    method: 'POST',
    body: JSON.stringify({
      vehicle_id: 'smoke-direct',
      vehicle_name: 'Smoke Direct Unit',
      origen: 'Monterrey',
      destino: 'Saltillo',
      conductor: 'Direct Driver',
      tipo_entrega: 'directo',
      notas: 'Preserve direct fields',
    }),
  });
  const repartoTrip = await request('/viajes', {
    method: 'POST',
    body: JSON.stringify({
      vehicle_id: 'smoke-reparto',
      vehicle_name: 'Smoke Reparto Unit',
      origen: 'Monterrey',
      tipo_entrega: 'reparto',
      destinos: ['San Luis Potosí', 'Querétaro', 'Ciudad de México'],
      conductor: 'Reparto Driver',
      notas: 'Preserve reparto fields',
    }),
  });
  let trips = await request('/viajes');
  let storedDirect = trips.find(row => row.id === directTrip.id);
  let storedReparto = trips.find(row => row.id === repartoTrip.id);
  assert.equal(storedDirect.tipo_entrega, 'directo');
  assert.deepEqual(JSON.parse(storedDirect.destinos_json), ['Saltillo']);
  assert.equal(storedDirect.destino, 'Saltillo');
  assert.equal(storedReparto.tipo_entrega, 'reparto');
  assert.deepEqual(JSON.parse(storedReparto.destinos_json), ['San Luis Potosí', 'Querétaro', 'Ciudad de México']);
  assert.equal(storedReparto.destino, 'Ciudad de México');

  await request(`/viajes/${directTrip.id}`, {
    method: 'PUT',
    body: JSON.stringify({ estado: 'proceso_carga' }),
  });
  await request(`/viajes/${repartoTrip.id}`, {
    method: 'PUT',
    body: JSON.stringify({ estado: 'en_ruta_cargado' }),
  });
  trips = await request('/viajes');
  storedDirect = trips.find(row => row.id === directTrip.id);
  storedReparto = trips.find(row => row.id === repartoTrip.id);
  assert.equal(storedDirect.estado, 'proceso_carga');
  assert.equal(storedDirect.tipo_entrega, 'directo');
  assert.deepEqual(JSON.parse(storedDirect.destinos_json), ['Saltillo']);
  assert.equal(storedDirect.destino, 'Saltillo');
  assert.equal(storedDirect.notas, 'Preserve direct fields');
  assert.equal(storedReparto.estado, 'en_ruta_cargado');
  assert.equal(storedReparto.tipo_entrega, 'reparto');
  assert.deepEqual(JSON.parse(storedReparto.destinos_json), ['San Luis Potosí', 'Querétaro', 'Ciudad de México']);
  assert.equal(storedReparto.destino, 'Ciudad de México');
  assert.equal(storedReparto.conductor, 'Reparto Driver');

  const completedPending = await request('/pendientes', {
    method: 'POST',
    body: JSON.stringify({ titulo: 'Smoke completed', prioridad: 'baja' }),
  });
  await request(`/pendientes/${completedPending.id}`, {
    method: 'PUT',
    body: JSON.stringify({ estado: 'completado' }),
  });
  assert.equal((await request('/pendientes/archivar-completados', { method: 'POST' })).archived, 1);
  assert.equal((await request('/pendientes')).some(row => row.id === completedPending.id), false);
  assert.equal((await request('/pendientes/historial')).some(row => row.pendiente_id === completedPending.id), true);

  await request('/vehicle-operators/smoke-unit', {
    method: 'PUT',
    body: JSON.stringify({ vehicle_name: 'Smoke Unit', operator_name: 'Smoke Operator', telefono: '521000000000' }),
  });
  const operators = await request('/vehicle-operators');
  assert.equal(operators.find(row => row.vehicle_id === 'smoke-unit')?.operator_name, 'Smoke Operator');

  const trailerA = await request('/remolques', { method: 'POST', body: JSON.stringify({ numero: `SMOKE-A-${Date.now()}`, categoria: 'Tanque' }) });
  const trailerB = await request('/remolques', { method: 'POST', body: JSON.stringify({ numero: `SMOKE-B-${Date.now()}`, categoria: 'tanque' }) });
  const trailerC = await request('/remolques', { method: 'POST', body: JSON.stringify({ numero: `SMOKE-C-${Date.now()}`, categoria: 'Caja Seca' }) });
  const assignment = JSON.stringify({ vehicle_id: 'smoke-unit', vehicle_name: 'Smoke Unit' });
  const full = await request('/remolques/full/asignar', {
    method: 'POST',
    body: JSON.stringify({ remolque_ids: [trailerA.id, trailerB.id], vehicle_id: 'smoke-unit', vehicle_name: 'Smoke Unit' }),
  });
  assert.equal(full.tanques.length, 2);
  assert.ok(full.grupo_full);
  let activeAssignments = await request('/remolques/asignaciones/activas');
  const fullRows = activeAssignments.filter(row => row.vehicle_id === 'smoke-unit');
  assert.deepEqual(fullRows.map(row => row.remolque_id).sort((a, b) => a - b), [trailerA.id, trailerB.id].sort((a, b) => a - b));
  assert.ok(fullRows.every(row => row.tipo_asignacion === 'full' && row.grupo_full === full.grupo_full));

  await request(`/remolques/${trailerC.id}/asignar`, { method: 'POST', body: assignment });
  activeAssignments = await request('/remolques/asignaciones/activas');
  assert.deepEqual(activeAssignments.filter(row => row.vehicle_id === 'smoke-unit').map(row => row.remolque_id), [trailerC.id]);
  const trailers = await request('/remolques');
  assert.equal(trailers.find(row => row.id === trailerA.id)?.status, 'disponible');
  assert.equal(trailers.find(row => row.id === trailerB.id)?.status, 'disponible');
  assert.equal(trailers.find(row => row.id === trailerC.id)?.tipo_asignacion, 'sencillo');

  await assert.rejects(
    request('/remolques/full/asignar', {
      method: 'POST',
      body: JSON.stringify({ remolque_ids: [trailerA.id, trailerC.id], vehicle_id: 'smoke-unit-2', vehicle_name: 'Smoke Unit 2' }),
    }),
    /400.*Tanque/
  );

  const geofenceA = await request('/geofences', {
    method: 'POST',
    body: JSON.stringify({ nombre: 'Smoke G1', latitud: 20, longitud: -100, radio_metros: 500 }),
  });
  const geofenceB = await request('/geofences', {
    method: 'POST',
    body: JSON.stringify({ nombre: 'Smoke G2', latitud: 21, longitud: -101, radio_metros: 500 }),
  });
  const toggled = await request('/geofences/toggle', {
    method: 'PUT',
    body: JSON.stringify({ ids: [geofenceA.id, geofenceB.id], activa: 0 }),
  });
  assert.equal(toggled.changes, 2);

  const imported = await request('/seguimiento/import', {
    method: 'POST',
    body: JSON.stringify([{ unidad: 'Smoke Unit', operador: 'Smoke Operator', estatus: 'Disponible' }]),
  });
  assert.equal(imported.imported, 1);
}

run()
  .then(() => console.log('Smoke test OK'))
  .catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    server.kill();
    for (const suffix of ['', '-shm', '-wal']) {
      try { fs.rmSync(`${databasePath}${suffix}`, { force: true }); } catch {}
    }
  });
