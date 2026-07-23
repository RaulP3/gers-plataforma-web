const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'gers.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Error al conectar con SQLite:', err);
  else console.log('Conectado a SQLite');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS operaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL,
    descripcion TEXT,
    estado TEXT DEFAULT 'pendiente',
    origen TEXT,
    destino TEXT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS monitoreo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operacion_id INTEGER,
    latitud REAL,
    longitud REAL,
    estado TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operacion_id) REFERENCES operaciones(id)
  )`);
});

app.get('/api/operaciones', (req, res) => {
  db.all('SELECT * FROM operaciones', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/operaciones', (req, res) => {
  const { codigo, descripcion, origen, destino } = req.body;
  db.run(
    'INSERT INTO operaciones (codigo, descripcion, origen, destino) VALUES (?, ?, ?, ?)',
    [codigo, descripcion, origen, destino],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/operaciones/:id', (req, res) => {
  const { estado } = req.body;
  db.run(
    'UPDATE operaciones SET estado = ? WHERE id = ?',
    [estado, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

app.get('/api/monitoreo', (req, res) => {
  db.all('SELECT * FROM monitoreo ORDER BY timestamp DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/monitoreo', (req, res) => {
  const { operacion_id, latitud, longitud, estado } = req.body;
  db.run(
    'INSERT INTO monitoreo (operacion_id, latitud, longitud, estado) VALUES (?, ?, ?, ?)',
    [operacion_id, latitud, longitud, estado],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.get('/api/dashboard', (req, res) => {
  const stats = {};
  db.get('SELECT COUNT(*) as total FROM operaciones', [], (err, row) => {
    stats.totalOperaciones = row?.total || 0;
    db.get("SELECT COUNT(*) as activas FROM operaciones WHERE estado = 'en_curso'", [], (err, row) => {
      stats.operacionesActivas = row?.activas || 0;
      db.get("SELECT COUNT(*) as completadas FROM operaciones WHERE estado = 'completada'", [], (err, row) => {
        stats.operacionesCompletadas = row?.completadas || 0;
        res.json(stats);
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor GERS corriendo en puerto ${PORT}`);
});
