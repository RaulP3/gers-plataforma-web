export const MOVEMENT_THRESHOLD_MPH = 1;
export const CITAS_GPS_STALE_MIN = 60;
export const estaEnMovimiento = (speedMph) => Number(speedMph || 0) > MOVEMENT_THRESHOLD_MPH;
export const VIAJE_DEFAULT = { vehicle_id: '', vehicle_name: '', origen: '', destino: '', tipo_entrega: 'directo', destinos: ['', ''], conductor: '', telefono: '', fecha_inicio: '', fecha_fin: '', notas: '', remolque: '' };
export const CLIENTE_DEFAULT = { nombre: '', contacto: '', telefono: '', email: '', wpp_groups: [] };
export const GEOFENCE_DEFAULT = { nombre: '', direccion: '', latitud: '', longitud: '', radio_metros: '500', descripcion: '', color: '#3b82f6' };
export const parseDestinos = (value) => {
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(item => String(item || '').trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
};
export const destinosViaje = (viaje = {}) => {
  const parsed = parseDestinos(viaje.destinos?.length ? viaje.destinos : viaje.destinos_json);
  const reparto = viaje.tipo_entrega === 'reparto' || parsed.length > 1;
  return reparto ? (parsed.length ? parsed : [viaje.destino].filter(Boolean)) : [viaje.destino].filter(Boolean);
};
export const paradasViaje = (viaje = {}) => {
  if (Array.isArray(viaje.paradas) && viaje.paradas.length > 0) return [...viaje.paradas].sort((a, b) => a.orden - b.orden);
  return viaje.tipo_entrega === 'reparto'
    ? destinosViaje(viaje).map((destino, index) => ({ id: null, viaje_id: viaje.id, orden: index + 1, destino, estado: index === 0 ? 'en_camino' : 'pendiente', hora_llegada: null, hora_salida: null }))
    : [];
};
export const paradaActualViaje = (viaje = {}) => {
  const paradas = paradasViaje(viaje);
  if (!paradas.length) return null;
  return paradas.find(parada => !['completada', 'omitida'].includes(parada.estado)) || paradas[paradas.length - 1];
};
export const destinoViajeActual = (viaje = {}) => viaje?.tipo_entrega === 'reparto'
  ? (paradaActualViaje(viaje)?.destino || destinosViaje(viaje)[0])
  : (viaje?.destino || viaje?.seg_destino || '');
export const numeroUnidad = (viaje = {}) => {
  const match = String(viaje.vehicle_name || viaje.vehicle_id || '').match(/(\d+)/);
  return match ? Number(match[1]) : null;
};
export const ordenarViajesPorUnidad = (a, b) => {
  const na = numeroUnidad(a);
  const nb = numeroUnidad(b);
  if (na != null && nb != null) return na - nb;
  if (na != null) return -1;
  if (nb != null) return 1;
  return String(a.vehicle_name || a.vehicle_id || '').localeCompare(String(b.vehicle_name || b.vehicle_id || ''));
};
export const normalizarViaje = (viaje = {}) => {
  const parsed = parseDestinos(viaje.destinos?.length ? viaje.destinos : viaje.destinos_json);
  const tipo_entrega = viaje.tipo_entrega === 'reparto' || parsed.length > 1 ? 'reparto' : 'directo';
  const destinos = tipo_entrega === 'reparto'
    ? [...(parsed.length ? parsed : [viaje.destino].filter(Boolean)), '', ''].slice(0, Math.max(2, parsed.length || (viaje.destino ? 1 : 0)))
    : ['', ''];
  return { ...viaje, tipo_entrega, destinos, destino: viaje.destino || parsed.at(-1) || '' };
};
export const payloadViaje = (viaje = {}) => {
  const reparto = viaje.tipo_entrega === 'reparto';
  const destinos = reparto ? parseDestinos(viaje.destinos) : [String(viaje.destino || '').trim()].filter(Boolean);
  const { destinos_json, ...base } = viaje;
  return { ...base, tipo_entrega: reparto ? 'reparto' : 'directo', destinos, destino: destinos.at(-1) || '' };
};
export const activarConTeclado = (e, action) => {
  if (e.target !== e.currentTarget) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    action();
  }
};

export const tituloAlerta = (tipo = '') => {
  const map = {
    cliente_geocerca: 'Entrada a cliente',
    geocerca: 'Geocerca',
    combustible_bajo: 'Combustible bajo',
    alerta: 'Alerta',
    velocidad: 'Velocidad',
    detencion: 'Detención',
    emergencia: 'Emergencia',
    operador_samsara_ok: 'Operador en Samsara',
    operador_samsara_err: 'Error de Samsara',
  };
  return map[tipo] || 'Alerta';
};
