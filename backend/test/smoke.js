const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const sqlite3 = require('sqlite3');

const port = 3200 + Math.floor(Math.random() * 500);
const databasePath = path.join(os.tmpdir(), `gers-smoke-${process.pid}-${Date.now()}.db`);
const baseUrl = `http://127.0.0.1:${port}/api`;
const samsaraPort = port + 600;
let token = '';
let server = null;
let samsaraServer = null;
let serverOutput = '';
let mockLocations = [
  { id: 'smoke-circle-unit', name: 'Smoke Circle Unit', location: { latitude: 20, longitude: -100 } },
  { id: 'smoke-polygon-unit', name: 'Smoke Polygon Unit', location: { latitude: 22, longitude: -101 } },
  { id: 'smoke-catalog-unit', name: 'Smoke Catalog Unit', location: { latitude: 25.7894, longitude: -100.1824 } },
];

function startServer() {
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
      SAMSARA_API_BASE_URL: `http://127.0.0.1:${samsaraPort}`,
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', chunk => { serverOutput += chunk; });
  server.stderr.on('data', chunk => { serverOutput += chunk; });
}

function startSamsaraServer() {
  samsaraServer = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url.startsWith('/addresses')) {
      return res.end(JSON.stringify({
        addresses: [
          {
            id: 'smoke-circle',
            name: 'Samsara Circle',
            geofence: { circle: { latitude: 20, longitude: -100, radiusMeters: 500 } },
          },
          {
            id: 'smoke-polygon',
            name: 'Samsara Polygon',
            geofence: { polygon: { vertices: [
              { latitude: 21.99, longitude: -101.01 },
              { latitude: 22.01, longitude: -101.01 },
              { latitude: 22.01, longitude: -100.99 },
              { latitude: 21.99, longitude: -100.99 },
            ] } },
          },
        ],
        pagination: { hasNextPage: false },
      }));
    }
    if (req.url.startsWith('/fleet/vehicles/locations')) {
      return res.end(JSON.stringify({ data: mockLocations, pagination: { hasNextPage: false } }));
    }
    if (req.url.startsWith('/v1/fleet/list')) return res.end(JSON.stringify({ vehicles: [] }));
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'not found' }));
  });
  return new Promise(resolve => samsaraServer.listen(samsaraPort, '127.0.0.1', resolve));
}

function seedLegacyHistorySchema() {
  return new Promise((resolve, reject) => {
    const database = new sqlite3.Database(databasePath);
    database.run(`CREATE TABLE pendientes_historial (
      id INTEGER PRIMARY KEY AUTOINCREMENT, pendiente_id INTEGER, titulo TEXT NOT NULL,
      descripcion TEXT, prioridad TEXT, estado TEXT, asignado_a TEXT, turno TEXT, notas TEXT,
      creado_por TEXT, created_by_user_id INTEGER, created_by_username TEXT,
      fecha_creacion DATETIME, fecha_actualizacion DATETIME,
      archived_by_user_id INTEGER, archived_by_username TEXT,
      archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, err => database.close(closeErr => err || closeErr ? reject(err || closeErr) : resolve()));
  });
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
  await startSamsaraServer();
  await seedLegacyHistorySchema();
  startServer();
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
  const routeWithStops = await request('/route-history/last?vehicle_id=smoke-stop&hours=2&stops_minutes=20&include_route=1');
  assert.equal(routeWithStops.route.length, 6);
  assert.equal(routeWithStops.stops.length, 1);
  assert.equal(routeWithStops.stops[0].stop_duration_minutes, 25);

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
  assert.equal(storedReparto.paradas.length, 3);
  assert.deepEqual(storedReparto.paradas.map(stop => stop.estado), ['en_camino', 'pendiente', 'pendiente']);
  let stopUpdate = await request(`/viajes/${repartoTrip.id}/paradas/${storedReparto.paradas[0].id}`, {
    method: 'PUT',
    body: JSON.stringify({ estado: 'llego' }),
  });
  const firstArrival = stopUpdate.paradas[0].hora_llegada;
  assert.ok(firstArrival);
  stopUpdate = await request(`/viajes/${repartoTrip.id}/paradas/${storedReparto.paradas[0].id}`, {
    method: 'PUT',
    body: JSON.stringify({ estado: 'llego' }),
  });
  assert.equal(stopUpdate.paradas[0].hora_llegada, firstArrival);
  stopUpdate = await request(`/viajes/${repartoTrip.id}/paradas/${storedReparto.paradas[0].id}`, {
    method: 'PUT',
    body: JSON.stringify({ estado: 'completada' }),
  });
  const firstDeparture = stopUpdate.paradas[0].hora_salida;
  await new Promise(resolve => setTimeout(resolve, 10));
  stopUpdate = await request(`/viajes/${repartoTrip.id}/paradas/${storedReparto.paradas[0].id}`, {
    method: 'PUT',
    body: JSON.stringify({ estado: 'completada' }),
  });
  assert.notEqual(stopUpdate.paradas[0].hora_salida, firstDeparture);
  assert.equal(stopUpdate.paradas[1].estado, 'en_camino');

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

  const activos = await request('/viajes/activos');
  const activoReparto = activos.find(row => row.id === repartoTrip.id);
  assert.ok(activoReparto, 'viaje reparto debe aparecer en activos');
  assert.equal(activoReparto.paradas.length, 3);
  assert.equal(activoReparto.paradas.find(stop => stop.orden === 2)?.estado, 'en_camino');

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

  const client = await request('/clientes', {
    method: 'POST',
    body: JSON.stringify({ nombre: 'Smoke Cliente', contacto: 'Contacto Inicial', telefono: '614 000 0000', email: 'CLIENTE@EXAMPLE.COM' }),
  });
  assert.equal(client.email, 'cliente@example.com');
  assert.equal((await request(`/clientes/${client.id}`)).nombre, 'Smoke Cliente');
  const updatedClient = await request(`/clientes/${client.id}`, {
    method: 'PUT',
    body: JSON.stringify({ contacto: 'Contacto Actualizado', telefono: '614 111 1111' }),
  });
  assert.equal(updatedClient.contacto, 'Contacto Actualizado');
  assert.equal(updatedClient.nombre, 'Smoke Cliente');
  assert.equal((await request('/clientes')).some(row => row.id === client.id), true);
  const clientGeofence = await request('/geofences', {
    method: 'POST',
    body: JSON.stringify({ nombre: 'Smoke Cliente Geofence', latitud: 24, longitud: -104, radio_metros: 750, cliente_id: client.id }),
  });
  const clientGeofences = await request(`/geofences?cliente_id=${client.id}`);
  assert.equal(clientGeofences.length, 1);
  assert.equal(clientGeofences[0].id, clientGeofence.id);
  assert.equal(clientGeofences[0].cliente_id, client.id);
  const linkedLocal = await request(`/clientes/${client.id}/geofences/link`, {
    method: 'POST',
    body: JSON.stringify({ source: 'local', geofence_id: clientGeofence.id }),
  });
  assert.equal(linkedLocal.geofence_ref, String(clientGeofence.id));
  const linkedSamsara = await request(`/clientes/${client.id}/geofences/link`, {
    method: 'POST',
    body: JSON.stringify({ source: 'samsara', geofence_id: 'smoke-circle' }),
  });
  assert.equal(linkedSamsara.geofence_ref, 'smoke-circle');
  assert.equal((await request('/clientes/geofence-links')).some(link => link.geofence_ref === 'smoke-circle' && link.cliente_id === client.id), true);
  assert.equal((await request(`/clientes/${client.id}/geofences/samsara/smoke-circle`, { method: 'DELETE' })).unlinked, 1);
  await request(`/clientes/${client.id}/geofences/link`, {
    method: 'POST',
    body: JSON.stringify({ source: 'samsara', geofence_id: 'smoke-circle' }),
  });
  await assert.rejects(
    request(`/clientes/${client.id}`, { method: 'PUT', body: JSON.stringify({ email: 'correo-invalido' }) }),
    /400.*email no es válido/
  );

  const trailerNumA = `SMOKE-A-${Date.now()}`;
  const trailerNumB = `SMOKE-B-${Date.now()}`;
  const trailerNumC = `SMOKE-C-${Date.now()}`;
  const trailerA = await request('/remolques', { method: 'POST', body: JSON.stringify({ numero: trailerNumA, categoria: 'Tanque' }) });
  const trailerB = await request('/remolques', { method: 'POST', body: JSON.stringify({ numero: trailerNumB, categoria: 'tanque' }) });
  const trailerC = await request('/remolques', { method: 'POST', body: JSON.stringify({ numero: trailerNumC, categoria: 'Caja Seca' }) });
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

  const tripSencillo = await request('/viajes', {
    method: 'POST',
    body: JSON.stringify({
      vehicle_id: 'smoke-unit',
      vehicle_name: 'Smoke Unit',
      origen: 'Monterrey',
      destino: 'Saltillo',
      tipo_entrega: 'directo',
      remolque: trailerNumA,
    }),
  });
  await request(`/viajes/${tripSencillo.id}`, {
    method: 'PUT',
    body: JSON.stringify({ estado: 'en_ruta_cargado' }),
  });
  let activeAfterTrip = await request('/remolques/asignaciones/activas');
  assert.deepEqual(activeAfterTrip.filter(row => row.vehicle_id === 'smoke-unit').map(row => row.remolque_id), [trailerA.id]);
  let trailersAfterTrip = await request('/remolques');
  assert.equal(trailersAfterTrip.find(row => row.id === trailerA.id)?.status, 'asignado');
  assert.equal(trailersAfterTrip.find(row => row.id === trailerC.id)?.status, 'disponible');

  const tripFull = await request('/viajes', {
    method: 'POST',
    body: JSON.stringify({
      vehicle_id: 'smoke-unit',
      vehicle_name: 'Smoke Unit',
      origen: 'Monterrey',
      destino: 'Querétaro',
      tipo_entrega: 'directo',
      remolque: `#${trailerNumA} + #${trailerNumB}`,
    }),
  });
  await request(`/viajes/${tripFull.id}`, {
    method: 'PUT',
    body: JSON.stringify({ estado: 'en_ruta_vacio' }),
  });
  activeAfterTrip = await request('/remolques/asignaciones/activas');
  assert.deepEqual(
    activeAfterTrip.filter(row => row.vehicle_id === 'smoke-unit').map(row => row.remolque_id).sort((a, b) => a - b),
    [trailerA.id, trailerB.id].sort((a, b) => a - b)
  );
  assert.ok(activeAfterTrip.every(row => row.vehicle_id === 'smoke-unit' && row.tipo_asignacion === 'full' && row.grupo_full));
  trailersAfterTrip = await request('/remolques');
  assert.equal(trailersAfterTrip.find(row => row.id === trailerA.id)?.status, 'asignado');
  assert.equal(trailersAfterTrip.find(row => row.id === trailerB.id)?.status, 'asignado');
  assert.equal(trailersAfterTrip.find(row => row.id === trailerC.id)?.status, 'disponible');

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

  const geofenceCheck = await request('/check-geofences', { method: 'POST' });
  assert.equal(geofenceCheck.newAlerts, 3);
  const geofenceEvents = await request('/geofence-events?limit=20');
  assert.equal(geofenceEvents.some(event => event.geofence_nombre === 'Samsara Circle' && event.source === 'samsara' && event.tipo === 'entrada'), true);
  assert.equal(geofenceEvents.some(event => event.geofence_nombre === 'Samsara Polygon' && event.source === 'samsara' && event.tipo === 'entrada'), true);
  assert.equal(geofenceEvents.some(event => event.geofence_nombre === 'GERS Planta Principal' && event.source === 'local' && event.tipo === 'entrada'), true);
  const customerAlert = (await request('/alertas')).find(alert => alert.tipo === 'cliente_geocerca');
  assert.ok(customerAlert);
  assert.match(customerAlert.mensaje, /Smoke Circle Unit entró a "Samsara Circle" del cliente "Smoke Cliente"/);
  const archivedAlerts = await request('/alertas/archivar-todas', { method: 'PUT' });
  assert.ok(archivedAlerts.archived >= 1);
  assert.equal((await request('/alertas')).some(alert => alert.id === customerAlert.id), false);
  assert.equal((await request('/alertas?archivadas=1')).some(alert => alert.id === customerAlert.id), true);
  assert.equal((await request(`/alertas/${customerAlert.id}/restaurar`, { method: 'PUT' })).restored, 1);
  assert.equal((await request('/alertas')).some(alert => alert.id === customerAlert.id), true);

  const liveStream = await fetch(`${baseUrl}/live?token=${encodeURIComponent(token)}`);
  assert.equal(liveStream.status, 200);
  const liveReader = liveStream.body.getReader();
  const decoder = new TextDecoder();
  let liveBuffer = '';
  const liveEvents = [];
  const liveCollector = (async () => {
    for (let i = 0; i < 400; i++) {
      const { done, value } = await liveReader.read();
      if (done) break;
      liveBuffer += decoder.decode(value, { stream: true });
      let boundary;
      while ((boundary = liveBuffer.indexOf('\n\n')) !== -1) {
        const chunk = liveBuffer.slice(0, boundary);
        liveBuffer = liveBuffer.slice(boundary + 2);
        const eventLine = chunk.split('\n').find(line => line.startsWith('event: '));
        if (eventLine) liveEvents.push(eventLine.slice(7));
      }
    }
  })();
  await request('/alertas', {
    method: 'POST',
    body: JSON.stringify({ vehicle_id: 'smoke-live', vehicle_name: 'Smoke Live', tipo: 'velocidad', mensaje: 'Smoke Live alerta', severidad: 'alta' }),
  });
  await new Promise(resolve => setTimeout(resolve, 500));
  await liveReader.cancel();
  await liveCollector;
  assert.equal(liveEvents.includes('new-alert'), true, 'debe emitirse el evento SSE new-alert al crear una alerta');

  assert.equal((await request(`/clientes/${client.id}`, { method: 'DELETE' })).deleted, 1);
  assert.equal((await request('/geofences')).find(row => row.id === clientGeofence.id)?.cliente_id, null);
  assert.equal((await request('/clientes/geofence-links')).some(link => link.cliente_id === client.id), false);
  await request(`/geofences/${clientGeofence.id}`, { method: 'DELETE' });

  const destinoGeofence = await request('/geofences', {
    method: 'POST',
    body: JSON.stringify({ nombre: 'Smoke Destino', latitud: 20, longitud: -100, radio_metros: 500 }),
  });
  const geofenceTrip = await request('/viajes', {
    method: 'POST',
    body: JSON.stringify({
      vehicle_id: 'smoke-circle-unit',
      vehicle_name: 'Smoke Circle Unit',
      origen: 'Monterrey',
      destino: 'Smoke Destino',
      conductor: 'Geofence Driver',
      tipo_entrega: 'directo',
    }),
  });
  await request(`/viajes/${geofenceTrip.id}`, {
    method: 'PUT',
    body: JSON.stringify({ estado: 'en_ruta_cargado' }),
  });
  mockLocations = mockLocations.map(v => v.id === 'smoke-circle-unit' ? { ...v, location: { latitude: 20, longitude: -100 } } : v);
  await request('/check-geofences', { method: 'POST' });
  let viajeGeo = (await request('/viajes')).find(row => row.id === geofenceTrip.id);
  assert.equal(viajeGeo.estado, 'espera_ingreso', 'entrada a destino debe poner el viaje en espera_ingreso');
  assert.ok(viajeGeo.hora_llegada, 'entrada a destino debe registrar hora_llegada en el viaje directo');
  mockLocations = mockLocations.map(v => v.id === 'smoke-circle-unit' ? { ...v, location: { latitude: 30, longitude: -110 } } : v);
  await request('/check-geofences', { method: 'POST' });
  viajeGeo = (await request('/viajes')).find(row => row.id === geofenceTrip.id);
  assert.equal(viajeGeo.estado, 'completado', 'salida de destino debe completar el viaje');
  assert.ok(viajeGeo.fecha_fin, 'fecha_fin debe quedar registrada al completar');
  assert.ok(viajeGeo.hora_salida, 'salida de destino debe registrar hora_salida en el viaje directo');
  await request(`/viajes/${geofenceTrip.id}`, { method: 'DELETE' });
  await request(`/geofences/${destinoGeofence.id}`, { method: 'DELETE' });

  const imported = await request('/seguimiento/import', {
    method: 'POST',
    body: JSON.stringify([{ UNIDAD: 'Smoke Unit', OPERADOR: 'Smoke Operator', ESTATUS: 'Disponible' }]),
  });
  assert.equal(imported.imported, 1);
  const trackingReport = await request('/reportes/seguimiento?unidad=Smoke%20Unit');
  assert.equal(trackingReport.length, 1);
  assert.equal(trackingReport[0].unidad, 'Smoke Unit');
  assert.equal(trackingReport[0].operador, 'Smoke Operator');
}

run()
  .then(() => console.log('Smoke test OK'))
  .catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    server?.kill();
    samsaraServer?.close();
    for (const suffix of ['', '-shm', '-wal']) {
      try { fs.rmSync(`${databasePath}${suffix}`, { force: true }); } catch {}
    }
  });
