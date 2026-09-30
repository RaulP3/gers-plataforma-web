const express = require('express');
const { requireAuth } = require('../auth');
const { listBackupDetails, performDatabaseBackup } = require('../services/backup');

const router = express.Router();

router.get('/backups', requireAuth, async (req, res) => {
  try {
    res.json(listBackupDetails());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/backups/run', requireAuth, async (req, res) => {
  try {
    const result = await performDatabaseBackup();
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
