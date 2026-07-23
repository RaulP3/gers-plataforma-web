'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const MapaUnidades = dynamic(() => import('../components/MapaUnidades'), { ssr: false });

const API_URL = 'http://localhost:3001/api';

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

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, opsRes, viajesRes, alertasRes, vehiculosRes, comentariosRes, operadoresRes, driversRes] = await Promise.allSettled([
        fetch(`${API_URL}/reportes/resumen`).then(r => r.json()),
        fetch(`${API_URL}/operaciones`).then(r => r.json()),
        fetch(`${API_URL}/viajes`).then(r => r.json()),
        fetch(`${API_URL}/alertas`).then(r => r.json()),
        fetch(`${API_URL}/samsara/vehicles`).then(r => r.json()),
        fetch(`${API_URL}/comentarios`).then(r => r.json()),
        fetch(`${API_URL}/vehicle-operators`).then(r => r.json()),
        fetch(`${API_URL}/samsara/drivers`).then(r => r.json()),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (opsRes.status === 'fulfilled') setOperaciones(opsRes.value);
      if (viajesRes.status === 'fulfilled') setViajes(viajesRes.value);
      if (alertasRes.status === 'fulfilled') setAlertas(alertasRes.value);
      if (comentariosRes.status === 'fulfilled') setComentarios(comentariosRes.value);
      if (driversRes.status === 'fulfilled') setSamsaraDrivers(driversRes.value || []);
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

  const menuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'monitoreo', label: 'Monitoreo', icon: '🗺️' },
    { key: 'seguimiento', label: 'Seguimiento', icon: '📝' },
    { key: 'alertas', label: 'Alertas', icon: '🔔', badge: alertasNoLeidas.length },
    { key: 'operaciones', label: 'Operaciones', icon: '📋' },
    { key: 'viajes', label: 'Viajes', icon: '🚚' },
    { key: 'operadores', label: 'Operadores', icon: '👤' },
    { key: 'reportes', label: 'Reportes', icon: '📈' },
  ];

  const s = {
    container: { fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', display: 'flex', background: '#f0f2f5' },
    sidebar: { width: '240px', background: 'linear-gradient(180deg, #1a365d 0%, #0f2440 100%)', color: 'white', display: 'flex', flexDirection: 'column', flexShrink: 0 },
    logo: { padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem' },
    nav: { flex: 1, padding: '0.75rem 0' },
    navItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 1.5rem', cursor: 'pointer', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.6)', width: '100%', textAlign: 'left', fontSize: '0.9rem', transition: 'all 0.2s', borderRadius: '0' },
    navItemActive: { background: 'rgba(255,255,255,0.1)', color: 'white', borderRight: '3px solid #60a5fa' },
    main: { flex: 1, padding: '1.5rem 2rem', overflow: 'auto' },
    card: { background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)' },
    statCard: (color, icon) => ({ background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: 'white', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }),
    input: { padding: '0.6rem 0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', width: '100%', transition: 'border-color 0.2s' },
    button: (color = '#3b82f6') => ({ background: color, color: 'white', border: 'none', padding: '0.55rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', transition: 'opacity 0.2s' }),
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '0.75rem 0.75rem', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' },
    td: { padding: '0.75rem', borderBottom: '1px solid #f3f4f6', fontSize: '0.875rem' },
    badge: (color) => ({ background: color + '20', color: color, padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600' }),
    select: { padding: '0.55rem 0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', background: 'white', cursor: 'pointer' },
    label: { display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', fontWeight: '500', color: '#4b5563' },
  };

  const estadoColors = {
    pendiente: '#f59e0b', en_curso: '#3b82f6', completada: '#10b981', cancelada: '#ef4444',
    programado: '#8b5cf6', 'en Curso': '#3b82f6', completado: '#10b981', cancelado: '#ef4444',
  };

  return (
    <div style={s.container}>
      <aside style={s.sidebar}>
        <div style={s.logo}>
          <span style={{ fontSize: '1.5rem' }}>🚛</span>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>GERS</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Plataforma Logística</div>
          </div>
        </div>
        <nav style={s.nav}>
          {menuItems.map((item) => (
            <button
              key={item.key}
              style={{ ...s.navItem, ...(activeTab === item.key ? s.navItemActive : {}) }}
              onClick={() => setActiveTab(item.key)}
            >
              <span>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ background: '#ef4444', color: 'white', borderRadius: '10px', padding: '0.1rem 0.5rem', fontSize: '0.7rem', fontWeight: '600' }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem', opacity: 0.4 }}>
          GERS Platform v1.0
        </div>
      </aside>

      <main style={s.main}>
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Dashboard</h2>
                <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>Vista general de la plataforma</p>
              </div>
              <button onClick={loadAll} style={s.button()}>Actualizar</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Unidades Totales', value: vehiculos.length, icon: '🚛', color: '#3b82f6' },
                { label: 'En Movimiento', value: vehiculosOnline.filter(v => v.location?.speed > 1).length, icon: '🟢', color: '#10b981' },
                { label: 'Detenidas', value: vehiculosOnline.filter(v => v.location?.speed <= 1).length, icon: '🔴', color: '#ef4444' },
                { label: 'Con Ubicación', value: vehiculos.filter(v => v.location).length, icon: '📍', color: '#8b5cf6' },
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {[
                { label: 'Operaciones', value: stats.totalOperaciones || 0, color: '#6366f1' },
                { label: 'Viajes Programados', value: stats.viajesProgramados || 0, color: '#8b5cf6' },
                { label: 'Viajes Totales', value: stats.totalViajes || 0, color: '#a855f7' },
                { label: 'Alertas Pendientes', value: stats.alertasNoLeidas || 0, color: '#ef4444' },
              ].map((card) => (
                <div key={card.label} style={{ ...s.card, borderLeft: `4px solid ${card.color}` }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: card.color }}>{card.value}</div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>{card.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'monitoreo' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Monitoreo en Tiempo Real</h2>
                <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
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
                  <div key={v.id} onClick={() => setSelectedVehicle(v)} style={{ padding: '0.6rem 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.15s', borderRadius: '6px', paddingLeft: '6px', paddingRight: '6px' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f5ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{v.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {operadores[String(v.id)] || 'Sin operador'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
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
                <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>Comentarios y notas para reportes de clientes</p>
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
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
                    <p>No hay comentarios registrados</p>
                  </div>
                ) : (
                  comentarios
                    .filter(c => !vehicleFilter || c.vehicle_id === vehicleFilter)
                    .map((c) => (
                      <div key={c.id} style={{ padding: '1rem', borderBottom: '1px solid #f3f4f6' }}>
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
                        <div style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>{c.contenido}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', gap: '1rem' }}>
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
              <button onClick={loadAll} style={s.button()}>Actualizar</button>
            </div>
            {alertas.length === 0 ? (
              <div style={{ ...s.card, textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔔</div>
                <p style={{ color: '#6b7280' }}>No hay alertas registradas</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {alertas.map((a) => (
                  <div key={a.id} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${a.severidad === 'critica' ? '#ef4444' : a.severidad === 'alta' ? '#f59e0b' : '#3b82f6'}`, opacity: a.leida ? 0.5 : 1, padding: '1rem 1.5rem' }}>
                    <div>
                      <strong>{a.tipo}</strong> - {a.vehicle_name || a.vehicle_id}
                      <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>{a.mensaje}</div>
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
                    <tr><td colSpan="6" style={{ ...s.td, textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No hay operaciones</td></tr>
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
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Programación de Viajes</h2>
            <div style={{ ...s.card, marginBottom: '1.5rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Nuevo Viaje</h3>
              <form onSubmit={crearViaje} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={s.label}>Vehículo</label>
                  <select style={s.select} value={formViaje.vehicle_id} onChange={(e) => {
                    const v = vehiculos.find(vh => String(vh.id) === e.target.value);
                    setFormViaje({ ...formViaje, vehicle_id: e.target.value, vehicle_name: v?.name || '' });
                  }}>
                    <option value="">Seleccionar...</option>
                    {vehiculos.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={s.label}>Conductor</label>
                  <input style={s.input} placeholder="Nombre" value={formViaje.conductor} onChange={(e) => setFormViaje({ ...formViaje, conductor: e.target.value })} />
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={s.label}>Origen</label>
                  <input style={s.input} placeholder="Ciudad" value={formViaje.origen} onChange={(e) => setFormViaje({ ...formViaje, origen: e.target.value })} />
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={s.label}>Destino</label>
                  <input style={s.input} placeholder="Ciudad" value={formViaje.destino} onChange={(e) => setFormViaje({ ...formViaje, destino: e.target.value })} />
                </div>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <label style={s.label}>Fecha Inicio</label>
                  <input style={s.input} type="datetime-local" value={formViaje.fecha_inicio} onChange={(e) => setFormViaje({ ...formViaje, fecha_inicio: e.target.value })} />
                </div>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <label style={s.label}>Fecha Fin</label>
                  <input style={s.input} type="datetime-local" value={formViaje.fecha_fin} onChange={(e) => setFormViaje({ ...formViaje, fecha_fin: e.target.value })} />
                </div>
                <div style={{ flex: 2, minWidth: '200px' }}>
                  <label style={s.label}>Notas</label>
                  <input style={s.input} placeholder="Notas" value={formViaje.notas} onChange={(e) => setFormViaje({ ...formViaje, notas: e.target.value })} />
                </div>
                <button type="submit" style={s.button('#8b5cf6')}>Programar</button>
              </form>
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
                    <tr><td colSpan="7" style={{ ...s.td, textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No hay viajes programados</td></tr>
                  ) : viajes.map((v) => (
                    <tr key={v.id}>
                      <td style={s.td}><strong>{v.vehicle_name || v.vehicle_id}</strong></td>
                      <td style={s.td}>{v.conductor}</td>
                      <td style={s.td}>{v.origen} → {v.destino}</td>
                      <td style={s.td}>{v.fecha_inicio ? new Date(v.fecha_inicio).toLocaleDateString() : '-'}</td>
                      <td style={s.td}>{v.fecha_fin ? new Date(v.fecha_fin).toLocaleDateString() : '-'}</td>
                      <td style={s.td}><span style={s.badge(estadoColors[v.estado] || '#6b7280')}>{v.estado}</span></td>
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
                <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>{samsaraDrivers.length} operadores registrados</p>
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
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setSelectedVehicle(null)}>
          <div style={{ background: 'white', borderRadius: '16px', width: '520px', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>{selectedVehicle.name}</h2>
                  <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.85rem' }}>{selectedVehicle.id}</p>
                </div>
                <button onClick={() => setSelectedVehicle(null)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1.1rem', color: '#6b7280' }}>✕</button>
              </div>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Ubicación</div>
                  <div style={{ fontSize: '0.85rem', color: '#111827', fontWeight: '500' }}>
                    {selectedVehicle.location ? selectedVehicle.location.location || 'Sin dirección' : 'Sin datos'}
                  </div>
                  {selectedVehicle.location && (
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                      {selectedVehicle.location.latitude.toFixed(5)}, {selectedVehicle.location.longitude.toFixed(5)}
                    </div>
                  )}
                </div>
                <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Diesel</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: selectedVehicle.fuelLevelPercent > 0.25 ? '#10b981' : '#ef4444' }}>
                    {selectedVehicle.fuelLevelPercent !== null ? `${Math.round(selectedVehicle.fuelLevelPercent * 100)}%` : 'N/D'}
                  </div>
                </div>
              </div>

              <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Operador Asignado</div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    placeholder="Nombre del operador..."
                    value={operadores[String(selectedVehicle.id)] || ''}
                    onChange={e => setOperadores(prev => ({ ...prev, [String(selectedVehicle.id)]: e.target.value }))}
                    style={{ flex: 1, padding: '0.55rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                  <button
                    onClick={() => guardarOperador(selectedVehicle.id, selectedVehicle.name, operadores[String(selectedVehicle.id)] || '')}
                    style={{ padding: '0.55rem 0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    Asignar
                  </button>
                </div>
              </div>

              {selectedVehicle.location && (
                <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Velocidad</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600' }}>{Math.round(selectedVehicle.location.speed || 0)} mph</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Estado</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: selectedVehicle.isOnline ? '#10b981' : '#f59e0b' }}>
                        {selectedVehicle.isOnline ? 'Online' : 'Sin señal'}
                      </div>
                    </div>
                    {selectedVehicle.lastSeen !== null && selectedVehicle.lastSeen !== undefined && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Última señal</div>
                        <div style={{ fontSize: '1rem', fontWeight: '600' }}>hace {selectedVehicle.lastSeen}min</div>
                      </div>
                    )}
                    {selectedVehicle.odometerMeters && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Kilometraje</div>
                        <div style={{ fontSize: '1rem', fontWeight: '600' }}>{(selectedVehicle.odometerMeters / 1000).toFixed(0)} km</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.25rem' }}>
                <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: '#111827' }}>Agregar Comentario</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <input placeholder="Monitorista" value={comentarioRapido.autor} onChange={e => setComentarioRapido({...comentarioRapido, autor: e.target.value})}
                    style={{ padding: '0.55rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.85rem' }} />
                  <select value={comentarioRapido.tipo} onChange={e => setComentarioRapido({...comentarioRapido, tipo: e.target.value})}
                    style={{ padding: '0.55rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.85rem' }}>
                    <option value="seguimiento">Seguimiento</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="alerta">Alerta</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <input placeholder="ETA (hora estimada llegada)" value={comentarioRapido.titulo} onChange={e => setComentarioRapido({...comentarioRapido, titulo: e.target.value})}
                    style={{ padding: '0.55rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.85rem' }} />
                  <input placeholder="Kilometraje" type="number" value={comentarioRapido.kilometraje} onChange={e => setComentarioRapido({...comentarioRapido, kilometraje: e.target.value})}
                    style={{ padding: '0.55rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.85rem' }} />
                </div>
                <textarea placeholder="Escribe el mensaje de seguimiento..." value={comentarioRapido.contenido} onChange={e => setComentarioRapido({...comentarioRapido, contenido: e.target.value})}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.85rem', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' }} />
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
