const { getQuery, allQuery } = require('../db');
const { parseFechaLocal } = require('../utils');
const { samsaraApi } = require('./samsara');
const { checkGeofences } = require('./geofences');
const { createAlertRecord } = require('../models/alertas');

async function performFuelCheck() {
    const listRes = await samsaraApi.get('/fleet/list');
    const vehicles = listRes.data.vehicles || [];

    const alerts = [];
    for (const v of vehicles) {
      if (v.fuelLevelPercent !== null && v.fuelLevelPercent <= 0.2) {
        const recent = await getQuery(
          `SELECT id FROM alertas WHERE vehicle_id = ? AND tipo = 'combustible_bajo' AND timestamp > datetime('now', '-4 hours')`,
          [String(v.id)]
        );

        if (!recent) {
          const pct = Math.round(v.fuelLevelPercent * 100);
          await createAlertRecord({
            vehicle_id: v.id,
            vehicle_name: v.name,
            tipo: 'combustible_bajo',
            mensaje: `${v.name} tiene ${pct}% de diesel - Nivel bajo`,
            severidad: 'alta',
          });
          alerts.push({ vehicle: v.name, fuel: pct });
        }
      }
    }

    return { checked: vehicles.length, newAlerts: alerts.length, alerts };
}

let fuelCheckInFlight = null;
function checkFuel() {
  if (!fuelCheckInFlight) {
    fuelCheckInFlight = performFuelCheck().finally(() => { fuelCheckInFlight = null; });
  }
  return fuelCheckInFlight;
}

function mantenimientoStatus(m) {
  if (m.estado === 'completado') return 'completado';
  const now = Date.now();
  const proxima = m.fecha_proxima ? parseFechaLocal(m.fecha_proxima) : null;
  if (!proxima || Number.isNaN(proxima.getTime())) return 'programado';
  const dias = (proxima.getTime() - now) / (24 * 60 * 60 * 1000);
  if (dias < 0) return 'vencido';
  if (dias <= 7) return 'proximo';
  return 'programado';
}

async function performMantenimientoCheck() {
  const rows = await allQuery("SELECT * FROM mantenimientos WHERE estado != 'completado'");
  const now = Date.now();
  const alerts = [];
  for (const m of rows) {
    const proxima = m.fecha_proxima ? parseFechaLocal(m.fecha_proxima) : null;
    if (!proxima || Number.isNaN(proxima.getTime())) continue;
    const status = mantenimientoStatus({ ...m, fecha_proxima: m.fecha_proxima });
    const dias = (proxima.getTime() - now) / (24 * 60 * 60 * 1000);
    if (status !== 'vencido' && dias > 7) continue;
    const nombre = m.entidad_nombre || m.entidad_id || 'Equipo';
    const label = status === 'vencido' ? 'VENCIDO' : 'PRÓXIMO';
    const recent = await getQuery(
      `SELECT id FROM alertas WHERE tipo = 'mantenimiento' AND mensaje LIKE ? AND timestamp > datetime('now', '-24 hours')`,
      [`%${nombre}%${m.tipo_servicio}%`]
    );
    if (recent) continue;
    await createAlertRecord({
      vehicle_id: m.entidad_id || '',
      vehicle_name: nombre,
      tipo: 'mantenimiento',
      mensaje: `${label}: ${nombre} requiere ${m.tipo_servicio || 'servicio'} (${status === 'vencido' ? 'venció' : 'vence'} ${proxima.toLocaleString('es-MX')})`,
      severidad: status === 'vencido' ? 'alta' : 'media',
    });
    alerts.push({ nombre, servicio: m.tipo_servicio, dias });
  }
  return { checked: rows.length, newAlerts: alerts.length, alerts };
}

let mantenimientoCheckInFlight = null;
function checkMantenimiento() {
  if (!mantenimientoCheckInFlight) {
    mantenimientoCheckInFlight = performMantenimientoCheck().finally(() => { mantenimientoCheckInFlight = null; });
  }
  return mantenimientoCheckInFlight;
}

const runAlertChecks = async () => {
  await checkGeofences();
  await checkFuel();
  try {
    await checkMantenimiento();
  } catch (error) {
    console.error('Error checking mantenimiento:', error.message);
  }
};

module.exports = {
  performFuelCheck,
  checkFuel,
  mantenimientoStatus,
  performMantenimientoCheck,
  checkMantenimiento,
  runAlertChecks,
};
