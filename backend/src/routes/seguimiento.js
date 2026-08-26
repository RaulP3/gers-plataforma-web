const express = require('express');
const axios = require('axios');
const Papa = require('papaparse');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { db, withTransaction } = require('../db');
const { actorFromReq, requireAdmin } = require('../auth');

const router = express.Router();

const HISTORY_DIR = path.join(__dirname, '../../data/seguimiento_history');

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
  db.run(`INSERT INTO seguimiento (${cols}) VALUES (${placeholders})`, Object.values(data), function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
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
    db.run(`UPDATE seguimiento SET ${updates.join(', ')} WHERE id = ?`, values, function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ changes: this.changes });
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
        const cols = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');
        await tx.run(`INSERT INTO seguimiento (${cols}) VALUES (${placeholders})`, Object.values(data));
      }
      return items.length;
    });
    res.json({ imported });
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

function mapCsvRow(row) {
  const mapped = {};
  for (const [csvKey, dbField] of Object.entries(COLUMN_MAP)) {
    const val = Object.entries(row).find(([k]) => k.toLowerCase().trim() === csvKey);
    mapped[dbField] = val ? (val[1] || '') : '';
  }
  mapped.estatus = mapped.estatus || 'Disponible';
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
  const filePath = path.join(HISTORY_DIR, req.params.filename);
  if (!fs.existsSync(filePath) || !req.params.filename.endsWith('.pdf')) return res.status(404).json({ error: 'No encontrado' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
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
    res.json({ imported: importedRows.length, headers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
