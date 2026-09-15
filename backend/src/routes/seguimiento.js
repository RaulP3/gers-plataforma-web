const express = require('express');
const axios = require('axios');
const Papa = require('papaparse');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { db, getQuery, allQuery, runQuery, withTransaction } = require('../db');
const { actorFromReq, requireAdmin } = require('../auth');
const { syncTripStops, normalizeTripDelivery, attachTripStops } = require('../services/viajes');

const router = express.Router();

const HISTORY_DIR = path.join(__dirname, '../../data/seguimiento_history');

const SEGUIMIENTO_TO_VIAJE_ESTADO = {
  'disponible': 'disponible',
  'programado': 'programado',
  'en ruta cargado': 'en_ruta_cargado',
  'en ruta vacio': 'en_ruta_vacio',
  'en proceso de carga': 'proceso_carga',
  'en proceso de descarga': 'proceso_descarga',
  'en resguardo': 'en_resguardo',
  'completado': 'completado',
};

async function syncViajeDesdeSeguimiento(unidad, estatus) {
  const targetEstado = SEGUIMIENTO_TO_VIAJE_ESTADO[String(estatus || '').trim().toLowerCase()];
  if (!targetEstado || !unidad) return null;
  const viajes = await allQuery(
    `SELECT * FROM viajes WHERE vehicle_name = ? AND estado NOT IN ('completado', 'cancelado') ORDER BY
     CASE LOWER(COALESCE(estado, '')) WHEN 'programado' THEN 1 ELSE 0 END,
     COALESCE(fecha_inicio, created_at) ASC`,
    [unidad]
  );
  const viaje = viajes[0];
  if (!viaje) return null;
  const previo = String(viaje.estado || '').toLowerCase();
  if (previo === targetEstado) return null;
  if (previo === 'completado' || previo === 'cancelado') return null;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  if (targetEstado === 'completado') {
    await runQuery(
      "UPDATE viajes SET estado = 'completado', fecha_fin = COALESCE(fecha_fin, ?), updated_at = datetime('now') WHERE id = ?",
      [now, viaje.id]
    );
  } else if (targetEstado === 'disponible' || targetEstado === 'programado') {
    if (previo !== 'disponible' && previo !== 'programado') {
      await runQuery(
        "UPDATE viajes SET estado_previo = ?, estado = ?, updated_at = datetime('now') WHERE id = ?",
        [previo, targetEstado, viaje.id]
      );
    }
  } else {
    await runQuery(
      "UPDATE viajes SET estado = ?, updated_at = datetime('now') WHERE id = ?",
      [targetEstado, viaje.id]
    );
  }
  return { id: viaje.id, estado: targetEstado, unidad };
}

async function obtenerViajeCompleto(id) {
  const row = await getQuery('SELECT * FROM viajes WHERE id = ?', [id]);
  if (!row) return null;
  const [completo] = await attachTripStops([row]);
  return completo;
}

async function crearOActualizarViajeDesdeSeguimiento(data, usuario) {
  const unidad = String(data.unidad || '').trim();
  const origen = String(data.origen || '').trim();
  const destino = String(data.destino || '').trim();
  if (!unidad) return null;

  const viajes = await allQuery(
    `SELECT * FROM viajes WHERE vehicle_name = ? AND estado NOT IN ('completado', 'cancelado') ORDER BY
     CASE LOWER(COALESCE(estado, '')) WHEN 'programado' THEN 1 ELSE 0 END,
     COALESCE(fecha_inicio, created_at) ASC`,
    [unidad]
  );
  let viaje = viajes[0] || null;

  const fechaInicio = normalizarFechaCita(data.cita_carga) || null;
  const fechaFin = normalizarFechaCita(data.cita_descarga) || null;

  if (!viaje) {
    if (!origen && !destino) {
      await syncViajeDesdeSeguimiento(unidad, data.estatus);
      return { creado: false, motivo: 'sin-origen-destino', estado: 'estatus-solo' };
    }
    const nuevo = {
      vehicle_id: null,
      vehicle_name: unidad,
      origen: origen || 'Por definir',
      destino: destino || 'Por definir',
      conductor: data.operador || '',
      remolque: data.remolque || '',
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      cita_programada: fechaFin,
    };
    const norm = normalizeTripDelivery(nuevo);
    const result = await runQuery(
      `INSERT INTO viajes (vehicle_id, vehicle_name, origen, destino, tipo_entrega, destinos_json, conductor, telefono, remolque, fecha_inicio, fecha_fin, cita_programada, notas, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [nuevo.vehicle_id, unidad, nuevo.origen, norm.destino, norm.tipo_entrega, norm.destinos_json, nuevo.conductor, nuevo.remolque, nuevo.fecha_inicio, nuevo.fecha_fin, nuevo.cita_programada]
    );
    viaje = { id: result.lastID, ...nuevo };
    try {
      await syncTripStops(viaje);
    } catch (stopsErr) {
      console.error('Error creando paradas del viaje importado:', stopsErr.message);
    }
    const syncResult = await syncViajeDesdeSeguimiento(unidad, data.estatus);
    const viajeCompleto = await obtenerViajeCompleto(result.lastID);
    return { creado: true, id: result.lastID, estado: syncResult?.estado || null, viaje: viajeCompleto };
  }

  const syncResult = await syncViajeDesdeSeguimiento(unidad, data.estatus);
  const camposActualizar = [];
  const valoresActualizar = [];
  if (origen && viaje.origen !== origen) { camposActualizar.push('origen = ?'); valoresActualizar.push(origen); }
  if (destino && viaje.destino !== destino) { camposActualizar.push('destino = ?'); valoresActualizar.push(destino); }
  if (fechaInicio && String(viaje.fecha_inicio || '') !== String(fechaInicio)) { camposActualizar.push('fecha_inicio = ?'); valoresActualizar.push(fechaInicio); }
  if (fechaFin && String(viaje.fecha_fin || '') !== String(fechaFin)) { camposActualizar.push('fecha_fin = ?'); valoresActualizar.push(fechaFin); }
  if (fechaFin && String(viaje.cita_programada || '') !== String(fechaFin)) { camposActualizar.push('cita_programada = ?'); valoresActualizar.push(fechaFin); }
  if (camposActualizar.length) {
    try {
      camposActualizar.push("updated_at = datetime('now')");
      await runQuery(`UPDATE viajes SET ${camposActualizar.join(', ')} WHERE id = ?`, [...valoresActualizar, viaje.id]);
    } catch (updErr) {
      console.error('Error actualizando viaje existente desde seguimiento:', updErr.message);
    }
  }
  const viajeCompleto = await obtenerViajeCompleto(viaje.id);
  return { creado: false, id: viaje.id, estado: syncResult?.estado || null, viaje: viajeCompleto };
}

async function sincronizarViajesDesdeImport(rows) {
  const resultados = [];
  for (const data of rows) {
    try {
      const r = await crearOActualizarViajeDesdeSeguimiento(data);
      if (r) resultados.push({ unidad: data.unidad || '', ...r });
    } catch (err) {
      console.error('Error en sincronización de viajes desde import:', err.message);
      resultados.push({ unidad: data.unidad || '', error: err.message });
    }
  }
  return resultados;
}

router.get('/seguimiento', (req, res) => {
  db.all('SELECT * FROM seguimiento ORDER BY id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

router.post('/seguimiento', (req, res) => {
  const fields = ['unidad','operador','remolque','ruta','origen','destino','cita_carga','cita_descarga','hora_llegada','hora_liberacion','estatus','comentarios_cliente','comentarios_monitoreo','grupo'];
  const data = fields.reduce((acc, f) => { acc[f] = req.body[f] || ''; return acc; }, {});
  const userName = actorFromReq(req);
  const userId = req.user?.id || null;
  data.created_by_user_id = userId;
  data.created_by_username = userName;
  data.fecha_actualizacion = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const cols = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  db.run(`INSERT INTO seguimiento (${cols}) VALUES (${placeholders})`, Object.values(data), async function (err) {
    if (err) return res.status(500).json({ error: err.message });
    let viajeSync = null;
    try {
      viajeSync = await syncViajeDesdeSeguimiento(data.unidad, data.estatus);
    } catch (syncErr) {
      console.error('Error sincronizando viaje desde seguimiento (POST):', syncErr.message);
    }
    res.json({ id: this.lastID, viajeSync });
  });
});

router.put('/seguimiento/:id', (req, res) => {
  db.get('SELECT * FROM seguimiento WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    const userName = actorFromReq(req);
    const fields = ['unidad','operador','remolque','ruta','origen','destino','cita_carga','cita_descarga','hora_llegada','hora_liberacion','estatus','comentarios_cliente','comentarios_monitoreo','grupo'];
    const updates = [];
    const values = [];
    fields.forEach(f => {
      const newVal = req.body[f] !== undefined ? req.body[f] : row[f];
      if (String(newVal) !== String(row[f])) {
        db.run('INSERT INTO seguimiento_historial (seguimiento_id, campo, valor_anterior, valor_nuevo, usuario) VALUES (?, ?, ?, ?, ?)', [req.params.id, f, row[f] || '', newVal || '', userName]);
      }
      updates.push(`${f} = ?`);
      values.push(newVal || '');
    });
    updates.push("fecha_actualizacion = datetime('now')");
    values.push(req.params.id);
    db.run(`UPDATE seguimiento SET ${updates.join(', ')} WHERE id = ?`, values, async function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      let viajeSync = null;
      try {
        const nuevoEstatus = req.body.estatus !== undefined ? req.body.estatus : row.estatus;
        const nuevaUnidad = req.body.unidad !== undefined ? req.body.unidad : row.unidad;
        viajeSync = await syncViajeDesdeSeguimiento(nuevaUnidad, nuevoEstatus);
      } catch (syncErr) {
        console.error('Error sincronizando viaje desde seguimiento:', syncErr.message);
      }
      res.json({ changes: this.changes, viajeSync });
    });
  });
});

router.delete('/seguimiento/:id', (req, res) => {
  db.get('SELECT * FROM seguimiento WHERE id = ?', [req.params.id], (err, row) => {
    if (row) {
      const userName = actorFromReq(req);
      const fields = ['unidad','operador','remolque','ruta','origen','destino','cita_carga','cita_descarga','hora_llegada','hora_liberacion','estatus','comentarios_cliente','comentarios_monitoreo','grupo'];
      fields.forEach(f => {
        db.run('INSERT INTO seguimiento_historial (seguimiento_id, campo, valor_anterior, valor_nuevo, usuario) VALUES (?, ?, ?, ?, ?)', [req.params.id, f, row[f] || '', '', userName]);
      });
    }
    db.run('DELETE FROM seguimiento WHERE id = ?', [req.params.id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    });
  });
});

router.delete('/seguimiento', async (req, res) => {
  try {
    const result = await withTransaction(async tx => {
      const hist = await tx.run('DELETE FROM seguimiento_historial');
      const seg = await tx.run('DELETE FROM seguimiento');
      return { seguimiento: seg.changes, seguimientoHistorial: hist.changes };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/seguimiento/:id/historial', (req, res) => {
  db.all('SELECT * FROM seguimiento_historial WHERE seguimiento_id = ? ORDER BY fecha_cambio DESC', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

router.get('/seguimiento/historial/todas', (req, res) => {
  db.all('SELECT sh.*, s.unidad FROM seguimiento_historial sh LEFT JOIN seguimiento s ON s.id = sh.seguimiento_id ORDER BY sh.fecha_cambio DESC LIMIT 500', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

router.post('/seguimiento/import', requireAdmin, async (req, res) => {
  const items = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Array de registros requerido' });
  const userName = actorFromReq(req);
  const userId = req.user?.id || null;
  try {
    const importedRows = [];
    const imported = await withTransaction(async tx => {
      await tx.run('DELETE FROM seguimiento');
      for (const item of items) {
        const data = {
          unidad: item.UNIDAD || '',
          operador: item.OPERADOR || '',
          remolque: item.REMOLQUE || '',
          ruta: item.RUTA || '',
          origen: item.ORIGEN || '',
          destino: item.DESTINO || '',
          cita_carga: item['CITA CARGA'] || '',
          cita_descarga: item['CITA DESCARGA'] || '',
          hora_llegada: item['HORA LLEGADA CON CLIENTE'] || '',
          hora_liberacion: item['HORA LIBERACION CLIENTE'] || '',
          estatus: item.ESTATUS || 'Disponible',
          comentarios_cliente: item['COMENTARIOS CLIENTE'] || '',
          comentarios_monitoreo: item['COMENTARIOS MONITOREO'] || '',
          grupo: item.GRUPO || '',
          created_by_user_id: userId,
          created_by_username: userName,
          fecha_actualizacion: item['HORA ACTUALIZACION'] || new Date().toISOString().replace('T', ' ').substring(0, 19),
        };
        importedRows.push(data);
        const cols = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');
        await tx.run(`INSERT INTO seguimiento (${cols}) VALUES (${placeholders})`, Object.values(data));
      }
      return items.length;
    });
    let viajesSync = [];
    try {
      viajesSync = await sincronizarViajesDesdeImport(importedRows);
    } catch (syncErr) {
      console.error('Error sincronizando viajes desde import JSON:', syncErr.message);
    }
    res.json({ imported, viajesSync });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const COLUMN_MAP = {
  'unidad': 'unidad',
  'operador': 'operador',
  'remolque': 'remolque',
  'ruta': 'ruta',
  'origen': 'origen',
  'destino': 'destino',
  'cita carga': 'cita_carga',
  'cita descarga': 'cita_descarga',
  'hora llegada con cliente': 'hora_llegada',
  'hora liberacion cliente': 'hora_liberacion',
  'estatus': 'estatus',
  'comentarios cliente': 'comentarios_cliente',
  'comentarios monitoreo': 'comentarios_monitoreo',
  'grupo': 'grupo',
  'hora actualizacion': 'fecha_actualizacion',
};

function normalizarFechaCita(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const clean = raw.replace(/[\/.]/g, '-');
  const match = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})(?:[ T]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (!match) return raw;
  let [, a, b, p3, hh, mm, ss] = match;
  if (a.includes('-') || b.includes('-')) return raw;
  let year = p3.length === 2 ? `20${p3}` : p3;
  let numeroMes;
  let numeroDia;
  let n1 = parseInt(a, 10);
  let n2 = parseInt(b, 10);
  if (n1 > 12) {
    numeroDia = n1;
    numeroMes = n2;
  } else if (n2 > 12) {
    numeroMes = n1;
    numeroDia = n2;
  } else {
    numeroMes = n1;
    numeroDia = n2;
  }
  if (numeroMes < 1 || numeroMes > 12 || numeroDia < 1 || numeroDia > 31) return raw;
  const hora = hh ? `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}${ss ? `:${String(ss).padStart(2, '0')}` : ':00'}` : '';
  return `${year}-${String(numeroMes).padStart(2, '0')}-${String(numeroDia).padStart(2, '0')}${hora ? ` ${hora}` : ''}`;
}

function mapCsvRow(row) {
  const mapped = {};
  for (const [csvKey, dbField] of Object.entries(COLUMN_MAP)) {
    const val = Object.entries(row).find(([k]) => k.toLowerCase().trim() === csvKey);
    mapped[dbField] = val ? (val[1] || '') : '';
  }
  mapped.estatus = mapped.estatus || 'Disponible';
  if (mapped.cita_carga) mapped.cita_carga = normalizarFechaCita(mapped.cita_carga);
  if (mapped.cita_descarga) mapped.cita_descarga = normalizarFechaCita(mapped.cita_descarga);
  if (mapped.fecha_actualizacion) mapped.fecha_actualizacion = normalizarFechaCita(mapped.fecha_actualizacion);
  return mapped;
}

function generateHistoryPdf(rows, userName, timestamp) {
  if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });
  const fileName = `import_${timestamp.replace(/[: ]/g, '-')}.pdf`;
  const filePath = path.join(HISTORY_DIR, fileName);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'letter', layout: 'landscape', margin: 30 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    doc.fontSize(16).text('Historial de Importacion de Seguimiento', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).text(`Fecha: ${timestamp}`);
    doc.text(`Realizado por: ${userName}`);
    doc.text(`Registros importados: ${rows.length}`);
    doc.moveDown(0.5);
    const headers = ['Unidad', 'Operador', 'Remolque', 'Origen', 'Destino', 'Estatus', 'Grupo'];
    const colWidths = [70, 80, 60, 100, 100, 80, 80];
    let y = doc.y;
    let x = 30;
    headers.forEach((h, i) => {
      doc.fontSize(7).font('Helvetica-Bold').text(h, x, y, { width: colWidths[i], align: 'left' });
      x += colWidths[i];
    });
    y += 14;
    doc.moveTo(30, y).lineTo(770, y).stroke();
    y += 4;
    rows.forEach(row => {
      if (y > 560) {
        doc.addPage();
        y = 30;
      }
      x = 30;
      const vals = [row.unidad, row.operador, row.remolque, row.origen, row.destino, row.estatus, row.grupo];
      vals.forEach((v, i) => {
        doc.font('Helvetica').fontSize(6).text(String(v || '').substring(0, 40), x, y, { width: colWidths[i], align: 'left' });
        x += colWidths[i];
      });
      y += 12;
    });
    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

router.get('/seguimiento/history-pdfs', requireAdmin, (req, res) => {
  if (!fs.existsSync(HISTORY_DIR)) return res.json([]);
  try {
    const files = fs.readdirSync(HISTORY_DIR)
      .filter(f => f.endsWith('.pdf'))
      .map(f => {
        const stat = fs.statSync(path.join(HISTORY_DIR, f));
        return { name: f, size: stat.size, created: stat.mtime };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/seguimiento/history-pdfs/:filename', requireAdmin, (req, res) => {
  const filename = String(req.params.filename || '');
  if (!filename.endsWith('.pdf') || path.basename(filename) !== filename) return res.status(404).json({ error: 'No encontrado' });
  const filePath = path.join(HISTORY_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'No encontrado' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  fs.createReadStream(filePath).pipe(res);
});

router.post('/seguimiento/import-csv', requireAdmin, async (req, res) => {
  const { url } = req.body;
  if (!url || !String(url).trim()) return res.status(400).json({ error: 'URL requerida' });
  const userName = actorFromReq(req);
  const userId = req.user?.id || null;
  try {
    const response = await axios.get(url, { timeout: 15000, responseType: 'text' });
    const raw = String(response.data || '');
    const contentType = (response.headers && response.headers['content-type']) || '';

    if (raw.length === 0) {
      return res.status(400).json({ error: 'La URL devolvió contenido vacío' });
    }

    if (raw.substring(0, 500).toLowerCase().includes('<!doctype html') || raw.substring(0, 500).toLowerCase().includes('<html')) {
      return res.status(400).json({
        error: 'La URL devolvió HTML en lugar de CSV. Asegúrese de usar la URL de exportación CSV publicada.',
        contentType,
        preview: raw.substring(0, 300),
      });
    }

    const parsed = Papa.parse(raw, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      delimitersToGuess: [',', '\t', '|', ';'],
    });

    if (parsed.errors && parsed.errors.length > 0) {
      const errDetail = parsed.errors[0];
      return res.status(400).json({
        error: `Error al parsear CSV (fila ${errDetail.row || '?'}): ${errDetail.message}`,
        totalErrors: parsed.errors.length,
        firstErrors: parsed.errors.slice(0, 5).map(e => ({ row: e.row, code: e.code, message: e.message })),
        headerCount: parsed.meta.fields ? parsed.meta.fields.length : 0,
        headers: parsed.meta.fields,
        dataRowCount: parsed.data.length,
      });
    }

    const csvRows = parsed.data;
    if (csvRows.length === 0) return res.status(400).json({ error: 'El CSV no contiene registros' });
    const headers = parsed.meta.fields || [];
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const importedRows = [];
    await withTransaction(async tx => {
      await tx.run('DELETE FROM seguimiento');
      for (const row of csvRows) {
        const data = mapCsvRow(row);
        data.created_by_user_id = userId;
        data.created_by_username = userName;
        data.fecha_actualizacion = data.fecha_actualizacion || timestamp;
        importedRows.push(data);
        const cols = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');
        await tx.run(`INSERT INTO seguimiento (${cols}) VALUES (${placeholders})`, Object.values(data));
      }
    });
    await generateHistoryPdf(importedRows, userName, timestamp);
    let viajesSync = [];
    try {
      viajesSync = await sincronizarViajesDesdeImport(importedRows);
    } catch (syncErr) {
      console.error('Error sincronizando viajes desde import:', syncErr.message);
    }
    res.json({ imported: importedRows.length, headers, viajesSync });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
