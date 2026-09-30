const express = require('express');
const { calculateRoute } = require('../services/geocode');
const {
  computePuntualidadKpi,
  computeViajesSemanaKpi,
  computeUsoFlotaKpi,
  computeCitasHoyKpi,
  computeRemolquesKpi,
} = require('../services/kpi');

const router = express.Router();

router.get('/kpis', async (req, res) => {
  try {
    const start = Date.now();

    const [puntualidad, viajesSemanas, usoFlota, citasHoy, remolquesKpi] = await Promise.all([
      computePuntualidadKpi(),
      computeViajesSemanaKpi(),
      computeUsoFlotaKpi(),
      computeCitasHoyKpi(),
      computeRemolquesKpi(),
    ]);

    res.json({
      puntualidad,
      viajesPorSemana: viajesSemanas,
      usoFlota,
      citasHoy,
      remolques: remolquesKpi,
      computadoEnMs: Date.now() - start,
    });
  } catch (err) {
    console.error('Error al calcular KPIs:', err);
    res.status(500).json({ error: 'Error al calcular KPIs' });
  }
});

router.post('/calculate-route', async (req, res) => {
  try {
    res.json(await calculateRoute(req.body || {}));
  } catch (error) {
    if (error.status && error.status >= 400 && error.status < 500) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error al calcular ruta:', error.message);
    res.status(502).json({ error: 'El servicio externo de rutas no está disponible' });
  }
});

module.exports = router;
