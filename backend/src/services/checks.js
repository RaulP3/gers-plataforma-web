const { getQuery } = require('../db');
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

const runAlertChecks = async () => {
  await checkGeofences();
  await checkFuel();
};

module.exports = {
  performFuelCheck,
  checkFuel,
  runAlertChecks,
};
