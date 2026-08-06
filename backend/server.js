require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

const { PORT, allowedOrigins, IS_PRODUCTION } = require('./src/config');
const { db, databaseReady, getQuery } = require('./src/db');
const { broadcastLiveUpdate, liveClients } = require('./src/cache');
const { requireAuth } = require('./src/auth');
const { getUserByToken, refreshSession, ensureDefaultAdmin } = require('./src/models/users');
const { refreshSamsaraVehicles, performSamsaraTrailerRefresh, loadTrailerLocationsCache } = require('./src/services/samsara');
const { runAlertChecks } = require('./src/services/checks');
const { performDatabaseBackup } = require('./src/services/backup');

const authRouter = require('./src/routes/auth');
const turnosRouter = require('./src/routes/turnos');
const kpisRouter = require('./src/routes/kpis');
const mapasRouter = require('./src/routes/mapas');
const samsaraRouter = require('./src/routes/samsara');
const geofencesRouter = require('./src/routes/geofences');
const checksRouter = require('./src/routes/checks');
const viajesRouter = require('./src/routes/viajes');
const alertasRouter = require('./src/routes/alertas');
const pendientesRouter = require('./src/routes/pendientes');
const reportesRouter = require('./src/routes/reportes');
const clientesRouter = require('./src/routes/clientes');
const remolquesRouter = require('./src/routes/remolques');
const seguimientoRouter = require('./src/routes/seguimiento');
const riesgosRouter = require('./src/routes/riesgos');
const backupsRouter = require('./src/routes/backups');

app.use(cors({
  origin: (origin, callback) => {
    const allowPrivateOrigins = !IS_PRODUCTION || process.env.ALLOW_PRIVATE_NETWORK_ORIGINS === 'true';
    const localDevelopmentOrigin = allowPrivateOrigins && origin && (
      /^https?:\/\/localhost(?::\d+)?$/.test(origin) ||
      /^https?:\/\/(?:192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)(?::\d+)?$/.test(origin)
    );
    callback(null, !origin || allowedOrigins.has(origin) || localDevelopmentOrigin);
  },
  credentials: true
}));
app.use(express.json({
  verify: (req, res, buffer) => {
    if (req.originalUrl.split('?')[0] === '/api/webhooks/samsara') req.rawBody = Buffer.from(buffer);
  },
}));

app.get('/health', (req, res) => {
  db.get('SELECT 1 AS ok', [], (err) => {
    if (err) return res.status(503).json({ status: 'unhealthy' });
    res.json({ status: 'ok' });
  });
});

app.get('/api/live', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const queryToken = req.query.token || req.query.access_token;
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-auth-token'] || queryToken);
    if (!token || Array.isArray(token)) return res.status(401).json({ error: 'No autenticado' });
    const user = await getUserByToken(token);
    if (!user) return res.status(401).json({ error: 'Sesión inválida o expirada' });
    await refreshSession(token);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    res.write('event: connected\ndata: {"type":"connected"}\n\n');
    liveClients.add(res);

    req.on('close', () => {
      liveClients.delete(res);
    });
  } catch (err) {
    console.error('Error de autenticación SSE:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Error de autenticación' });
    else res.end();
  }
});

app.use('/api', (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  let notified = false;
  res.on('finish', () => {
    if (!notified && res.statusCode < 400) {
      notified = true;
      broadcastLiveUpdate('reload', { method: req.method, path: req.path });
    }
  });
  next();
});

app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth') || req.path === '/webhooks/samsara') return next();
  return requireAuth(req, res, next);
});

app.use('/api', authRouter);
app.use('/api', turnosRouter);
app.use('/api', kpisRouter);
app.use('/api', mapasRouter);
app.use('/api', samsaraRouter);
app.use('/api', geofencesRouter);
app.use('/api', checksRouter);
app.use('/api', viajesRouter);
app.use('/api', alertasRouter);
app.use('/api', pendientesRouter);
app.use('/api', reportesRouter);
app.use('/api', clientesRouter);
app.use('/api', remolquesRouter);
app.use('/api', seguimientoRouter);
app.use('/api', riesgosRouter);
app.use('/api', backupsRouter);

// ============ AUTO-CHECK INTERVALS ============

let liveSyncInFlight = null;
const runLiveSync = async () => {
  if (liveSyncInFlight) return liveSyncInFlight;
  liveSyncInFlight = (async () => {
    await refreshSamsaraVehicles();
    try {
      await performSamsaraTrailerRefresh();
    } catch (trailerErr) {
      console.error('Error refrescando trailers Samsara:', trailerErr.message);
    }
    await runAlertChecks();
    broadcastLiveUpdate('reload', { source: 'scheduled-sync' });
  })().catch(error => {
    console.error('Error en sincronización programada:', error.message);
  }).finally(() => {
    liveSyncInFlight = null;
  });
  return liveSyncInFlight;
};

async function startServer() {
  await databaseReady;
  const foreignKeys = await getQuery('PRAGMA foreign_keys');
  if (!foreignKeys || Number(foreignKeys.foreign_keys) !== 1) {
    throw new Error('SQLite foreign keys no pudieron habilitarse');
  }
  await ensureDefaultAdmin();
  await loadTrailerLocationsCache().catch(() => {});
  setTimeout(() => performDatabaseBackup().then(r => console.log(`Backup inicial completado: ${r.destination}${r.removed ? ` (${r.removed} eliminados)` : ''}`)).catch(e => console.error('Backup inicial falló:', e.message)), 60000);
  setInterval(() => performDatabaseBackup().then(r => console.log(`Backup automático completado: ${r.destination}`)).catch(e => console.error('Backup automático falló:', e.message)), 24 * 60 * 60 * 1000);
  setTimeout(runLiveSync, 10000);
  setInterval(runLiveSync, 60000);
  app.listen(PORT, () => {
    console.log(`Servidor GERS corriendo en puerto ${PORT}`);
  });
}

startServer().catch(error => {
  console.error('No se pudo iniciar el servidor:', error.message);
  process.exitCode = 1;
});
