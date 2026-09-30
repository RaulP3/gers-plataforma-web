const { allQuery, withTransaction } = require('../src/db');

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (v) => Number(v) * Math.PI / 180;
  const dLat = toRad(lat2) - toRad(lat1);
  const dLon = toRad(lon2) - toRad(lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
const isPlusCode = (s) => /\+/.test(String(s || ''));

(async () => {
  let rows = [];
  try {
    rows = await allQuery('SELECT id, nombre, latitud, longitud FROM geofences');

    const parent = new Map(rows.map(r => [String(r.id), String(r.id)]));
    const find = (x) => { let r = x; while (parent.get(r) !== r) r = parent.get(r); return r; };
    const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(rb, ra); };
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const a = rows[i], b = rows[j];
        const da = Number(a.latitud), la = Number(a.longitud);
        const db = Number(b.latitud), lb = Number(b.longitud);
        if (Number.isFinite(da) && Number.isFinite(la) && Number.isFinite(db) && Number.isFinite(lb)) {
          if (haversineMeters(da, la, db, lb) <= 50) union(String(a.id), String(b.id));
        }
      }
    }
    const groups = {};
    for (const r of rows) {
      const root = find(String(r.id));
      (groups[root] = groups[root] || []).push(r);
    }
    const dupGroups = Object.values(groups).filter(g => g.length > 1);

    const plan = [];
    for (const g of dupGroups) {
      const keeper = g.filter(r => !isPlusCode(r.nombre)).sort((a, b) => Number(a.id) - Number(b.id))[0]
        || g.slice().sort((a, b) => Number(a.id) - Number(b.id))[0];
      const toDelete = g.filter(r => String(r.id) !== String(keeper.id));
      plan.push({ keeper: keeper.id, keeperNombre: keeper.nombre, toDelete: toDelete.map(r => ({ id: r.id, nombre: r.nombre })) });
    }

    console.log('GRUPOS_DUP', dupGroups.length);
    console.log('PLAN', JSON.stringify(plan));

    let movedEvents = 0;
    let deleted = 0;

    await withTransaction(async (tx) => {
      for (const p of plan) {
        for (const d of p.toDelete) {
          const upd = await tx.run(
            'UPDATE geofence_events SET geofence_id = ?, geofence_nombre = ? WHERE geofence_id = ?',
            [Number(p.keeper), p.keeperNombre, Number(d.id)]
          );
          movedEvents += upd.changes || 0;
          const del = await tx.run('DELETE FROM geofences WHERE id = ?', [Number(d.id)]);
          deleted += del.changes || 0;
        }
      }
    });

    const total = (await allQuery('SELECT COUNT(*) AS n FROM geofences'))[0]?.n;
    console.log('EVENTOS_REASIGNADOS', movedEvents);
    console.log('GEOCERCA_BORRADAS', deleted);
    console.log('TOTAL_GEOFENCE_AFTER', total);
    process.exit(0);
  } catch (e) {
    console.error('ERR', e.message);
    process.exit(1);
  }
})();
