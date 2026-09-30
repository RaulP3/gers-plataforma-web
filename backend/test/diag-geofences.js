const { allQuery } = require('../src/db');

(async () => {
  try {
    const totalRow = (await allQuery('SELECT COUNT(*) AS n FROM geofences'))[0];
    const total = totalRow ? totalRow.n : 0;
    console.log('TOTAL_GEOFENCE', total);

    const nameDups = await allQuery(
      "SELECT lower(trim(nombre)) AS norm, COUNT(*) AS c FROM geofences GROUP BY lower(trim(nombre)) HAVING c > 1 ORDER BY c DESC LIMIT 50"
    );
    console.log('DUP_NOMBRE', JSON.stringify(nameDups));

    const nearDups = await allQuery(
      "SELECT g1.id AS id1, g1.nombre AS n1, g2.id AS id2, g2.nombre AS n2, " +
      "sqrt((g1.latitud-g2.latitud)*(g1.latitud-g2.latitud)+(g1.longitud-g2.longitud)*(g1.longitud-g2.longitud)) AS ddeg " +
      "FROM geofences g1 JOIN geofences g2 ON g1.id < g2.id " +
      "WHERE abs(g1.latitud-g2.latitud) < 0.0005 AND abs(g1.longitud-g2.longitud) < 0.0005 " +
      "ORDER BY g1.id, g2.id LIMIT 50"
    );
    console.log('DUP_COORD', JSON.stringify(nearDups));
  } catch (e) {
    console.error('ERR', e.message);
  } finally {
    process.exit(0);
  }
})();
