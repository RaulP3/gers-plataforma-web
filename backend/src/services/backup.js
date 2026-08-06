const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { db } = require('../db');
const { BACKUP_DIR, BACKUP_KEEP_DAYS } = require('../config');

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter(file => /^gers-backup-\d{8}-\d{6}\.db$/.test(file))
    .sort();
}

function performDatabaseBackup() {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
    const destination = path.join(BACKUP_DIR, `gers-backup-${stamp}.db`);
    let backup;
    try {
      backup = db.backup(destination);
    } catch (initErr) {
      return reject(initErr);
    }
    backup.retryErrors = [sqlite3.BUSY, sqlite3.LOCKED];
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; }, 5 * 60 * 1000);
    const step = () => {
      backup.step(1024, (stepErr, done) => {
        if (timedOut) {
          try { backup.finish(); } catch { /* noop */ }
          return reject(new Error('Backup excedió el tiempo límite'));
        }
        if (stepErr) {
          const code = String(stepErr.code || '').toUpperCase();
          if (code === 'SQLITE_BUSY' || code === 'SQLITE_LOCKED') {
            return setTimeout(step, 250);
          }
          clearTimeout(timeout);
          try { backup.finish(); } catch { /* noop */ }
          return reject(stepErr);
        }
        if (!done) return setTimeout(step, 100);
        clearTimeout(timeout);
        backup.finish(finishErr => {
          if (finishErr) return reject(finishErr);
          try {
            const cutoff = Date.now() - BACKUP_KEEP_DAYS * 24 * 60 * 60 * 1000;
            let removed = 0;
            for (const file of listBackups()) {
              const filePath = path.join(BACKUP_DIR, file);
              const stats = fs.statSync(filePath);
              if (stats.mtimeMs < cutoff) {
                fs.unlinkSync(filePath);
                removed += 1;
              }
            }
            resolve({ destination, removed });
          } catch (cleanErr) {
            reject(cleanErr);
          }
        });
      });
    };
    step();
  });
}

function listBackupDetails() {
  return listBackups().map(file => {
    const filePath = path.join(BACKUP_DIR, file);
    return {
      file,
      size: fs.statSync(filePath).size,
      created_at: new Date(fs.statSync(filePath).mtimeMs).toISOString(),
    };
  });
}

module.exports = { listBackups, performDatabaseBackup, listBackupDetails };
