'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';

const MapaUnidades = dynamic(() => import('../components/MapaUnidades'), { ssr: false });
const RouteMap = dynamic(() => import('../components/RouteMap'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({});
  const [operaciones, setOperaciones] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [reportes, setReportes] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const [nuevaOp, setNuevaOp] = useState({ codigo: '', descripcion: '', origen: '', destino: '' });
  const [filtroReporte, setFiltroReporte] = useState({ tipo: 'operaciones', fecha_inicio: '', fecha_fin: '', vehicle_id: '' });
  const [formViaje, setFormViaje] = useState({ vehicle_id: '', vehicle_name: '', origen: '', destino: '', conductor: '', fecha_inicio: '', fecha_fin: '', notas: '' });
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [nuevoComentario, setNuevoComentario] = useState({ vehicle_id: '', vehicle_name: '', autor: '', tipo: 'seguimiento', titulo: '', contenido: '', kilometraje: '' });
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [comentarioRapido, setComentarioRapido] = useState({ autor: '', tipo: 'seguimiento', titulo: '', contenido: '', kilometraje: '' });
  const [operadores, setOperadores] = useState({});
  const [samsaraDrivers, setSamsaraDrivers] = useState([]);
  const [filtroOperador, setFiltroOperador] = useState('');
  const [geofences, setGeofences] = useState([]);
  const [geofenceEvents, setGeofenceEvents] = useState([]);
  const [formGeofence, setFormGeofence] = useState({ nombre: '', latitud: '', longitud: '', radio_metros: '500', descripcion: '', color: '#3b82f6' });
  const [filtroAlertas, setFiltroAlertas] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [routeHistory, setRouteHistory] = useState([]);
  const [routeDates, setRouteDates] = useState([]);
  const [routeVehicleId, setRouteVehicleId] = useState('');
  const [routeDate, setRouteDate] = useState('');
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, opsRes, viajesRes, alertasRes, vehiculosRes, comentariosRes, operadoresRes, driversRes, geofencesRes, eventsRes] = await Promise.allSettled([
        fetch(`${API_URL}/reportes/resumen`).then(r => r.json()),
        fetch(`${API_URL}/operaciones`).then(r => r.json()),
        fetch(`${API_URL}/viajes`).then(r => r.json()),
        fetch(`${API_URL}/alertas`).then(r => r.json()),
        fetch(`${API_URL}/samsara/vehicles`).then(r => r.json()),
        fetch(`${API_URL}/comentarios`).then(r => r.json()),
        fetch(`${API_URL}/vehicle-operators`).then(r => r.json()),
        fetch(`${API_URL}/samsara/drivers`).then(r => r.json()),
        fetch(`${API_URL}/geofences`).then(r => r.json()),
        fetch(`${API_URL}/geofence-events?limit=100`).then(r => r.json()),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (opsRes.status === 'fulfilled') setOperaciones(opsRes.value);
      if (viajesRes.status === 'fulfilled') setViajes(viajesRes.value);
      if (alertasRes.status === 'fulfilled') setAlertas(alertasRes.value);
      if (comentariosRes.status === 'fulfilled') setComentarios(comentariosRes.value);
      if (driversRes.status === 'fulfilled') setSamsaraDrivers(driversRes.value || []);
      if (geofencesRes.status === 'fulfilled') setGeofences(geofencesRes.value || []);
      if (eventsRes.status === 'fulfilled') setGeofenceEvents(eventsRes.value || []);
      if (operadoresRes.status === 'fulfilled') {
        const map = {};
        for (const op of (operadoresRes.value || [])) {
          map[op.vehicle_id] = op.operator_name;
        }
        setOperadores(map);
      }
      if (vehiculosRes.status === 'fulfilled') {
        const v = vehiculosRes.value;
        setVehiculos(Array.isArray(v) ? v : (v.data || v.vehicles || []));
      }
    } catch (e) {
      console.error('Error cargando datos:', e);
    }
    setLoading(false);
  };

  const crearOperacion = async (e) => {
    e.preventDefault();
    await fetch(`${API_URL}/operaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevaOp),
    });
    setNuevaOp({ codigo: '', descripcion: '', origen: '', destino: '' });
    loadAll();
  };

  const actualizarEstadoOp = async (id, estado) => {
    await fetch(`${API_URL}/operaciones/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    loadAll();
  };

  const crearViaje = async (e) => {
    e.preventDefault();
    await fetch(`${API_URL}/viajes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formViaje),
    });
    setFormViaje({ vehicle_id: '', vehicle_name: '', origen: '', destino: '', conductor: '', fecha_inicio: '', fecha_fin: '', notas: '' });
    loadAll();
  };

  const actualizarEstadoViaje = async (id, estado) => {
    await fetch(`${API_URL}/viajes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    loadAll();
  };

  const eliminarViaje = async (id) => {
    if (confirm('Eliminar este viaje?')) {
      await fetch(`${API_URL}/viajes/${id}`, { method: 'DELETE' });
      loadAll();
    }
  };

  const marcarAlertaLeida = async (id) => {
    await fetch(`${API_URL}/alertas/${id}/leer`, { method: 'PUT' });
    loadAll();
  };

  const eliminarAlerta = async (id) => {
    await fetch(`${API_URL}/alertas/${id}`, { method: 'DELETE' });
    loadAll();
  };

  const crearComentario = async (e) => {
    e.preventDefault();
    await fetch(`${API_URL}/comentarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoComentario),
    });
    setNuevoComentario({ vehicle_id: '', vehicle_name: '', autor: '', tipo: 'seguimiento', titulo: '', contenido: '', kilometraje: '' });
    loadAll();
  };

  const eliminarComentario = async (id) => {
    if (confirm('Eliminar este comentario?')) {
      await fetch(`${API_URL}/comentarios/${id}`, { method: 'DELETE' });
      loadAll();
    }
  };

  const guardarComentarioRapido = async () => {
    if (!comentarioRapido.contenido.trim() || !selectedVehicle) return;
    await fetch(`${API_URL}/comentarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicle_id: String(selectedVehicle.id),
        vehicle_name: selectedVehicle.name,
        autor: comentarioRapido.autor || 'Sistema',
        tipo: comentarioRapido.tipo,
        titulo: comentarioRapido.titulo || `Seguimiento ${selectedVehicle.name}`,
        contenido: comentarioRapido.contenido,
        kilometraje: comentarioRapido.kilometraje ? Number(comentarioRapido.kilometraje) : null
      }),
    });
    setComentarioRapido({ autor: '', tipo: 'seguimiento', titulo: '', contenido: '', kilometraje: '' });
    loadAll();
  };

  const guardarOperador = async (vehicleId, vehicleName, nombre) => {
    await fetch(`${API_URL}/vehicle-operators/${vehicleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicle_name: vehicleName, operator_name: nombre }),
    });
    setOperadores(prev => ({ ...prev, [vehicleId]: nombre }));
  };

  const crearGeofence = async (e) => {
    e.preventDefault();
    await fetch(`${API_URL}/geofences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: formGeofence.nombre,
        latitud: Number(formGeofence.latitud),
        longitud: Number(formGeofence.longitud),
        radio_metros: Number(formGeofence.radio_metros) || 500,
        descripcion: formGeofence.descripcion,
        color: formGeofence.color,
      }),
    });
    setFormGeofence({ nombre: '', latitud: '', longitud: '', radio_metros: '500', descripcion: '', color: '#3b82f6' });
    loadAll();
  };

  const eliminarGeofence = async (id) => {
    if (confirm('Eliminar esta geocerca?')) {
      await fetch(`${API_URL}/geofences/${id}`, { method: 'DELETE' });
      loadAll();
    }
  };

  const toggleGeofence = async (id, activa) => {
    await fetch(`${API_URL}/geofences/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activa: activa ? 0 : 1 }),
    });
    loadAll();
  };

  const ejecutarCheckGeofences = async () => {
    await fetch(`${API_URL}/check-geofences`, { method: 'POST' });
    loadAll();
  };

  const ejecutarCheckFuel = async () => {
    await fetch(`${API_URL}/check-fuel`, { method: 'POST' });
    loadAll();
  };

  const cargarHistorialRuta = async () => {
    if (!routeVehicleId || !routeDate) return;
    setRouteLoading(true);
    try {
      const res = await fetch(`${API_URL}/route-history?vehicle_id=${routeVehicleId}&fecha_inicio=${routeDate}&fecha_fin=${routeDate}&limit=5000`);
      const data = await res.json();
      setRouteHistory(data);
    } catch (e) { console.error(e); }
    setRouteLoading(false);
  };

  const cargarFechasRuta = async (vid) => {
    setRouteVehicleId(vid);
    setRouteHistory([]);
    if (!vid) { setRouteDates([]); return; }
    try {
      const res = await fetch(`${API_URL}/route-history/dates?vehicle_id=${vid}`);
      const data = await res.json();
      setRouteDates(data);
    } catch (e) { console.error(e); }
  };

  const cargarReporte = async () => {
    const params = new URLSearchParams();
    if (filtroReporte.fecha_inicio) params.append('fecha_inicio', filtroReporte.fecha_inicio);
    if (filtroReporte.fecha_fin) params.append('fecha_fin', filtroReporte.fecha_fin);
    if (filtroReporte.vehicle_id) params.append('vehicle_id', filtroReporte.vehicle_id);
    const res = await fetch(`${API_URL}/reportes/${filtroReporte.tipo}?${params}`);
    const data = await res.json();
    setReportes(data);
  };

  const vehiculosOnline = vehiculos.filter(v => v.isOnline);
  const vehiculosOffline = vehiculos.filter(v => !v.isOnline);
  const alertasNoLeidas = alertas.filter(a => !a.leida);
  const vehiculosEnMovimiento = useMemo(() => vehiculos.filter(v => v.location?.speed > 1), [vehiculos]);

  const menuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'monitoreo', label: 'Monitoreo', icon: '🗺️' },
    { key: 'seguimiento', label: 'Seguimiento', icon: '📝' },
    { key: 'alertas', label: 'Alertas', icon: '🔔', badge: alertasNoLeidas.length },
    { key: 'operaciones', label: 'Operaciones', icon: '📋' },
    { key: 'viajes', label: 'Viajes', icon: '🚚' },
    { key: 'operadores', label: 'Operadores', icon: '👤' },
    { key: 'geocercas', label: 'Geocercas', icon: '⭕' },
    { key: 'rutas', label: 'Historial Rutas', icon: '🛤️' },
    { key: 'reportes', label: 'Reportes', icon: '📈' },
  ];

  const s = {
    container: { fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', display: 'flex', background: '#0a0a0a' },
    sidebar: { width: '240px', background: 'linear-gradient(180deg, #0d0d0d 0%, #111111 100%)', color: '#e0e0e0', display: 'flex', flexDirection: 'column', flexShrink: 0, borderRight: '1px solid #1a3d1a' },
    logo: { padding: '1.5rem', borderBottom: '1px solid #1a3d1a', display: 'flex', alignItems: 'center', gap: '0.75rem' },
    nav: { flex: 1, padding: '0.75rem 0' },
    navItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 1.5rem', cursor: 'pointer', border: 'none', background: 'transparent', color: '#6a9b6a', width: '100%', textAlign: 'left', fontSize: '0.9rem', transition: 'all 0.2s', borderRadius: '0' },
    navItemActive: { background: 'rgba(0, 255, 65, 0.08)', color: '#00ff41', borderRight: '3px solid #00ff41' },
    main: { flex: 1, padding: '1.5rem 2rem', overflow: 'auto' },
    card: { background: '#111111', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 0 15px rgba(0, 255, 65, 0.05), 0 1px 3px rgba(0,0,0,0.3)', border: '1px solid #1a3d1a' },
    statCard: (color, icon) => ({ background: `linear-gradient(135deg, #0d0d0d, #1a1a1a)`, color: '#00ff41', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: `1px solid ${color}33`, boxShadow: `0 0 20px ${color}15` }),
    input: { padding: '0.6rem 0.8rem', border: '1px solid #1a3d1a', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', width: '100%', transition: 'border-color 0.2s', background: '#0d0d0d', color: '#e0e0e0' },
    button: (color = '#00ff41') => ({ background: 'transparent', color: color, border: `1px solid ${color}`, padding: '0.55rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', transition: 'all 0.2s' }),
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '0.75rem 0.75rem', borderBottom: '1px solid #1a3d1a', color: '#00ff41', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' },
    td: { padding: '0.75rem', borderBottom: '1px solid #0d1f0d', fontSize: '0.875rem', color: '#c0c0c0' },
    badge: (color) => ({ background: color + '15', color: color, padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', border: `1px solid ${color}33` }),
    select: { padding: '0.55rem 0.8rem', border: '1px solid #1a3d1a', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', background: '#0d0d0d', cursor: 'pointer', color: '#e0e0e0' },
    label: { display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', fontWeight: '500', color: '#6a9b6a' },
  };

  const estadoColors = {
    pendiente: '#f59e0b', en_curso: '#3b82f6', completada: '#10b981', cancelada: '#ef4444',
    programado: '#8b5cf6', 'en Curso': '#3b82f6', completado: '#10b981', cancelado: '#ef4444',
  };

  return (
    <div style={s.container}>
      <aside style={{ ...s.sidebar, width: sidebarCollapsed ? '56px' : '240px', transition: 'width 0.2s ease' }}>
        <div style={{ ...s.logo, padding: sidebarCollapsed ? '1.5rem 0.5rem' : '1.5rem', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
          <span style={{ fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>🚛</span>
          {!sidebarCollapsed && (
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>GERS</div>
              <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Plataforma Logística</div>
            </div>
          )}
        </div>
        <nav style={s.nav}>
          {menuItems.map((item) => (
            <button
              key={item.key}
              title={sidebarCollapsed ? item.label : undefined}
              style={{ ...s.navItem, justifyContent: sidebarCollapsed ? 'center' : 'flex-start', padding: sidebarCollapsed ? '0.7rem' : '0.7rem 1.5rem', ...(activeTab === item.key ? s.navItemActive : {}) }}
              onClick={() => setActiveTab(item.key)}
            >
              <span>{item.icon}</span>
              {!sidebarCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
              {!sidebarCollapsed && item.badge > 0 && (
                <span style={{ background: '#00ff41', color: '#0d0d0d', borderRadius: '10px', padding: '0.1rem 0.5rem', fontSize: '0.7rem', fontWeight: '600' }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
        {!sidebarCollapsed && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #1a3d1a', fontSize: '0.75rem', opacity: 0.4 }}>
            GERS Platform v1.0
          </div>
        )}
      </aside>

      <main style={s.main}>
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#e0e0e0' }}>Dashboard</h2>
                <p style={{ margin: '0.25rem 0 0', color: '#6a9b6a', fontSize: '0.9rem' }}>Vista general de la plataforma</p>
              </div>
              <button onClick={loadAll} style={s.button()}>Actualizar</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Unidades Totales', value: vehiculos.length, icon: '🚛', color: '#3b82f6' },
                { label: 'En Movimiento', value: vehiculosEnMovimiento.length, icon: '🟢', color: '#10b981' },
                { label: 'Detenidas', value: vehiculosOnline.filter(v => v.location?.speed <= 1).length, icon: '🔴', color: '#ef4444' },
                { label: 'Sin Señal', value: vehiculosOffline.length, icon: '⚠️', color: '#f59e0b' },
              ].map((card) => (
                <div key={card.label} style={s.statCard(card.color)}>
                  <span style={{ fontSize: '2rem' }}>{card.icon}</span>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{card.value}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>{card.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Alertas Sin Leer', value: alertasNoLeidas.length, icon: '🔔', color: '#ef4444', onClick: () => setActiveTab('alertas') },
                { label: 'Combustible Bajo (<25%)', value: vehiculos.filter(v => v.fuelLevelPercent !== null && v.fuelLevelPercent < 0.25).length, icon: '⛽', color: '#f59e0b' },
                { label: 'Geocercas Activas', value: geofences.filter(g => g.activa).length, icon: '⭕', color: '#8b5cf6', onClick: () => setActiveTab('geocercas') },
                { label: 'Viajes En Curso', value: viajes.filter(v => v.estado === 'en_curso').length, icon: '🚚', color: '#6366f1', onClick: () => setActiveTab('viajes') },
              ].map((card) => (
                <div key={card.label} onClick={card.onClick} style={{ ...s.card, borderLeft: `4px solid ${card.color}`, cursor: card.onClick ? 'pointer' : 'default', transition: 'transform 0.15s' }}
                  onMouseEnter={e => card.onClick && (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={e => card.onClick && (e.currentTarget.style.transform = 'none')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.75rem' }}>{card.icon}</span>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: card.color }}>{card.value}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6a9b6a' }}>{card.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ ...s.card, padding: 0, overflow: 'hidden', height: '300px' }}>
                <MapaUnidades vehiculos={vehiculosEnMovimiento} />
              </div>
              <div style={{ ...s.card, overflow: 'auto' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Unidades en Movimiento ({vehiculosEnMovimiento.length})</h3>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Unidad</th>
                      <th style={s.th}>Operador</th>
                      <th style={s.th}>Diesel</th>
                      <th style={s.th}>Vel.</th>
                      <th style={s.th}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehiculosEnMovimiento.slice(0, 15).map(v => (
                      <tr key={v.id} onClick={() => { setSelectedVehicle(v); }} style={{ cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#152015'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ ...s.td, fontWeight: '600' }}>{v.name}</td>
                        <td style={{ ...s.td, fontSize: '0.8rem', color: '#6a9b6a' }}>{operadores[String(v.id)] || '-'}</td>
                        <td style={s.td}>
                          {v.fuelLevelPercent !== null ? (
                            <span style={{ color: v.fuelLevelPercent > 0.25 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                              {Math.round(v.fuelLevelPercent * 100)}%
                            </span>
                          ) : <span style={{ color: '#4a8a4a' }}>N/D</span>}
                        </td>
                        <td style={s.td}>{v.location ? `${Math.round(v.location.speed || 0)}` : '-'}</td>
                        <td style={s.td}>
                          <span style={s.badge(v.isOnline ? (v.location?.speed > 1 ? '#10b981' : '#3b82f6') : '#f59e0b')}>
                            {v.isOnline ? (v.location?.speed > 1 ? 'Movimiento' : 'Detenida') : 'Sin señal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {vehiculosEnMovimiento.length > 15 && (
                  <div style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.8rem', color: '#6a9b6a', cursor: 'pointer' }}
                    onClick={() => setActiveTab('monitoreo')}>
                    Ver todas las unidades →
                  </div>
                )}
              </div>
            </div>

            {alertasNoLeidas.length > 0 && (
              <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Alertas Recientes ({alertasNoLeidas.length})</h3>
                  <span style={{ cursor: 'pointer', fontSize: '0.8rem', color: '#3b82f6' }} onClick={() => setActiveTab('alertas')}>Ver todas →</span>
                </div>
                {alertasNoLeidas.slice(0, 5).map(a => (
                  <div key={a.id} style={{ padding: '0.6rem 0', borderBottom: '1px solid #0d1f0d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={s.badge(a.tipo === 'geocerca' ? '#8b5cf6' : a.tipo === 'combustible_bajo' ? '#f59e0b' : '#3b82f6')}>
                        {a.tipo === 'geocerca' ? '⭕ Geocerca' : a.tipo === 'combustible_bajo' ? '⛽ Combustible' : a.tipo}
                      </span>
                      <span style={{ marginLeft: '0.5rem', fontWeight: '500', fontSize: '0.85rem' }}>{a.vehicle_name || a.vehicle_id}</span>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#6a9b6a' }}>{a.mensaje}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#4a8a4a' }}>{new Date(a.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'monitoreo' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Monitoreo en Tiempo Real</h2>
                <p style={{ margin: '0.25rem 0 0', color: '#6a9b6a', fontSize: '0.9rem' }}>
                  {vehiculosOnline.length} en línea | {vehiculos.filter(v => !v.isOnline).length} sin señal reciente
                </p>
              </div>
              <button onClick={loadAll} style={s.button()}>Actualizar</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem' }}>
              <div style={{ ...s.card, padding: 0, overflow: 'hidden', height: 'calc(100vh - 180px)' }}>
                <MapaUnidades vehiculos={vehiculos} />
              </div>
              <div style={{ ...s.card, overflow: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
                <h3 style={{ marginTop: 0, fontSize: '1rem', marginBottom: '1rem' }}>Unidades ({vehiculos.length})</h3>
                {vehiculos.map((v) => (
                  <div key={v.id} onClick={() => setSelectedVehicle(v)} style={{ padding: '0.6rem 0', borderBottom: '1px solid #0d1f0d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.15s', borderRadius: '6px', paddingLeft: '6px', paddingRight: '6px' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#152015'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{v.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6a9b6a' }}>
                        {operadores[String(v.id)] || 'Sin operador'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#4a8a4a' }}>
                        {v.location ? `${Math.round(v.location.speed || 0)} mph` : 'Sin ubicación'}
                        {v.fuelLevelPercent !== null && ` · ${Math.round(v.fuelLevelPercent * 100)}%`}
                        {v.lastSeen !== null && v.lastSeen !== undefined && ` · hace ${v.lastSeen}min`}
                      </div>
                    </div>
                    <span style={s.badge(v.isOnline ? '#10b981' : '#f59e0b')}>
                      {v.isOnline ? 'Online' : 'Sin señal'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'seguimiento' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Seguimiento por Unidad</h2>
                <p style={{ margin: '0.25rem 0 0', color: '#6a9b6a', fontSize: '0.9rem' }}>Comentarios y notas para reportes de clientes</p>
              </div>
              <button onClick={loadAll} style={s.button()}>Actualizar</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={s.card}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Agregar Comentario</h3>
                <form onSubmit={crearComentario}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={s.label}>Unidad *</label>
                      <select style={s.select} value={nuevoComentario.vehicle_id} onChange={(e) => {
                        const v = vehiculos.find(vh => String(vh.id) === e.target.value);
                        setNuevoComentario({ ...nuevoComentario, vehicle_id: e.target.value, vehicle_name: v?.name || '' });
                      }} required>
                        <option value="">Seleccionar unidad...</option>
                        {vehiculos.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={s.label}>Autor</label>
                      <input style={s.input} placeholder="Nombre del operador" value={nuevoComentario.autor} onChange={(e) => setNuevoComentario({ ...nuevoComentario, autor: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={s.label}>Tipo</label>
                      <select style={s.select} value={nuevoComentario.tipo} onChange={(e) => setNuevoComentario({ ...nuevoComentario, tipo: e.target.value })}>
                        <option value="seguimiento">Seguimiento</option>
                        <option value="mantenimiento">Mantenimiento</option>
                        <option value="incidente">Incidente</option>
                        <option value="entrega">Entrega</option>
                        <option value=" cliente">Nota para Cliente</option>
                      </select>
                    </div>
                    <div>
                      <label style={s.label}>Kilometraje</label>
                      <input style={s.input} type="number" placeholder="km actuales" value={nuevoComentario.kilometraje} onChange={(e) => setNuevoComentario({ ...nuevoComentario, kilometraje: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={s.label}>Título</label>
                    <input style={s.input} placeholder="Resumen del comentario" value={nuevoComentario.titulo} onChange={(e) => setNuevoComentario({ ...nuevoComentario, titulo: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={s.label}>Comentario *</label>
                    <textarea
                      style={{ ...s.input, minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }}
                      placeholder="Describe el seguimiento, estado de la unidad, observaciones para el cliente..."
                      value={nuevoComentario.contenido}
                      onChange={(e) => setNuevoComentario({ ...nuevoComentario, contenido: e.target.value })}
                      required
                    />
                  </div>
                  <button type="submit" style={{ ...s.button('#10b981'), width: '100%' }}>Guardar Comentario</button>
                </form>
              </div>

              <div style={{ ...s.card, overflow: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Historial ({comentarios.length})</h3>
                  <select style={{ ...s.select, width: 'auto' }} value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)}>
                    <option value="">Todas las unidades</option>
                    {vehiculos.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                {comentarios
                  .filter(c => !vehicleFilter || c.vehicle_id === vehicleFilter)
                  .length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#4a8a4a' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
                    <p>No hay comentarios registrados</p>
                  </div>
                ) : (
                  comentarios
                    .filter(c => !vehicleFilter || c.vehicle_id === vehicleFilter)
                    .map((c) => (
                      <div key={c.id} style={{ padding: '1rem', borderBottom: '1px solid #0d1f0d' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <div>
                            <strong style={{ fontSize: '0.9rem' }}>{c.vehicle_name || c.vehicle_id}</strong>
                            <span style={{ ...s.badge(
                              c.tipo === 'mantenimiento' ? '#f59e0b' :
                              c.tipo === 'incidente' ? '#ef4444' :
                              c.tipo === 'entrega' ? '#10b981' :
                              c.tipo === 'cliente' ? '#8b5cf6' : '#3b82f6'
                            ), marginLeft: '0.5rem' }}>{c.tipo}</span>
                          </div>
                          <button onClick={() => eliminarComentario(c.id)} style={{ ...s.button('#ef4444'), padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>X</button>
                        </div>
                        {c.titulo && <div style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{c.titulo}</div>}
                        <div style={{ fontSize: '0.85rem', color: '#c0c0c0', marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>{c.contenido}</div>
                        <div style={{ fontSize: '0.75rem', color: '#4a8a4a', display: 'flex', gap: '1rem' }}>
                          <span>{c.autor}</span>
                          {c.kilometraje && <span>{Number(c.kilometraje).toLocaleString()} km</span>}
                          <span>{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'alertas' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Alertas</h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select style={s.select} value={filtroAlertas} onChange={e => setFiltroAlertas(e.target.value)}>
                  <option value="">Todas</option>
                  <option value="geocerca">Geocercas</option>
                  <option value="combustible_bajo">Combustible Bajo</option>
                </select>
                <button onClick={loadAll} style={s.button()}>Actualizar</button>
              </div>
            </div>
            {alertas.filter(a => !filtroAlertas || a.tipo === filtroAlertas).length === 0 ? (
              <div style={{ ...s.card, textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔔</div>
                <p style={{ color: '#6a9b6a' }}>No hay alertas{filtroAlertas ? ' de este tipo' : ''} registradas</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {alertas
                  .filter(a => !filtroAlertas || a.tipo === filtroAlertas)
                  .map((a) => (
                    <div key={a.id} style={{
                      ...s.card,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      borderLeft: `4px solid ${a.severidad === 'critica' ? '#ef4444' : a.severidad === 'alta' ? '#f59e0b' : a.tipo === 'geocerca' ? '#8b5cf6' : '#3b82f6'}`,
                      opacity: a.leida ? 0.5 : 1, padding: '1rem 1.5rem'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={s.badge(a.tipo === 'geocerca' ? '#8b5cf6' : a.tipo === 'combustible_bajo' ? '#f59e0b' : '#3b82f6')}>
                            {a.tipo === 'geocerca' ? '⭕ Geocerca' : a.tipo === 'combustible_bajo' ? '⛽ Combustible' : a.tipo}
                          </span>
                          <strong>{a.vehicle_name || a.vehicle_id}</strong>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#6a9b6a', marginTop: '0.25rem' }}>{a.mensaje}</div>
                        <div style={{ fontSize: '0.75rem', color: '#4a8a4a', marginTop: '0.25rem' }}>{new Date(a.timestamp).toLocaleString()}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {!a.leida && <button onClick={() => marcarAlertaLeida(a.id)} style={s.button('#10b981')}>Leída</button>}
                        <button onClick={() => eliminarAlerta(a.id)} style={s.button('#ef4444')}>X</button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'operaciones' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Operaciones</h2>
            <div style={{ ...s.card, marginBottom: '1.5rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Nueva Operación</h3>
              <form onSubmit={crearOperacion} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label style={s.label}>Código</label>
                  <input style={s.input} placeholder="OP-001" value={nuevaOp.codigo} onChange={(e) => setNuevaOp({ ...nuevaOp, codigo: e.target.value })} required />
                </div>
                <div style={{ flex: 2, minWidth: '200px' }}>
                  <label style={s.label}>Descripción</label>
                  <input style={s.input} placeholder="Descripción" value={nuevaOp.descripcion} onChange={(e) => setNuevaOp({ ...nuevaOp, descripcion: e.target.value })} />
                </div>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label style={s.label}>Origen</label>
                  <input style={s.input} placeholder="Ciudad origen" value={nuevaOp.origen} onChange={(e) => setNuevaOp({ ...nuevaOp, origen: e.target.value })} />
                </div>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label style={s.label}>Destino</label>
                  <input style={s.input} placeholder="Ciudad destino" value={nuevaOp.destino} onChange={(e) => setNuevaOp({ ...nuevaOp, destino: e.target.value })} />
                </div>
                <button type="submit" style={s.button()}>Crear</button>
              </form>
            </div>
            <div style={s.card}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Código</th>
                    <th style={s.th}>Descripción</th>
                    <th style={s.th}>Origen</th>
                    <th style={s.th}>Destino</th>
                    <th style={s.th}>Estado</th>
                    <th style={s.th}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {operaciones.length === 0 ? (
                    <tr><td colSpan="6" style={{ ...s.td, textAlign: 'center', color: '#4a8a4a', padding: '2rem' }}>No hay operaciones</td></tr>
                  ) : operaciones.map((op) => (
                    <tr key={op.id}>
                      <td style={s.td}><strong>{op.codigo}</strong></td>
                      <td style={s.td}>{op.descripcion}</td>
                      <td style={s.td}>{op.origen}</td>
                      <td style={s.td}>{op.destino}</td>
                      <td style={s.td}><span style={s.badge(estadoColors[op.estado] || '#6b7280')}>{op.estado}</span></td>
                      <td style={s.td}>
                        <select style={s.select} value={op.estado} onChange={(e) => actualizarEstadoOp(op.id, e.target.value)}>
                          <option value="pendiente">Pendiente</option>
                          <option value="en_curso">En Curso</option>
                          <option value="completada">Completada</option>
                          <option value="cancelada">Cancelada</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'viajes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#e0e0e0' }}>Programación de Viajes</h2>
                <p style={{ margin: '0.25rem 0 0', color: '#6a9b6a', fontSize: '0.9rem' }}>{viajes.length} viajes registrados · {viajes.filter(v => v.estado === 'en_curso').length} en curso</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={s.card}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', color: '#e0e0e0' }}>Nuevo Viaje</h3>
                <form onSubmit={crearViaje}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={s.label}>Vehículo</label>
                      <select style={s.select} value={formViaje.vehicle_id} onChange={(e) => {
                        const v = vehiculos.find(vh => String(vh.id) === e.target.value);
                        setFormViaje({ ...formViaje, vehicle_id: e.target.value, vehicle_name: v?.name || '', origen: v?.location?.location || formViaje.origen });
                      }}>
                        <option value="">Seleccionar...</option>
                        {vehiculos.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={s.label}>Conductor</label>
                      <input style={s.input} placeholder="Nombre" value={formViaje.conductor} onChange={(e) => setFormViaje({ ...formViaje, conductor: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={s.label}>Origen</label>
                      <input style={s.input} placeholder="Ciudad de origen" value={formViaje.origen} onChange={(e) => setFormViaje({ ...formViaje, origen: e.target.value })} />
                    </div>
                    <div>
                      <label style={s.label}>Destino</label>
                      <input style={s.input} placeholder="Ciudad de destino" value={formViaje.destino} onChange={(e) => setFormViaje({ ...formViaje, destino: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={s.label}>Fecha Inicio</label>
                      <input style={s.input} type="datetime-local" value={formViaje.fecha_inicio} onChange={(e) => setFormViaje({ ...formViaje, fecha_inicio: e.target.value })} />
                    </div>
                    <div>
                      <label style={s.label}>Fecha Fin</label>
                      <input style={s.input} type="datetime-local" value={formViaje.fecha_fin} onChange={(e) => setFormViaje({ ...formViaje, fecha_fin: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={s.label}>Notas</label>
                    <input style={s.input} placeholder="Notas del viaje" value={formViaje.notas} onChange={(e) => setFormViaje({ ...formViaje, notas: e.target.value })} />
                  </div>
                  <button type="submit" style={{ ...s.button(), width: '100%' }}>Programar Viaje</button>
                </form>
              </div>
              <div style={s.card}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', color: '#e0e0e0' }}>Vehículo Seleccionado</h3>
                {formViaje.vehicle_id ? (() => {
                  const v = vehiculos.find(vh => String(vh.id) === formViaje.vehicle_id);
                  if (!v) return <div style={{ color: '#4a8a4a' }}>No encontrado</div>;
                  return (
                    <div style={{ fontSize: '0.85rem' }}>
                      <div style={{ padding: '0.75rem', background: '#111', borderRadius: '8px', border: '1px solid #1a3d1a' }}>
                        <div style={{ fontWeight: '600', color: '#00ff41', fontSize: '1rem', marginBottom: '0.5rem' }}>{v.name}</div>
                        <div style={{ color: '#c0c0c0' }}>Operador: {operadores[String(v.id)] || 'Sin asignar'}</div>
                        <div style={{ color: '#c0c0c0' }}>Ubicación: {v.location?.location || 'Sin datos'}</div>
                        <div style={{ color: '#c0c0c0' }}>Diesel: {v.fuelLevelPercent !== null ? `${Math.round(v.fuelLevelPercent * 100)}%` : 'N/D'}</div>
                        <div style={{ color: v.isOnline ? '#00ff41' : '#f59e0b' }}>Estado: {v.isOnline ? 'Online' : 'Sin señal'}</div>
                      </div>
                    </div>
                  );
                })() : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#4a8a4a' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚗</div>
                    <p>Selecciona un vehículo para ver sus datos</p>
                    <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>El origen se auto-llenará con la ubicación actual</p>
                  </div>
                )}
              </div>
            </div>
            <div style={s.card}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Vehículo</th>
                    <th style={s.th}>Conductor</th>
                    <th style={s.th}>Ruta</th>
                    <th style={s.th}>Inicio</th>
                    <th style={s.th}>Fin</th>
                    <th style={s.th}>Estado</th>
                    <th style={s.th}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {viajes.length === 0 ? (
                    <tr><td colSpan="7" style={{ ...s.td, textAlign: 'center', color: '#4a8a4a', padding: '2rem' }}>No hay viajes programados</td></tr>
                  ) : viajes.map((v) => (
                    <tr key={v.id}>
                      <td style={s.td}><strong style={{ color: '#00ff41' }}>{v.vehicle_name || v.vehicle_id}</strong></td>
                      <td style={s.td}>{v.conductor}</td>
                      <td style={s.td}>{v.origen} → {v.destino}</td>
                      <td style={s.td}>{v.fecha_inicio ? new Date(v.fecha_inicio).toLocaleDateString() : '-'}</td>
                      <td style={s.td}>{v.fecha_fin ? new Date(v.fecha_fin).toLocaleDateString() : '-'}</td>
                      <td style={s.td}><span style={s.badge(estadoColors[v.estado] || '#6a9b6a')}>{v.estado}</span></td>
                      <td style={s.td}>
                        <select style={{ ...s.select, marginRight: '0.5rem' }} value={v.estado} onChange={(e) => actualizarEstadoViaje(v.id, e.target.value)}>
                          <option value="programado">Programado</option>
                          <option value="en_curso">En Curso</option>
                          <option value="completado">Completado</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                        <button onClick={() => eliminarViaje(v.id)} style={s.button('#ef4444')}>X</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'operadores' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Operadores Samsara</h2>
                <p style={{ margin: '0.25rem 0 0', color: '#6a9b6a', fontSize: '0.9rem' }}>{samsaraDrivers.length} operadores registrados</p>
              </div>
              <input
                placeholder="Buscar operador..."
                value={filtroOperador}
                onChange={e => setFiltroOperador(e.target.value)}
                style={{ ...s.input, width: '280px' }}
              />
            </div>

            <div style={{ ...s.card }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Nombre</th>
                    <th style={s.th}>Username</th>
                    <th style={s.th}>Teléfono</th>
                    <th style={s.th}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {samsaraDrivers
                    .filter(d => !filtroOperador || d.name.toLowerCase().includes(filtroOperador.toLowerCase()) || (d.username && d.username.toLowerCase().includes(filtroOperador.toLowerCase())))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((driver) => (
                      <tr key={driver.id}>
                        <td style={{ ...s.td, fontWeight: '500' }}>{driver.name}</td>
                        <td style={s.td}>{driver.username || '-'}</td>
                        <td style={s.td}>{driver.phone || '-'}</td>
                        <td style={s.td}>
                          <span style={s.badge(driver.status === 'active' ? '#10b981' : '#ef4444')}>
                            {driver.status === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'geocercas' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Geocercas</h2>
                <p style={{ margin: '0.25rem 0 0', color: '#6a9b6a', fontSize: '0.9rem' }}>{geofences.length} geocercas configuradas</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={ejecutarCheckGeofences} style={s.button('#f59e0b')}>Verificar Geocercas</button>
                <button onClick={ejecutarCheckFuel} style={s.button('#ef4444')}>Verificar Diesel</button>
                <button onClick={loadAll} style={s.button()}>Actualizar</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={s.card}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Nueva Geocerca</h3>
                <form onSubmit={crearGeofence}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={s.label}>Nombre *</label>
                    <input style={s.input} placeholder="Ej: Planta GERS Chihuahua" value={formGeofence.nombre} onChange={e => setFormGeofence({...formGeofence, nombre: e.target.value})} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={s.label}>Latitud *</label>
                      <input style={s.input} type="number" step="any" placeholder="28.6353" value={formGeofence.latitud} onChange={e => setFormGeofence({...formGeofence, latitud: e.target.value})} required />
                    </div>
                    <div>
                      <label style={s.label}>Longitud *</label>
                      <input style={s.input} type="number" step="any" placeholder="-106.0889" value={formGeofence.longitud} onChange={e => setFormGeofence({...formGeofence, longitud: e.target.value})} required />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={s.label}>Radio (metros)</label>
                      <input style={s.input} type="number" placeholder="500" value={formGeofence.radio_metros} onChange={e => setFormGeofence({...formGeofence, radio_metros: e.target.value})} />
                    </div>
                    <div>
                      <label style={s.label}>Color</label>
                      <input style={{ ...s.input, height: '36px', padding: '4px' }} type="color" value={formGeofence.color} onChange={e => setFormGeofence({...formGeofence, color: e.target.value})} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={s.label}>Descripción</label>
                    <input style={s.input} placeholder="Descripción de la geocerca" value={formGeofence.descripcion} onChange={e => setFormGeofence({...formGeofence, descripcion: e.target.value})} />
                  </div>
                  <button type="submit" style={{ ...s.button('#10b981'), width: '100%' }}>Crear Geocerca</button>
                </form>
              </div>

              <div style={{ ...s.card, overflow: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Geocercas Activas</h3>
                {geofences.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#4a8a4a' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⭕</div>
                    <p>No hay geocercas configuradas</p>
                  </div>
                ) : geofences.map(g => (
                  <div key={g.id} style={{ padding: '0.75rem', borderBottom: '1px solid #0d1f0d', opacity: g.activa ? 1 : 0.5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: g.color, display: 'inline-block' }}></span>
                          {g.nombre}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#4a8a4a', marginTop: '0.25rem' }}>
                          {g.latitud.toFixed(5)}, {g.longitud.toFixed(5)} · Radio: {g.radio_metros}m
                        </div>
                        {g.descripcion && <div style={{ fontSize: '0.8rem', color: '#6a9b6a', marginTop: '0.25rem' }}>{g.descripcion}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => toggleGeofence(g.id, g.activa)} style={{ ...s.button(g.activa ? '#f59e0b' : '#10b981'), padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                          {g.activa ? 'Desactivar' : 'Activar'}
                        </button>
                        <button onClick={() => eliminarGeofence(g.id)} style={{ ...s.button('#ef4444'), padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>X</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {geofenceEvents.length > 0 && (
              <div style={{ ...s.card, marginTop: '1.5rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Historial de Eventos ({geofenceEvents.length})</h3>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Unidad</th>
                      <th style={s.th}>Geocerca</th>
                      <th style={s.th}>Evento</th>
                      <th style={s.th}>Fecha/Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {geofenceEvents.slice(0, 50).map(ev => (
                      <tr key={ev.id}>
                        <td style={s.td}><strong>{ev.vehicle_name || ev.vehicle_id}</strong></td>
                        <td style={s.td}>{ev.geofence_nombre}</td>
                        <td style={s.td}>
                          <span style={s.badge(ev.tipo === 'entrada' ? '#10b981' : '#ef4444')}>
                            {ev.tipo === 'entrada' ? '→ Entró' : '← Salió'}
                          </span>
                        </td>
                        <td style={s.td}>{new Date(ev.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'rutas' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#e0e0e0' }}>Historial de Rutas</h2>
                <p style={{ margin: '0.25rem 0 0', color: '#6a9b6a', fontSize: '0.9rem' }}>Replay de rutas por vehículo y fecha</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={s.label}>Vehículo</label>
                <select style={s.select} value={routeVehicleId} onChange={e => cargarFechasRuta(e.target.value)}>
                  <option value="">Seleccionar vehículo...</option>
                  {vehiculos.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Fecha</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input style={{ ...s.input, flex: 1 }} type="date" value={routeDate} onChange={e => setRouteDate(e.target.value)} />
                  <button onClick={cargarHistorialRuta} style={s.button()}>Buscar</button>
                </div>
              </div>
            </div>

            {routeDates.length > 0 && (
              <div style={{ ...s.card, marginBottom: '1.5rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '0.9rem', color: '#e0e0e0' }}>Días disponibles</h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {routeDates.map(d => (
                    <button key={d.fecha} onClick={() => { setRouteDate(d.fecha); }}
                      style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: `1px solid ${routeDate === d.fecha ? '#00ff41' : '#1a3d1a'}`, background: routeDate === d.fecha ? '#00ff4115' : '#111', color: routeDate === d.fecha ? '#00ff41' : '#c0c0c0', cursor: 'pointer', fontSize: '0.8rem' }}>
                      {d.fecha} ({d.puntos} pts)
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
              <div style={{ ...s.card, padding: 0, overflow: 'hidden', height: 'calc(100vh - 320px)' }}>
                <RouteMap points={routeHistory} />
              </div>
              <div style={{ ...s.card, overflow: 'auto', maxHeight: 'calc(100vh - 320px)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '0.9rem', color: '#e0e0e0' }}>
                  Puntos ({routeHistory.length})
                </h3>
                {routeLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#4a8a4a' }}>Cargando...</div>
                ) : routeHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#4a8a4a' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛤️</div>
                    <p>Selecciona vehículo y fecha</p>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '0.75rem', padding: '0.6rem', background: '#111', borderRadius: '8px', border: '1px solid #1a3d1a', fontSize: '0.8rem', color: '#6a9b6a' }}>
                      <strong>{routeHistory.length}</strong> puntos registrados<br/>
                      <span style={{ color: '#4a8a4a' }}>
                        {new Date(routeHistory[0].recorded_at).toLocaleTimeString()} - {new Date(routeHistory[routeHistory.length - 1].recorded_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ maxHeight: 'calc(100vh - 480px)', overflow: 'auto' }}>
                      {routeHistory.map((p, i) => (
                        <div key={p.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #0d1f0d', fontSize: '0.8rem' }}>
                          <div style={{ color: '#c0c0c0' }}>
                            <span style={{ color: '#00ff41', fontWeight: '600' }}>{new Date(p.recorded_at).toLocaleTimeString()}</span>
                            {' · '}{Math.round(p.speed || 0)} mph
                          </div>
                          <div style={{ color: '#4a8a4a', fontSize: '0.75rem' }}>{p.location || 'Sin dirección'}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reportes' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Reportes</h2>
            <div style={{ ...s.card, marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                  <label style={s.label}>Tipo</label>
                  <select style={s.select} value={filtroReporte.tipo} onChange={(e) => setFiltroReporte({ ...filtroReporte, tipo: e.target.value })}>
                    <option value="operaciones">Operaciones</option>
                    <option value="viajes">Viajes</option>
                    <option value="seguimiento">Seguimiento / Comentarios</option>
                  </select>
                </div>
                {filtroReporte.tipo === 'seguimiento' && (
                  <div>
                    <label style={s.label}>Unidad</label>
                    <select style={s.select} value={filtroReporte.vehicle_id || ''} onChange={(e) => setFiltroReporte({ ...filtroReporte, vehicle_id: e.target.value })}>
                      <option value="">Todas</option>
                      {vehiculos.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label style={s.label}>Fecha Inicio</label>
                  <input style={s.input} type="date" value={filtroReporte.fecha_inicio} onChange={(e) => setFiltroReporte({ ...filtroReporte, fecha_inicio: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>Fecha Fin</label>
                  <input style={s.input} type="date" value={filtroReporte.fecha_fin} onChange={(e) => setFiltroReporte({ ...filtroReporte, fecha_fin: e.target.value })} />
                </div>
                <button onClick={cargarReporte} style={s.button('#10b981')}>Generar</button>
              </div>
            </div>
            <div style={s.card}>
              {reportes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6a9b6a' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📈</div>
                  <p>Selecciona filtros y haz clic en &quot;Generar&quot;</p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.9rem' }}>
                    <strong>{reportes.length}</strong> registros encontrados
                  </div>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {reportes.length > 0 && Object.keys(reportes[0]).filter(k => k !== 'id').map((key) => (
                          <th key={key} style={s.th}>{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportes.map((row, i) => (
                        <tr key={row.id || i}>
                          {Object.entries(row).filter(([k]) => k !== 'id').map(([key, val]) => (
                            <td key={key} style={s.td}>{val !== null ? String(val) : '-'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {selectedVehicle && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setSelectedVehicle(null)}>
          <div style={{ background: '#0d0d0d', borderRadius: '16px', width: '520px', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(0,255,65,0.1)', border: '1px solid #1a3d1a' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #1a3d1a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#e0e0e0' }}>{selectedVehicle.name}</h2>
                  <p style={{ margin: '0.25rem 0 0', color: '#6a9b6a', fontSize: '0.85rem' }}>{selectedVehicle.id}</p>
                </div>
                <button onClick={() => setSelectedVehicle(null)} style={{ background: '#1a1a1a', border: '1px solid #00ff41', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1.1rem', color: '#00ff41' }}>✕</button>
              </div>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Ubicación</div>
                  <div style={{ fontSize: '0.85rem', color: '#e0e0e0', fontWeight: '500' }}>
                    {selectedVehicle.location ? selectedVehicle.location.location || 'Sin dirección' : 'Sin datos'}
                  </div>
                  {selectedVehicle.location && (
                    <div style={{ fontSize: '0.75rem', color: '#4a8a4a', marginTop: '0.25rem' }}>
                      {selectedVehicle.location.latitude.toFixed(5)}, {selectedVehicle.location.longitude.toFixed(5)}
                    </div>
                  )}
                </div>
                <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Diesel</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: selectedVehicle.fuelLevelPercent > 0.25 ? '#10b981' : '#ef4444' }}>
                    {selectedVehicle.fuelLevelPercent !== null ? `${Math.round(selectedVehicle.fuelLevelPercent * 100)}%` : 'N/D'}
                  </div>
                </div>
              </div>

              <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Operador Asignado</div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    placeholder="Nombre del operador..."
                    value={operadores[String(selectedVehicle.id)] || ''}
                    onChange={e => setOperadores(prev => ({ ...prev, [String(selectedVehicle.id)]: e.target.value }))}
                    style={{ flex: 1, padding: '0.55rem 0.75rem', border: '1px solid #1a3d1a', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                  <button
                    onClick={() => guardarOperador(selectedVehicle.id, selectedVehicle.name, operadores[String(selectedVehicle.id)] || '')}
                    style={{ padding: '0.55rem 0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    Asignar
                  </button>
                </div>
              </div>

              {selectedVehicle.location && (
                <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#4a8a4a', textTransform: 'uppercase' }}>Velocidad</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600' }}>{Math.round(selectedVehicle.location.speed || 0)} mph</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#4a8a4a', textTransform: 'uppercase' }}>Estado</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: selectedVehicle.isOnline ? '#10b981' : '#f59e0b' }}>
                        {selectedVehicle.isOnline ? 'Online' : 'Sin señal'}
                      </div>
                    </div>
                    {selectedVehicle.lastSeen !== null && selectedVehicle.lastSeen !== undefined && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#4a8a4a', textTransform: 'uppercase' }}>Última señal</div>
                        <div style={{ fontSize: '1rem', fontWeight: '600' }}>hace {selectedVehicle.lastSeen}min</div>
                      </div>
                    )}
                    {selectedVehicle.odometerMeters && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#4a8a4a', textTransform: 'uppercase' }}>Kilometraje</div>
                        <div style={{ fontSize: '1rem', fontWeight: '600' }}>{(selectedVehicle.odometerMeters / 1000).toFixed(0)} km</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ borderTop: '1px solid #1a3d1a', paddingTop: '1.25rem' }}>
                <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: '#e0e0e0' }}>Agregar Comentario</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <input placeholder="Monitorista" value={comentarioRapido.autor} onChange={e => setComentarioRapido({...comentarioRapido, autor: e.target.value})}
                    style={{ padding: '0.55rem 0.75rem', border: '1px solid #1a3d1a', borderRadius: '8px', fontSize: '0.85rem' }} />
                  <select value={comentarioRapido.tipo} onChange={e => setComentarioRapido({...comentarioRapido, tipo: e.target.value})}
                    style={{ padding: '0.55rem 0.75rem', border: '1px solid #1a3d1a', borderRadius: '8px', fontSize: '0.85rem' }}>
                    <option value="seguimiento">Seguimiento</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="alerta">Alerta</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <input placeholder="ETA (hora estimada llegada)" value={comentarioRapido.titulo} onChange={e => setComentarioRapido({...comentarioRapido, titulo: e.target.value})}
                    style={{ padding: '0.55rem 0.75rem', border: '1px solid #1a3d1a', borderRadius: '8px', fontSize: '0.85rem' }} />
                  <input placeholder="Kilometraje" type="number" value={comentarioRapido.kilometraje} onChange={e => setComentarioRapido({...comentarioRapido, kilometraje: e.target.value})}
                    style={{ padding: '0.55rem 0.75rem', border: '1px solid #1a3d1a', borderRadius: '8px', fontSize: '0.85rem' }} />
                </div>
                <textarea placeholder="Escribe el mensaje de seguimiento..." value={comentarioRapido.contenido} onChange={e => setComentarioRapido({...comentarioRapido, contenido: e.target.value})}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #1a3d1a', borderRadius: '8px', fontSize: '0.85rem', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                  <button onClick={guardarComentarioRapido}
                    style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.55rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>
                    Guardar Comentario
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
