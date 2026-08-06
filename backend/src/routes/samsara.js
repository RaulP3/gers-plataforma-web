const express = require('express');
const { db, getQuery, runQuery } = require('../db');
const {
  refreshSamsaraVehicles,
  fetchSamsaraDrivers,
  fetchSamsaraAddresses,
  syncOperatorToSamsara,
} = require('../services/samsara');

const router = express.Router();

router.get('/samsara/vehicles', async (req, res) => {
  try {
    const enrichedVehicles = await refreshSamsaraVehicles();
    res.json(enrichedVehicles);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener vehículos', details: error.message });
  }
});

router.get('/vehicle-operators', (req, res) => {
  db.all('SELECT * FROM vehicle_operators', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.put('/vehicle-operators/:vehicleId', async (req, res) => {
  try {
    const row = await getQuery('SELECT * FROM vehicle_operators WHERE vehicle_id = ?', [req.params.vehicleId]);
    const has = (key) => Object.prototype.hasOwnProperty.call(req.body || {}, key);
    const next = {
      vehicle_name: has('vehicle_name') ? req.body.vehicle_name : (row?.vehicle_name || null),
      operator_name: has('operator_name') ? req.body.operator_name : (row?.operator_name || ''),
      telefono: has('telefono') ? req.body.telefono : (row?.telefono || ''),
      driver_id_samsara: has('driver_id_samsara') ? req.body.driver_id_samsara : (row?.driver_id_samsara || ''),
    };
    let result;
    if (row) {
      result = await runQuery(
        'UPDATE vehicle_operators SET vehicle_name = ?, operator_name = ?, telefono = ?, driver_id_samsara = ?, updated_at = datetime(\'now\') WHERE vehicle_id = ?',
        [next.vehicle_name, next.operator_name, next.telefono, next.driver_id_samsara, req.params.vehicleId]
      );
    } else {
      result = await runQuery(
        'INSERT INTO vehicle_operators (vehicle_id, vehicle_name, operator_name, telefono, driver_id_samsara, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
        [req.params.vehicleId, next.vehicle_name, next.operator_name, next.telefono, next.driver_id_samsara]
      );
    }

    const syncPromise = syncOperatorToSamsara(req.params.vehicleId, next.operator_name, next.driver_id_samsara);
    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ ok: false, message: 'Tiempo de espera agotado al sincronizar con Samsara' }), 20000));
    const samsara_sync = await Promise.race([syncPromise, timeoutPromise]);
    if (!samsara_sync.ok && !samsara_sync.skipped) {
      console.error('Sync operador→Samsara falló:', samsara_sync.message);
    }

    res.json({ changes: result.changes, driver_id_samsara: next.driver_id_samsara, samsara_sync });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/samsara/drivers', async (req, res) => {
  try {
    const allDrivers = await fetchSamsaraDrivers();
    res.json(allDrivers.map(d => ({
      id: d.id,
      name: d.name,
      username: d.username,
      phone: d.phone,
      status: d.driverActivationStatus,
      timezone: d.timezone,
      carrier: d.carrierSettings?.carrierName || ''
    })));
  } catch (error) {
    console.error('Error fetching drivers:', error.message);
    res.status(500).json({ error: 'Error al obtener operadores', details: error.message });
  }
});

router.get('/samsara/addresses', async (req, res) => {
  try {
    res.json(await fetchSamsaraAddresses());
  } catch (error) {
    console.error('Error fetching Samsara addresses:', error.message);
    res.json([]);
  }
});

module.exports = router;
