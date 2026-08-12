const path = require('path');

const backendRoot = path.resolve(__dirname, '..');

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SAMSARA_API_BASE_URL = (process.env.SAMSARA_API_BASE_URL || 'https://api.samsara.com').replace(/\/$/, '');
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || FRONTEND_URL).split(',').map(origin => origin.trim()).filter(Boolean)
);

const DB_PATH = process.env.DATABASE_PATH || path.join(backendRoot, 'gers.db');
const DB_DIR = path.dirname(DB_PATH);

const BACKUP_KEEP_DAYS = 14;
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(DB_DIR, 'backups');

const PBKDF2_ITERATIONS = 120000;
const SESSION_DAYS = 30;
const GEOCODE_CACHE_MAX_ENTRIES = 100;
const GEOCODE_CACHE_TTL_MS = 60 * 60 * 1000;

const TRIP_ROUTE_STATES = new Set(['programado', 'en_ruta_vacio', 'en_ruta_cargado']);
const TRIP_TRAILER_ACTIVE_STATES = new Set(['en_ruta_vacio', 'en_ruta_cargado', 'proceso_carga', 'proceso_descarga', 'proceso_liberacion', 'espera_ingreso', 'en_resguardo']);

const GEOFENCE_EXIT_GRACE_MIN = Number(process.env.GEOFENCE_EXIT_GRACE_MIN) || 30;

module.exports = {
  backendRoot,
  PORT,
  FRONTEND_URL,
  IS_PRODUCTION,
  SAMSARA_API_BASE_URL,
  allowedOrigins,
  DB_PATH,
  DB_DIR,
  BACKUP_KEEP_DAYS,
  BACKUP_DIR,
  PBKDF2_ITERATIONS,
  SESSION_DAYS,
  GEOCODE_CACHE_MAX_ENTRIES,
  GEOCODE_CACHE_TTL_MS,
  TRIP_ROUTE_STATES,
  TRIP_TRAILER_ACTIVE_STATES,
  GEOFENCE_EXIT_GRACE_MIN,
};
