'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

import {
  activarConTeclado,
  destinoViajeActual,
  destinosViaje,
  estaEnMovimiento,
  normalizarMatch,
  ordenarViajesPorUnidad,
  paradaActualViaje,
  paradasViaje,
  parseDestinos,
} from '../lib/viajes';

import {
  ProgramarViajeModal,
} from './modals';

const MapaUnidades = dynamic(() => import('./MapaUnidades'), { ssr: false });
const RouteMap = dynamic(() => import('./RouteMap'), { ssr: false });

export function Sidebar({
  activeTab,
  currentUser,
  handleLogout,
  menuItems,
  s,
  setActiveTab,
  setSidebarCollapsed,
  sidebarCollapsed,
}) {
  return (<aside className="app-sidebar" style={{ ...s.sidebar, width: sidebarCollapsed ? '56px' : '240px', transition: 'width 0.2s ease' }}>
        <div style={{ ...s.logo, padding: sidebarCollapsed ? '1.5rem 0.5rem' : '1.5rem', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
          <button type="button" aria-label={sidebarCollapsed ? 'Expandir navegación' : 'Contraer navegación'} style={{ fontSize: '1.5rem', cursor: 'pointer', background: 'none', border: 0 }} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>🚛</button>
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
        {!sidebarCollapsed && currentUser && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #1a3d1a' }}>
            <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: '0.75rem' }}>{currentUser.nombre || currentUser.username}</div>
            <button onClick={handleLogout} style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #00ff41', background: 'transparent', color: '#00ff41', cursor: 'pointer' }}>Salir</button>
          </div>
        )}
      </aside>);
}

export function DashboardSection({
  alertasNoLeidas,
  allGeofences,
  citasOperativas,
  clientes,
  customRiskZones,
  defaultZonesList,
  estadoColors,
  geofenceLinks,
  kpis,
  loadAll,
  numeroRemolque,
  operadores,
  parseCitaDate,
  parseFecha,
  pendientes,
  remolques,
  samsaraDrivers,
  seguimiento,
  setActiveTab,
  setCitaSeleccionada,
  setPlacingZone,
  setShowTurnoModal,
  setShowViajeModal,
  setTurnoSummary,
  setViajeDetalle,
  setViajeEditando,
  setViajeForm,
  tempColor,
  vehiculos,
  vehiculosOffline,
  vehiculosOnline,
  velocidadKmh,
  viajes,
  viajesActivos,
}) {
  return (<div className="dashboard-shell" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 3rem)', margin: '-1.5rem -2rem', overflow: 'hidden' }}>
            <div className="dashboard-header" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '0.75rem 1.5rem', background: '#111111', borderBottom: '1px solid #1a3d1a', flexShrink: 0 }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e0e0e0', marginRight: '0.5rem' }}>GERS</span>
              <span style={{ fontSize: '12px', color: '#6a9b6a' }}>
                {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })} · {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <div style={{ flex: 1 }} />
              <button onClick={() => { setPlacingZone(false); setActiveTab('geocercas'); }} style={{ padding: '6px 14px', background: 'transparent', color: '#f87171', border: '1px solid #f87171', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                ⚠️ Zonas
              </button>
              <button onClick={loadAll} style={{ padding: '6px 14px', background: '#00ff41', color: '#0d0d0d', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Actualizar</button>
              <button onClick={() => { setTurnoSummary(null); setShowTurnoModal(true); }} style={{ padding: '6px 14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Entregar turno</button>
            </div>

            <div className="dashboard-kpis" style={{ display: 'flex', alignItems: 'stretch', gap: '12px', padding: '10px 1.5rem', background: '#151515', borderBottom: '1px solid #1a3d1a', flexShrink: 0, overflowX: 'auto' }}>
              {(() => {
                const p = kpis?.puntualidad;
                const u = kpis?.usoFlota;
                const c = kpis?.citasHoy;
                const pColor = !p || p.entregas === 0 ? '#6a9b6a' : p.porcentaje >= 85 ? '#4ade80' : p.porcentaje >= 60 ? '#facc15' : '#f87171';
                const uColor = u && u.porcentaje >= 60 ? '#4ade80' : u && u.porcentaje >= 30 ? '#facc15' : '#f87171';
                const citasFuturas = citasOperativas
                  .map(item => ({ item, date: parseCitaDate(item.cita_descarga || item.cita_carga) }))
                  .filter(x => x.date && x.date.getTime() >= Date.now())
                  .sort((a, b) => a.date.getTime() - b.date.getTime());
                const proximaInfo = citasFuturas[0] || null;
                const proxima = proximaInfo ? proximaInfo.date.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin citas';
                const proximaRef = proximaInfo?.item || null;
                const abrirProximaCita = () => {
                  if (!proximaRef) return;
                  if (proximaRef.tipo === 'Viaje') {
                    const viaje = viajes.find(v => Number(v.id) === Number(proximaRef.sourceId));
                    if (viaje) { setViajeDetalle(viaje); setViajeForm(viaje); setShowViajeModal(true); setViajeEditando(false); return; }
                  }
                  setActiveTab('citas');
                  setCitaSeleccionada(proximaRef);
                };
                const kpiCard = (titulo, valor, sub, color = '#e0e0e0', onClick = null) => (
                  <div onClick={onClick} title={onClick ? 'Ver detalle' : undefined} style={{ flex: '0 0 auto', minWidth: '150px', background: '#1a1a1a', borderRadius: '10px', border: '1px solid #1a3d1a', padding: '10px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', cursor: onClick ? 'pointer' : 'default' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: '10px', color: '#6a9b6a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{titulo}</span>
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color, lineHeight: 1.1 }}>{valor}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{sub}</div>
                  </div>
                );
                return (
                  <>
                    {kpiCard('Puntualidad', p && p.entregas > 0 ? `${p.porcentaje}%` : '—', p && p.entregas > 0 ? `${p.aTiempo} de ${p.entregas} entregas a tiempo` : 'Sin entregas en 60 días', pColor)}
                    {kpiCard('Uso de flota', u ? `${u.porcentaje}%` : '—', u ? `${u.viajesActivos} de ${u.totalUnidades} unidades en viaje` : '', uColor)}
                    {kpiCard('Citas hoy', c ? c.total : '—', c ? `${c.viajes} viajes · ${c.seguimiento} seguimientos` : '', '#60a5fa')}
                    {kpiCard('Próxima cita', proxima, proximaInfo ? (proximaRef.tipo === 'Viaje' ? 'Abrir viaje' : 'Ver en citas') : 'Sin citas agendadas', '#8b5cf6', proximaRef ? abrirProximaCita : null)}
                  </>
                );
              })()}
            </div>

            <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
              {(() => {
                const enMovimiento = vehiculosOnline.filter(v => estaEnMovimiento(v.location?.speed)).length;
                const detenidas = vehiculosOnline.length - enMovimiento;
                const dieselBajo = vehiculos.filter(v => v.fuelLevelPercent !== null && v.fuelLevelPercent < 0.25).length;
                const onlinePct = vehiculos.length ? Math.round((vehiculosOnline.length / vehiculos.length) * 100) : 0;
                const viajesEnCurso = viajesActivos.filter(v => !['completado', 'cancelado'].includes(String(v.estado || '').toLowerCase()));
                const viajesPorEstado = viajesEnCurso.reduce((acc, v) => {
                  const key = String(v.estado || 'programado').toLowerCase();
                  acc[key] = (acc[key] || 0) + 1;
                  return acc;
                }, {});
                const etiquetaEstado = (value) => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                const tipoAlerta = { geocerca: 'Geocerca', combustible_bajo: 'Combustible', velocidad: 'Velocidad' };
                const alertasPorTipo = alertasNoLeidas.reduce((acc, a) => {
                  const key = String(a.tipo || 'otra');
                  acc[key] = (acc[key] || 0) + 1;
                  return acc;
                }, {});
                const rem = kpis?.remolques;
                const semanas = kpis?.viajesPorSemana || [];
                const semanaActual = semanas.length ? semanas[semanas.length - 1] : null;
                const hoyKey = new Date().toDateString();
                const citasDeHoy = citasOperativas.filter(item => {
                  const carga = parseCitaDate(item.cita_carga);
                  const descarga = parseCitaDate(item.cita_descarga);
                  return (carga && carga.toDateString() === hoyKey) || (descarga && descarga.toDateString() === hoyKey);
                });
                const citasProximas = citasDeHoy.slice(0, 5);
                const zc = customRiskZones.reduce((acc, z) => { acc[z.severity] = (acc[z.severity] || 0) + 1; return acc; }, {});
                const conCombustible = vehiculos.filter(v => v.fuelLevelPercent !== null);
                const avgFuel = conCombustible.length ? Math.round(conCombustible.reduce((s, v) => s + v.fuelLevelPercent, 0) / conCombustible.length) : 0;
                const dieselCritico = vehiculos.filter(v => v.fuelLevelPercent !== null && v.fuelLevelPercent < 0.10).length;
                const operadoresAsignados = Object.values(operadores).filter(o => o && o.nombre).length;
                const unidadesSinOperador = vehiculos.filter(v => !(operadores[String(v.id)]?.nombre)).length;
                const velocidadMaxima = vehiculos.reduce((m, v) => Math.max(m, velocidadKmh(v.location?.speed)), 0);
                const excesoVelocidad = vehiculos.filter(v => velocidadKmh(v.location?.speed) > 120);
                const seguimientoActivo = seguimiento.filter(s => !['completado', 'cancelado'].includes(String(s.estatus || '').toLowerCase()));
                const seguimientoPorEstatus = seguimientoActivo.reduce((acc, s) => { const key = String(s.estatus || 'Disponible'); acc[key] = (acc[key] || 0) + 1; return acc; }, {});
                const thermosConTemp = remolques.filter(r => r.temperatura && r.temperatura.returnC != null);

                const panel = (titulo, accent, children) => (
                  <div style={{ background: '#161616', border: '1px solid #1a3d1a', borderLeft: `3px solid ${accent}`, borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '14px' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0 }} />
                      <span style={{ fontSize: '10px', color: '#6a9b6a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{titulo}</span>
                    </div>
                    {children}
                  </div>
                );

                const bigNum = (valor, color = '#e0e0e0', sub = '') => (
                  <div>
                    <div style={{ fontSize: '32px', fontWeight: 800, color, lineHeight: 1 }}>{valor}</div>
                    {sub && <div style={{ fontSize: '11px', color: '#6a9b6a', marginTop: '4px' }}>{sub}</div>}
                  </div>
                );

                const fila = (label, value, color = '#e0e0e0') => (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', gap: '8px', padding: '2px 0' }}>
                    <span style={{ color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                    <span style={{ fontWeight: 700, color, flexShrink: 0 }}>{value}</span>
                  </div>
                );

                const section = (titulo) => (
                  <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{titulo}</span>
                    <div style={{ flex: 1, height: 1, background: '#1a3d1a' }} />
                  </div>
                );

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '14px' }}>
                      {section('Flota y combustible')}
                      {panel('Flota', onlinePct >= 60 ? '#4ade80' : onlinePct >= 30 ? '#facc15' : '#f87171', (
                        <>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6a9b6a', marginBottom: '4px' }}><span>En línea</span><span>{vehiculosOnline.length} / {vehiculos.length}</span></div>
                            <div style={{ height: 6, background: '#0d1a0d', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${onlinePct}%`, background: onlinePct >= 60 ? '#4ade80' : onlinePct >= 30 ? '#facc15' : '#f87171', borderRadius: 3, transition: 'width 0.4s' }} />
                            </div>
                          </div>
                          {fila('En movimiento', enMovimiento, '#4ade80')}
                          {fila('Detenidas', detenidas, '#60a5fa')}
                          {fila('Sin señal', vehiculosOffline.length, vehiculosOffline.length > 0 ? '#facc15' : '#e0e0e0')}
                        </>
                      ))}

                      {panel('Combustible', avgFuel >= 50 ? '#4ade80' : avgFuel >= 25 ? '#facc15' : '#f87171', (
                        <>
                          {bigNum(`${avgFuel}%`, avgFuel >= 50 ? '#4ade80' : avgFuel >= 25 ? '#facc15' : '#f87171', 'Promedio de tanque')}
                          <div style={{ height: 6, background: '#0d1a0d', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${avgFuel}%`, background: avgFuel >= 50 ? '#4ade80' : avgFuel >= 25 ? '#facc15' : '#f87171', borderRadius: 3, transition: 'width 0.4s' }} />
                          </div>
                          {fila('Tanque > 50%', conCombustible.filter(v => v.fuelLevelPercent >= 0.5).length, '#4ade80')}
                          {fila('Diesel bajo (< 25%)', dieselBajo, dieselBajo > 0 ? '#f59e0b' : '#e0e0e0')}
                          {fila('Crítico (< 10%)', dieselCritico, dieselCritico > 0 ? '#f87171' : '#e0e0e0')}
                        </>
                      ))}

                      {section('Operación en curso')}
                      {panel('Viajes activos', viajesEnCurso.length > 0 ? '#4ade80' : '#4a8a4a', (
                        <>
                          {bigNum(viajesEnCurso.length, viajesEnCurso.length > 0 ? '#4ade80' : '#6a9b6a', 'Viajes en curso')}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                            {Object.entries(viajesPorEstado).map(([estado, count]) => (
                              <div key={estado} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                <span style={{ color: '#9ca3af' }}>{etiquetaEstado(estado)}</span>
                                <span style={{ fontWeight: 700, color: estadoColors[estado] || '#e0e0e0' }}>{count}</span>
                              </div>
                            ))}
                            {viajesEnCurso.length === 0 && <span style={{ fontSize: '12px', color: '#6a9b6a' }}>Sin viajes en curso</span>}
                          </div>
                        </>
                      ))}

                      {panel('Citas operativas', citasDeHoy.length > 0 ? '#60a5fa' : '#4a8a4a', (
                        <>
                          {bigNum(citasDeHoy.length, citasDeHoy.length > 0 ? '#60a5fa' : '#6a9b6a', 'Citas de hoy')}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                            {citasProximas.map((c, i) => {
                              const d = parseCitaDate(c.cita_descarga || c.cita_carga);
                              return (
                                <div key={i} style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.unidad} → {c.destino}</span>
                                  <span style={{ color: '#e0e0e0', flexShrink: 0 }}>{d ? d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                </div>
                              );
                            })}
                            {citasDeHoy.length === 0 && <span style={{ fontSize: '12px', color: '#6a9b6a' }}>Sin citas para hoy</span>}
                          </div>
                        </>
                      ))}

                      {panel('Seguimiento', seguimientoActivo.length > 0 ? '#8b5cf6' : '#4a8a4a', (
                        <>
                          {bigNum(seguimientoActivo.length, seguimientoActivo.length > 0 ? '#4ade80' : '#6a9b6a', 'Filas activas')}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                            {Object.entries(seguimientoPorEstatus).map(([estado, count]) => (
                              <div key={estado} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                <span style={{ color: '#9ca3af' }}>{estado}</span>
                                <span style={{ fontWeight: 700, color: '#e0e0e0' }}>{count}</span>
                              </div>
                            ))}
                            {seguimientoActivo.length === 0 && <span style={{ fontSize: '12px', color: '#6a9b6a' }}>Sin filas activas</span>}
                          </div>
                        </>
                      ))}

                      {panel('Remolques', '#3b82f6', (
                        <>
                          {bigNum(rem ? `${rem.disponibles}/${rem.total}` : remolques.length, '#3b82f6', 'Disponibles / total')}
                          {fila('Refrigerados', rem ? rem.refrigerados : '—', '#3b82f6')}
                          {fila('Con GPS', rem ? rem.conGps : '—', '#3b82f6')}
                        </>
                      ))}

                      {panel('Temperatura', thermosConTemp.length > 0 ? '#60a5fa' : '#4a8a4a', (
                        <>
                          {bigNum(thermosConTemp.length, thermosConTemp.length > 0 ? '#60a5fa' : '#6a9b6a', 'Thermos con sensor')}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                            {thermosConTemp.slice(0, 8).map(r => (
                              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', gap: '8px' }}>
                                <span style={{ color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{numeroRemolque(r.numero)}</span>
                                <span style={{ fontWeight: 700, color: tempColor(r.temperatura) }}>{r.temperatura.returnC}°C · {r.temperatura.state}</span>
                              </div>
                            ))}
                            {thermosConTemp.length === 0 && <span style={{ fontSize: '12px', color: '#6a9b6a' }}>Sin datos del sensor Samsara</span>}
                          </div>
                        </>
                      ))}

                      {section('Seguridad y alertas')}
                      {panel('Alertas sin leer', alertasNoLeidas.length > 0 ? '#f87171' : '#4ade80', (
                        <>
                          {bigNum(alertasNoLeidas.length, alertasNoLeidas.length > 0 ? '#f87171' : '#4ade80', alertasNoLeidas.length > 0 ? 'Requieren revisión' : 'Todo en orden')}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                            {Object.entries(alertasPorTipo).map(([tipo, count]) => (
                              <div key={tipo} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                <span style={{ color: '#9ca3af' }}>{tipoAlerta[tipo] || 'Otra'}</span>
                                <span style={{ fontWeight: 700, color: '#f87171' }}>{count}</span>
                              </div>
                            ))}
                            {alertasNoLeidas.length === 0 && <span style={{ fontSize: '12px', color: '#6a9b6a' }}>Sin alertas pendientes</span>}
                          </div>
                        </>
                      ))}

                      {panel('Velocidad', excesoVelocidad.length > 0 ? '#f87171' : '#4ade80', (
                        <>
                          {bigNum(`${velocidadMaxima} km/h`, velocidadMaxima > 120 ? '#f87171' : '#4ade80', 'Velocidad máxima actual')}
                          {fila('Excediendo 120 km/h', excesoVelocidad.length, excesoVelocidad.length > 0 ? '#f87171' : '#4ade80')}
                          {excesoVelocidad.length > 0 && (
                            <div style={{ fontSize: '11px', color: '#f87171', maxHeight: '60px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {excesoVelocidad.slice(0, 5).map(v => (
                                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{v.name}</span>
                                  <span style={{ fontWeight: 700 }}>{velocidadKmh(v.location?.speed)} km/h</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ))}

                      {panel('Zonas de peligro', zc.critical ? '#f87171' : '#fb923c', (
                        <>
                          {bigNum(customRiskZones.length, zc.critical ? '#f87171' : '#fb923c', 'Zonas de riesgo')}
                          {fila('Propias agregadas', customRiskZones.length, '#f87171')}
                          {fila('Predefinidas (México)', defaultZonesList.length, '#fb923c')}
                          <button onClick={() => { setActiveTab('geocercas'); }} style={{ marginTop: 'auto', padding: '8px', background: '#7f1d1d', color: '#fca5a5', border: '1px dashed #f87171', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                            Gestionar en Geocercas →
                          </button>
                        </>
                      ))}

                      {panel('Pendientes', pendientes.length > 0 ? '#f59e0b' : '#4ade80', (
                        <>
                          {bigNum(pendientes.length, pendientes.length > 0 ? '#f59e0b' : '#4ade80', pendientes.length > 0 ? 'Tareas por resolver' : 'Todo al día')}
                        </>
                      ))}

                      {section('Personal y clientes')}
                      {panel('Operadores', '#8b5cf6', (
                        <>
                          {bigNum(operadoresAsignados, '#8b5cf6', 'Operadores asignados')}
                          {fila('Conductores Samsara', samsaraDrivers.length, '#3b82f6')}
                          {fila('Unidades sin operador', unidadesSinOperador, unidadesSinOperador > 0 ? '#f59e0b' : '#4ade80')}
                        </>
                      ))}

                      {panel('Clientes', '#60a5fa', (
                        <>
                          {bigNum(clientes.length, '#60a5fa', 'Clientes registrados')}
                          {fila('Geocercas vinculadas', geofenceLinks.length, '#8b5cf6')}
                          {fila('Total de geocercas', allGeofences.length, '#3b82f6')}
                        </>
                      ))}

                      {semanaActual && (
                        <div style={{ gridColumn: '1 / -1', background: '#161616', border: '1px solid #1a3d1a', borderRadius: '10px', padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1d4ed8', flexShrink: 0 }} />
                            <span style={{ fontSize: '10px', color: '#6a9b6a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Viajes por semana · semana actual</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '70px' }}>
                            <div title={`${semanaActual.inicio} — ${semanaActual.fin}: ${semanaActual.total} viajes`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', height: '100%' }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#e0e0e0' }}>{semanaActual.total}</div>
                              <div style={{ width: '100%', maxWidth: '34px', background: '#00ff41', borderRadius: '4px 4px 0 0', height: '100%', opacity: 0.9, transition: 'height 0.4s' }} />
                              <div style={{ fontSize: '9px', color: '#6a9b6a' }}>Lun {semanaActual.inicio} — {semanaActual.fin}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {alertasNoLeidas.length > 0 && (
                        <div style={{ gridColumn: '1 / -1', background: '#161616', border: '1px solid #1a3d1a', borderRadius: '10px', padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', flexShrink: 0 }} />
                            <span style={{ fontSize: '10px', color: '#6a9b6a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Últimas alertas</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '8px' }}>
                            {alertasNoLeidas.slice(0, 6).map(a => {
                              const borderColor = a.tipo === 'geocerca' ? '#8b5cf6' : a.tipo === 'combustible_bajo' ? '#f59e0b' : '#3b82f6';
                              return (
                                <div key={a.id} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px', borderLeft: `3px solid ${borderColor}` }}>
                                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#e0e0e0' }}>{a.vehicle_name || a.vehicle_id}</div>
                                  <div style={{ fontSize: '11px', color: '#6a9b6a', marginTop: 2 }}>{a.mensaje}</div>
                                  <div style={{ fontSize: '10px', color: '#4a8a4a', marginTop: 2 }}>{parseFecha(a.timestamp)?.toLocaleTimeString()}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                );
              })()}
            </div>
          </div>);
}

export function UnidadesSection({
  apiJson,
  apiUrl,
  busquedaUnidades,
  filtroUnidades,
  hiddenUnits,
  loadAll,
  operadores,
  refreshUnidadesLocales,
  s,
  setBusquedaUnidades,
  setEditUnidad,
  setFiltroUnidades,
  setFormUnidad,
  setHiddenUnits,
  setSelectedVehicle,
  setShowUnidadModal,
  todasLasUnidades,
  unidadKey,
  unidadesLocales,
  vehiculos,
  vehiculosOffline,
  vehiculosOnline,
  velocidadKmh,
}) {
  return ((() => {
          const unidadesFiltradas = todasLasUnidades.filter(v => {
            const key = unidadKey(v);
            if (hiddenUnits.includes(key)) return false;
            const coincideBusqueda = !busquedaUnidades ||
              v.name.toLowerCase().includes(busquedaUnidades.toLowerCase()) ||
              (operadores[String(v.id)]?.nombre || '').toLowerCase().includes(busquedaUnidades.toLowerCase()) ||
              String(v.id).includes(busquedaUnidades);
            const coincideFiltro = filtroUnidades === 'todas' ||
              (filtroUnidades === 'online' && v.isOnline) ||
              (filtroUnidades === 'offline' && !v.isOnline && !v.isLocal) ||
              (filtroUnidades === 'movimiento' && estaEnMovimiento(v.location?.speed)) ||
              (filtroUnidades === 'detenida' && v.isOnline && !estaEnMovimiento(v.location?.speed)) ||
              (filtroUnidades === 'bajo_diesel' && v.fuelLevelPercent !== null && v.fuelLevelPercent < 0.25) ||
              (filtroUnidades === 'manual' && v.isLocal);
            return coincideBusqueda && coincideFiltro;
          });
          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#e0e0e0' }}>Unidades</h2>
                  <p style={{ margin: '0.25rem 0 0', color: '#6a9b6a', fontSize: '0.9rem' }}>
                    {todasLasUnidades.length} unidades · {vehiculos.length} Samsara · {unidadesLocales.length} locales · {vehiculosOnline.length} en línea
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => { setEditUnidad(null); setFormUnidad({ nombre: '', estatus: 'Activa', notas: '', tipo: 'manual', samsara_id: '' }); setShowUnidadModal(true); }}
                    style={{ ...s.button('#00ff41'), background: '#00ff4120', border: '1px solid #00ff41', color: '#00ff41', padding: '0.5rem 1rem' }}>
                    + Agregar Unidad
                  </button>
                  {hiddenUnits.length > 0 && <button onClick={() => setHiddenUnits([])} style={s.button('#3b82f6')}>Mostrar ocultas ({hiddenUnits.length})</button>}
                  <button onClick={loadAll} style={s.button()}>Actualizar</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Total', value: todasLasUnidades.length, icon: '🚛', color: '#3b82f6', filter: 'todas' },
                  { label: 'Samsara', value: vehiculos.length, icon: '☁️', color: '#8b5cf6', filter: 'samsara' },
                  { label: 'Locales', value: unidadesLocales.length, icon: '📌', color: '#00ff41', filter: 'manual' },
                  { label: 'En Línea', value: vehiculosOnline.length, icon: '🟢', color: '#10b981', filter: 'online' },
                  { label: 'Sin Señal', value: vehiculosOffline.length, icon: '🔴', color: '#ef4444', filter: 'offline' },
                  { label: 'Diesel Bajo', value: vehiculos.filter(v => v.fuelLevelPercent !== null && v.fuelLevelPercent < 0.25).length, icon: '⛽', color: '#f59e0b', filter: 'bajo_diesel' },
                ].map((card) => (
                  <div key={card.label} role="button" tabIndex={0} aria-pressed={filtroUnidades === card.filter} onKeyDown={(e) => activarConTeclado(e, () => setFiltroUnidades(card.filter))} onClick={() => setFiltroUnidades(card.filter)}
                    style={{ ...s.statCard(card.color), cursor: 'pointer', opacity: filtroUnidades === card.filter ? 1 : 0.7, transition: 'opacity 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = filtroUnidades === card.filter ? '1' : '0.7'}>
                    <span style={{ fontSize: '1.5rem' }}>{card.icon}</span>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{card.value}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>{card.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ ...s.card, marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    placeholder="Buscar por nombre, operador o ID..."
                    value={busquedaUnidades}
                    onChange={e => setBusquedaUnidades(e.target.value)}
                    style={{ ...s.input, maxWidth: '400px' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[
                      { key: 'todas', label: 'Todas' },
                      { key: 'online', label: 'En Línea' },
                      { key: 'offline', label: 'Sin Señal' },
                      { key: 'movimiento', label: 'Movimiento' },
                      { key: 'detenida', label: 'Detenida' },
                      { key: 'bajo_diesel', label: 'Diesel Bajo' },
                      { key: 'manual', label: 'Locales' },
                    ].map(f => (
                      <button key={f.key} onClick={() => setFiltroUnidades(f.key)}
                        style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: `1px solid ${filtroUnidades === f.key ? '#00ff41' : '#1a3d1a'}`, background: filtroUnidades === f.key ? '#00ff4115' : 'transparent', color: filtroUnidades === f.key ? '#00ff41' : '#6a9b6a', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s' }}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#4a8a4a' }}>
                    {unidadesFiltradas.length} resultados
                  </span>
                </div>
              </div>

              {hiddenUnits.length > 0 && (
                <div style={{ ...s.card, marginBottom: '1.5rem', padding: '1rem 1.5rem', borderColor: '#3b82f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <strong style={{ color: '#3b82f6' }}>Unidades ocultas ({hiddenUnits.length})</strong>
                    <button onClick={() => setHiddenUnits([])} style={s.button('#3b82f6')}>Mostrar todas</button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {todasLasUnidades.filter(v => hiddenUnits.includes(unidadKey(v))).map(v => (
                      <button
                        key={unidadKey(v)}
                        onClick={() => setHiddenUnits(prev => prev.filter(k => k !== unidadKey(v)))}
                        style={{ padding: '0.35rem 0.65rem', borderRadius: '999px', border: '1px solid #3b82f6', background: '#1a1a1a', color: '#c0c0c0', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        {v.name} ✕
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={s.card}>
                {todasLasUnidades.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#4a8a4a' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🚛</div>
                    <p style={{ fontSize: '1rem' }}>No hay unidades disponibles</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Agrega una unidad o verifica la conexión con Samsara</p>
                  </div>
                ) : (
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>Unidad</th>
                        <th style={s.th}>Operador</th>
                        <th style={s.th}>Estado</th>
                        <th style={s.th}>Ubicación</th>
                        <th style={s.th}>Velocidad</th>
                        <th style={s.th}>Diesel</th>
                        <th style={s.th}>Última Señal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unidadesFiltradas.length === 0 ? (
                        <tr><td colSpan="7" style={{ ...s.td, textAlign: 'center', color: '#4a8a4a', padding: '2rem' }}>
                          No se encontraron unidades con los filtros aplicados
                        </td></tr>
                      ) : unidadesFiltradas.map((v) => (
                        <tr key={v.id} role={v.isLocal ? undefined : 'button'} tabIndex={v.isLocal ? undefined : 0} onKeyDown={v.isLocal ? undefined : (e) => activarConTeclado(e, () => setSelectedVehicle(v))} onClick={() => !v.isLocal && setSelectedVehicle(v)} style={{ cursor: v.isLocal ? 'default' : 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#152015'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ ...s.td, fontWeight: '600', color: v.isLocal ? '#f59e0b' : '#00ff41' }}>
                            <div>{v.isLocal ? '📌' : '🚛'} {v.name}</div>
                            <div style={{ fontSize: '0.7rem', color: '#4a8a4a', fontWeight: '400' }}>{v.isLocal ? `Local #${v.localId}` : `Samsara ID: ${v.id}`}</div>
                          </td>
                          <td style={s.td}>{v.isLocal ? <span style={{ color: '#6a9b6a' }}>{v.estatus || '-'}</span> : (operadores[String(v.id)]?.nombre || <span style={{ color: '#4a8a4a' }}>Sin asignar</span>)}</td>
                          <td style={s.td}>
                            {v.isLocal ? (
                              <span style={s.badge(v.estatus === 'Activa' ? '#10b981' : v.estatus === 'Siniestrada' ? '#ef4444' : v.estatus === 'No disponible' ? '#6b7280' : '#f59e0b')}>
                                {v.estatus || 'Sin estatus'}
                              </span>
                            ) : (
                              <span style={s.badge(v.isOnline ? (estaEnMovimiento(v.location?.speed) ? '#10b981' : '#3b82f6') : '#ef4444')}>
                                {v.isOnline ? (estaEnMovimiento(v.location?.speed) ? 'Movimiento' : 'Detenida') : 'Sin señal'}
                              </span>
                            )}
                          </td>
                          <td style={{ ...s.td, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                            {v.isLocal ? (v.notas || <span style={{ color: '#4a8a4a' }}>Sin notas</span>) : (v.location?.location || <span style={{ color: '#4a8a4a' }}>Sin ubicación</span>)}
                          </td>
                          <td style={s.td}>
                            {v.isLocal ? <span style={{ color: '#6a9b6a' }}>-</span> : (v.location ? <span>{velocidadKmh(v.location.speed)} km/h</span> : <span style={{ color: '#4a8a4a' }}>-</span>)}
                          </td>
                          <td style={s.td}>
                            {v.isLocal ? <span style={{ color: '#6a9b6a' }}>-</span> : (v.fuelLevelPercent !== null ? (
                              <span style={{ color: v.fuelLevelPercent > 0.25 ? '#10b981' : v.fuelLevelPercent > 0.10 ? '#f59e0b' : '#ef4444', fontWeight: '600' }}>
                                {Math.round(v.fuelLevelPercent * 100)}%
                              </span>
                            ) : <span style={{ color: '#4a8a4a' }}>N/D</span>)}
                          </td>
                          <td style={{ ...s.td, fontSize: '0.8rem', color: '#6a9b6a' }}>
                            {v.isLocal ? (
                              <div style={{ display: 'flex', gap: '0.3rem' }}>
                                <button onClick={(e) => { e.stopPropagation(); setEditUnidad(v); setFormUnidad({ nombre: v.nombre, estatus: v.estatus, notas: v.notas, tipo: v.tipo, samsara_id: v.samsara_id || '' }); setShowUnidadModal(true); }}
                                  style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid #3b82f6', background: '#3b82f620', color: '#3b82f6', cursor: 'pointer', fontSize: '0.7rem' }}>Editar</button>
                                <button onClick={async (e) => { e.stopPropagation(); if (confirm('Eliminar esta unidad?')) { try { await apiJson(`${apiUrl}/unidades/${v.localId}`, { method: 'DELETE' }); await refreshUnidadesLocales(); } catch (err) { alert(err.message || 'No se pudo eliminar la unidad'); } } }}
                                  style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid #ef4444', background: '#ef444420', color: '#ef4444', cursor: 'pointer', fontSize: '0.7rem' }}>X</button>
                              </div>
                            ) : (v.lastSeen !== null && v.lastSeen !== undefined ? `hace ${v.lastSeen}min` : '-')}
                            <div style={{ marginTop: '0.35rem' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); setHiddenUnits(prev => prev.includes(unidadKey(v)) ? prev : [...prev, unidadKey(v)]); }}
                                style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid #6b7280', background: '#1a1a1a', color: '#c0c0c0', cursor: 'pointer', fontSize: '0.7rem' }}
                              >
                                Ocultar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          );
        })());
}

export function MonitoreoSection({
  allGeofences,
  geofenceAtLocation,
  loadAll,
  monitoreoEta,
  monitoreoEtaDestinoRef,
  monitoreoEtaLoading,
  monitoreoGeofenceMatch,
  monitoreoRequestRef,
  monitoreoRouteHistory,
  monitoreoRutaTotal,
  monitoreoSelectedId,
  monitoreoStops,
  operadores,
  s,
  selectMonitoreoVehicle,
  setMonitoreoEta,
  setMonitoreoEtaLoading,
  setMonitoreoGeofenceMatch,
  setMonitoreoRouteHistory,
  setMonitoreoRutaTotal,
  setMonitoreoSelectedId,
  setMonitoreoStops,
  vehiculos,
  vehiculosOnline,
  velocidadKmh,
  viajesActivos,
}) {
  return ((() => {
          const selVehicle = monitoreoSelectedId ? vehiculos.find(v => String(v.id) === String(monitoreoSelectedId)) : null;
          const selViaje = monitoreoSelectedId ? viajesActivos.find(vj => String(vj.vehicle_id) === String(monitoreoSelectedId) || vj.vehicle_name === selVehicle?.name) : null;
          const selParadas = selViaje ? paradasViaje(selViaje) : [];
          const selParadaActual = selViaje ? (paradaActualViaje(selViaje) || null) : null;
          const selSeg = selViaje ? { destino: destinoViajeActual(selViaje), tipo_entrega: selViaje.tipo_entrega, destinos: destinosViaje(selViaje), remolque: selViaje.seg_remolque || '', origen: selViaje.origen || selViaje.seg_origen || '', estatus: selViaje.estado || selViaje.seg_estatus || '' } : {};
          const currentGeofence = geofenceAtLocation(selVehicle?.location);
          const currentLocationLabel = currentGeofence?.nombre || selVehicle?.location?.location || 'Sin ubicación';
          const routeLen = monitoreoStops.length;
          let avancePct = 0;
          let avanceLabel = 'Sin datos';
          let avanceEsperadoPct = null;
          let avanceEsperadoLabel = '';
          let estadoAvance = null;
          if (monitoreoEta?.distanciaMetros && monitoreoRutaTotal?.distanciaMetros) {
            const totalM = monitoreoRutaTotal.distanciaMetros;
            const distanciaRecorridaM = Math.max(0, totalM - monitoreoEta.distanciaMetros);
            avancePct = Math.min(100, Math.round((distanciaRecorridaM / totalM) * 100));
            const recorridosKm = (distanciaRecorridaM / 1000).toFixed(1);
            const totalKm = (totalM / 1000).toFixed(1);
            avanceLabel = `${avancePct}% · ${recorridosKm} / ${totalKm} km`;

            const parseTripDate = (value) => {
              if (!value) return null;
              const normalized = String(value).includes('T') ? String(value) : String(value).replace(' ', 'T');
              const date = new Date(normalized);
              return Number.isNaN(date.getTime()) ? null : date;
            };
            const scheduledStart = parseTripDate(selViaje?.fecha_inicio || selViaje?.cita_carga);
            let scheduledEnd = parseTripDate(selViaje?.fecha_fin || selViaje?.cita_descarga);
            if (scheduledStart && (!scheduledEnd || scheduledEnd <= scheduledStart) && monitoreoRutaTotal.duracionSegundos) {
              scheduledEnd = new Date(scheduledStart.getTime() + monitoreoRutaTotal.duracionSegundos * 1000);
            }
            if (scheduledStart && scheduledEnd && scheduledEnd > scheduledStart) {
              const scheduleDurationMs = scheduledEnd.getTime() - scheduledStart.getTime();
              avanceEsperadoPct = Math.max(0, Math.min(100, Math.round(((Date.now() - scheduledStart.getTime()) / scheduleDurationMs) * 100)));
              const expectedKm = totalM * avanceEsperadoPct / 100 / 1000;
              avanceEsperadoLabel = `Esperado: ${avanceEsperadoPct}% · ${expectedKm.toFixed(1)} km`;
              const differencePct = avancePct - avanceEsperadoPct;
              const differenceMinutes = Math.round(Math.abs(differencePct) / 100 * scheduleDurationMs / 60000);
              const differenceHours = (differenceMinutes / 60).toFixed(1);
              const differenceKm = Math.abs(differencePct) / 100 * totalM / 1000;
              if (Date.now() < scheduledStart.getTime()) {
                estadoAvance = { label: 'Aún no inicia', color: '#94a3b8' };
              } else if (differenceMinutes <= 10) {
                estadoAvance = { label: 'En tiempo', color: '#10b981' };
              } else if (differencePct < 0) {
                estadoAvance = { label: `Retraso estimado: ${differenceHours} h · ${differenceKm.toFixed(1)} km`, color: '#ef4444' };
              } else {
                estadoAvance = { label: `Adelanto estimado: ${differenceHours} h · ${differenceKm.toFixed(1)} km`, color: '#3b82f6' };
              }
            }
          } else if (monitoreoEtaLoading) {
            avanceLabel = 'Calculando ruta...';
          } else {
            avanceLabel = 'Ruta no disponible';
          }
          let etaText = '-';
          let horaLlegada = '-';
          if (monitoreoEta) {
            etaText = monitoreoEta.duracion;
            horaLlegada = monitoreoEta.horaLlegada;
          } else if (monitoreoEtaLoading) {
            etaText = 'Calculando...';
            horaLlegada = '...';
          } else if (selVehicle?.location && selSeg.destino) {
            const lastSeenMin = selVehicle.lastSeen != null ? selVehicle.lastSeen : 999;
            if (lastSeenMin < 15) {
              etaText = 'No disponible';
              horaLlegada = 'N/A';
            } else {
              etaText = 'Detenida';
              horaLlegada = 'N/A';
            }
          }
          const formatDate = (dt) => {
            if (!dt) return '-';
            try {
              const value = typeof dt === 'string' && !dt.endsWith('Z') && !dt.includes('+') ? `${dt}Z` : dt;
              const d = new Date(value);
              if (Number.isNaN(d.getTime())) return '-';
              return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
            } catch (e) { return dt; }
          };
          return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Monitoreo en Tiempo Real</h2>
                <p style={{ margin: '0.25rem 0 0', color: '#6a9b6a', fontSize: '0.9rem' }}>
                  {vehiculosOnline.length} en línea | {vehiculos.filter(v => !v.isOnline).length} sin señal | {viajesActivos.length} viajes activos
                  {monitoreoSelectedId && <span style={{ color: '#00ff41' }}> · {routeLen} paradas de más de 20 min</span>}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {monitoreoSelectedId && <button onClick={() => { monitoreoRequestRef.current.controller?.abort(); monitoreoRequestRef.current.generation += 1; setMonitoreoSelectedId(null); setMonitoreoRouteHistory([]); setMonitoreoStops([]); setMonitoreoEta(null); setMonitoreoRutaTotal(null); setMonitoreoEtaLoading(false); setMonitoreoGeofenceMatch(null); monitoreoEtaDestinoRef.current = ''; }} style={{ ...s.button('#ef4444'), background: '#ef444420', border: '1px solid #ef4444', color: '#ef4444' }}>Limpiar Ruta</button>}
                <button onClick={loadAll} style={s.button()}>Actualizar</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ ...s.card, padding: 0, overflow: 'hidden', height: monitoreoSelectedId ? 'min(68vh, 760px)' : 'calc(100vh - 180px)', transition: 'height 0.3s ease' }}>
                  <MapaUnidades vehiculos={vehiculos} geofences={allGeofences} routeHistory={monitoreoRouteHistory} routeStops={monitoreoStops} selectedVehicleId={monitoreoSelectedId} />
                </div>
                {monitoreoSelectedId && selVehicle && (
                  <div style={{ ...s.card, padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.3rem' }}>🚛</span>
                         <div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                             <h3 style={{ margin: 0, fontSize: '1rem', color: '#00ff41' }}>{selVehicle.name}</h3>
                             <span style={{ fontSize: '0.75rem', color: currentGeofence?.color || '#94a3b8', fontWeight: currentGeofence ? 700 : 500 }}>📍 {currentLocationLabel}</span>
                           </div>
                           <span style={{ fontSize: '0.75rem', color: '#6a9b6a' }}>{operadores[String(selVehicle.id)]?.nombre || 'Sin operador'}{selSeg.remolque ? ` · 🚛 ${selSeg.remolque}` : ''}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700, background: selVehicle.isOnline ? '#003311' : '#3a1111', color: selVehicle.isOnline ? '#00ff41' : '#ef4444', border: `1px solid ${selVehicle.isOnline ? '#00ff4133' : '#ef444433'}` }}>{selVehicle.isOnline ? 'Online' : 'Offline'}</span>
                        {selSeg.estatus && <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700, background: '#1a1a1a', color: '#f59e0b', border: '1px solid #f59e0b33' }}>{selSeg.estatus}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{ padding: '0.5rem', background: '#0d1a0d', borderRadius: '8px', border: '1px solid #1a3d1a' }}>
                        <div style={{ fontSize: '0.65rem', color: '#4a8a4a', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Origen Hoy</div>
                         <div style={{ fontSize: '0.8rem', color: '#e0e0e0', fontWeight: 600 }}>{selSeg.origen || '-'}</div>
                      </div>
                       <div style={{ padding: '0.5rem', background: '#0d1a0d', borderRadius: '8px', border: '1px solid #1a3d1a' }}>
                          <div style={{ fontSize: '0.65rem', color: '#4a8a4a', marginBottom: '0.2rem', textTransform: 'uppercase' }}>{selSeg.tipo_entrega === 'reparto' ? (selParadaActual?.orden ? `Parada ${selParadaActual.orden} de ${selParadas.length}` : 'Siguiente parada') : 'Destino'}</div>
                          <div style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: 600 }}>{selSeg.destino || '-'}</div>
                        {monitoreoGeofenceMatch && (
                          <div style={{ fontSize: '0.65rem', color: monitoreoGeofenceMatch.color || '#10b981', marginTop: '0.2rem', fontWeight: 600 }}>
                            📍 {monitoreoGeofenceMatch.nombre}
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '0.5rem', background: '#0d1a0d', borderRadius: '8px', border: '1px solid #1a3d1a' }}>
                         <div style={{ fontSize: '0.65rem', color: '#4a8a4a', marginBottom: '0.2rem', textTransform: 'uppercase' }}>{selSeg.tipo_entrega === 'reparto' ? (selParadaActual?.orden ? `ETA parada ${selParadaActual.orden} (+1h)` : 'ETA siguiente parada (+1h)') : 'ETA (+1h)'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#00ff41', fontWeight: 700 }}>{etaText}</div>
                        {monitoreoEta ? (
                          <div style={{ fontSize: '0.65rem', color: '#f59e0b', marginTop: '0.15rem' }}>Llegada: {horaLlegada} · {monitoreoEta.distancia}</div>
                        ) : (
                          <div style={{ fontSize: '0.65rem', color: '#f59e0b', marginTop: '0.15rem' }}>Llegada: {horaLlegada}</div>
                        )}
                      </div>
                      <div style={{ padding: '0.5rem', background: '#0d1a0d', borderRadius: '8px', border: '1px solid #1a3d1a' }}>
                        <div style={{ fontSize: '0.65rem', color: '#4a8a4a', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Ubicación Actual</div>
                        <div style={{ fontSize: '0.8rem', color: '#e0e0e0', fontWeight: 600 }}>{selVehicle.location?.location || 'Sin ubicación'}</div>
                        {selVehicle.location && <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.15rem' }}>{velocidadKmh(selVehicle.location.speed)} km/h · {formatDate(selVehicle.location.timeMs)}</div>}
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Avance en Ruta</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {estadoAvance && <span style={{ fontSize: '0.7rem', color: estadoAvance.color, border: `1px solid ${estadoAvance.color}66`, borderRadius: '10px', padding: '2px 8px', fontWeight: 700 }}>{estadoAvance.label}</span>}
                          <span style={{ fontSize: '0.75rem', color: '#00ff41', fontWeight: 600 }}>{avanceLabel}</span>
                        </div>
                      </div>
                      <div style={{ position: 'relative', width: '100%', height: '12px', background: '#1a1a1a', borderRadius: '6px', border: '1px solid #1a3d1a' }}>
                        <div style={{ width: `${avancePct}%`, height: '100%', background: avancePct >= 80 ? 'linear-gradient(90deg, #10b981, #00ff41)' : avancePct >= 40 ? 'linear-gradient(90deg, #f59e0b, #10b981)' : 'linear-gradient(90deg, #3b82f6, #10b981)', borderRadius: '6px', transition: 'width 0.5s ease', boxShadow: `0 0 10px ${avancePct >= 80 ? '#00ff4144' : '#3b82f644'}` }} />
                        {avanceEsperadoPct !== null && (
                          <div title={avanceEsperadoLabel} style={{ position: 'absolute', left: `${avanceEsperadoPct}%`, top: '-5px', width: '3px', height: '20px', background: '#facc15', borderRadius: '2px', transform: 'translateX(-1px)', boxShadow: '0 0 7px #facc15' }} />
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.65rem', color: '#4a8a4a' }}>
                        <span>📍 {selSeg.origen || 'Sin origen'}</span>
                        <span>{avanceEsperadoLabel || `${routeLen} paradas de más de 20 min`}</span>
                        <span>🏁 {selSeg.destino || 'Sin destino'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ ...s.card, overflow: 'auto', flex: 1, padding: '0.75rem' }}>
                  <h3 style={{ marginTop: 0, fontSize: '0.9rem', marginBottom: '0.75rem' }}>Todas las Unidades ({vehiculos.length})</h3>
                  {vehiculos.map((v) => (
                    <div key={v.id} role="button" tabIndex={0} onKeyDown={(e) => activarConTeclado(e, () => selectMonitoreoVehicle(v))} onClick={() => selectMonitoreoVehicle(v)} style={{ padding: '0.5rem', borderBottom: '1px solid #0d1f0d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.15s', borderRadius: '6px', paddingLeft: '6px', paddingRight: '6px', background: monitoreoSelectedId === v.id ? '#00ff4110' : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#152015'}
                      onMouseLeave={e => e.currentTarget.style.background = monitoreoSelectedId === v.id ? '#00ff4110' : 'transparent'}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.85rem', color: monitoreoSelectedId === v.id ? '#00ff41' : '#e0e0e0' }}>{v.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6a9b6a' }}>
                          {operadores[String(v.id)]?.nombre || 'Sin operador'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#4a8a4a' }}>
                          {v.location ? `${velocidadKmh(v.location.speed)} km/h` : 'Sin ubicación'}
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
          </div>
          );
        })());
}

export function AlertasSection({
  alertas,
  alertasArchivadas,
  alertasView,
  alertasVisibles,
  apiJson,
  apiUrl,
  archivarAlerta,
  archivarAlertas,
  filtroAlertas,
  loadAll,
  marcarAlertaLeida,
  parseFecha,
  refreshAlertas,
  refreshAlertasArchivadas,
  restaurarAlerta,
  s,
  setAlertasView,
  setFiltroAlertas,
}) {
  return (<div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0 }}>Alertas</h2>
                <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.6rem' }}>
                  <button type="button" onClick={() => setAlertasView('activas')} style={s.button(alertasView === 'activas' ? '#00ff41' : '#6b7280')}>Activas ({alertas.length})</button>
                  <button type="button" onClick={async () => { setAlertasView('archivadas'); await refreshAlertasArchivadas(); }} style={s.button(alertasView === 'archivadas' ? '#f59e0b' : '#6b7280')}>Historial ({alertasArchivadas.length})</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select style={s.select} value={filtroAlertas} onChange={e => setFiltroAlertas(e.target.value)}>
                  <option value="">Todas</option>
                  <option value="geocerca">Geocercas</option>
                  <option value="cliente_geocerca">Entradas a clientes</option>
                  <option value="combustible_bajo">Combustible Bajo</option>
                </select>
                <button onClick={async () => { try { await apiJson(`${apiUrl}/check-geofences`, { method: 'POST' }); await refreshAlertas(); } catch (err) { alert(err.message || 'No se pudo revisar geocercas'); } }} style={s.button('#8b5cf6')}>Revisar geocercas</button>
                <button onClick={async () => { try { await apiJson(`${apiUrl}/check-fuel`, { method: 'POST' }); await refreshAlertas(); } catch (err) { alert(err.message || 'No se pudo revisar combustible'); } }} style={s.button('#f59e0b')}>Revisar combustible</button>
                <button onClick={loadAll} style={s.button()}>Actualizar</button>
                {alertasView === 'activas' && <button onClick={archivarAlertas} disabled={alertas.length === 0} style={{ ...s.button('#f59e0b'), opacity: alertas.length === 0 ? 0.5 : 1 }}>Archivar activas</button>}
              </div>
            </div>
            {alertasVisibles.length === 0 ? (
              <div style={{ ...s.card, textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔔</div>
                <p style={{ color: '#6a9b6a' }}>No hay alertas {alertasView === 'archivadas' ? 'archivadas' : 'activas'}{filtroAlertas ? ' de este tipo' : ''}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {alertasVisibles.map((a) => (
                    <div key={a.id} style={{
                      ...s.card,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      borderLeft: `4px solid ${a.tipo === 'cliente_geocerca' ? '#00ff41' : a.severidad === 'critica' ? '#ef4444' : a.severidad === 'alta' ? '#f59e0b' : a.tipo === 'geocerca' ? '#8b5cf6' : '#3b82f6'}`,
                      opacity: a.leida ? 0.5 : 1, padding: '1rem 1.5rem'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={s.badge(a.tipo === 'cliente_geocerca' ? '#00ff41' : a.tipo === 'geocerca' ? '#8b5cf6' : a.tipo === 'combustible_bajo' ? '#f59e0b' : '#3b82f6')}>
                            {a.tipo === 'cliente_geocerca' ? 'Cliente · Entrada' : a.tipo === 'geocerca' ? '⭕ Geocerca' : a.tipo === 'combustible_bajo' ? '⛽ Combustible' : a.tipo}
                          </span>
                          <strong>{a.vehicle_name || a.vehicle_id}</strong>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#6a9b6a', marginTop: '0.25rem' }}>{a.mensaje}</div>
                        <div style={{ fontSize: '0.75rem', color: '#4a8a4a', marginTop: '0.25rem' }}>{parseFecha(a.timestamp)?.toLocaleString()}</div>
                        {a.archived_at && <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '0.2rem' }}>Archivada: {parseFecha(a.archived_at)?.toLocaleString()}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {alertasView === 'archivadas' ? (
                          <button onClick={() => restaurarAlerta(a.id)} style={s.button('#3b82f6')}>Restaurar</button>
                        ) : (
                          <>
                            {!a.leida && <button onClick={() => marcarAlertaLeida(a.id)} style={s.button('#10b981')}>Resuelta</button>}
                            <button onClick={() => archivarAlerta(a.id)} style={s.button('#f59e0b')}>Archivar</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>);
}

export function OperacionesSection({
  abrirPendiente,
  abrirReporteDirecto,
  archivarCompletados,
  cambiarEstadoPendiente,
  cargarHistorial,
  dragOverColumn,
  draggedPendiente,
  filtroTurno,
  handleDragEnd,
  handleDragLeave,
  handleDragOver,
  handleDragStart,
  handleDrop,
  parseFecha,
  pendientes,
  s,
  setFiltroTurno,
  setFormPendiente,
  setPendienteEditando,
  setShowPendienteModal,
}) {
  return (<div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#e0e0e0' }}>Tablero de Pendientes</h2>
                <p style={{ margin: '0.25rem 0 0', color: '#6a9b6a', fontSize: '0.9rem' }}>
                  {pendientes.length} pendientes · {pendientes.filter(p => p.estado === 'pendiente').length} por hacer
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select style={s.select} value={filtroTurno} onChange={(e) => setFiltroTurno(e.target.value)}>
                  <option value="">Todos los turnos</option>
                  <option value="mañana">Mañana</option>
                  <option value="tarde">Tarde</option>
                  <option value="noche">Noche</option>
                </select>
                <button onClick={cargarHistorial} style={s.button('#1d4ed8')}>Historial</button>
                <button onClick={() => abrirReporteDirecto('pendientes-completados')} style={s.button('#3b82f6')}>Reporte</button>
                <button onClick={archivarCompletados} style={s.button('#f59e0b')}>Archivar completados</button>
                <button onClick={() => { setPendienteEditando(null); setFormPendiente({ titulo: '', descripcion: '', prioridad: 'media', asignado_a: '', turno: '', notas: '', estado: 'pendiente' }); setShowPendienteModal(true); }} style={s.button('#10b981')}>+ Nuevo Pendiente</button>
              </div>
            </div>

            <div className="pending-board" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              {['pendiente', 'en_proceso', 'completado'].map(estado => {
                const estadoLabel = { pendiente: 'Pendiente', en_proceso: 'En Proceso', completado: 'Completado' }[estado];
                const estadoColor = { pendiente: '#f59e0b', en_proceso: '#3b82f6', completado: '#10b981' }[estado];
                const items = pendientes.filter(p => p.estado === estado && (!filtroTurno || p.turno === filtroTurno));
                const isDragOver = dragOverColumn === estado;
                return (
                  <div 
                    key={estado} 
                    onDragOver={(e) => handleDragOver(e, estado)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, estado)}
                    style={{ 
                      background: isDragOver ? `${estadoColor}11` : '#0a0a0a', 
                      borderRadius: '12px', 
                      padding: '1rem', 
                      border: `2px solid ${isDragOver ? estadoColor : estadoColor + '33'}`, 
                      minHeight: '400px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: `2px solid ${estadoColor}44` }}>
                      <h3 style={{ margin: 0, fontSize: '1rem', color: estadoColor }}>{estadoLabel}</h3>
                      <span style={{ background: `${estadoColor}22`, color: estadoColor, padding: '0.25rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>{items.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {items.map(p => {
                        const prioridadColor = { alta: '#ef4444', media: '#f59e0b', baja: '#6b7280' }[p.prioridad] || '#6b7280';
                        const isDragging = draggedPendiente?.id === p.id;
                        return (
                          <div 
                            key={p.id} 
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, p)}
                            onDragEnd={handleDragEnd}
                            style={{ 
                              background: '#1a1a1a', 
                              borderRadius: '8px', 
                              padding: '0.75rem', 
                              border: `1px solid ${prioridadColor}44`, 
                              cursor: 'grab',
                              opacity: isDragging ? 0.5 : 1,
                              transition: 'opacity 0.2s ease'
                            }}
                            role="button"
                            tabIndex={0}
                            aria-label={`Abrir pendiente ${p.titulo}`}
                            onKeyDown={(e) => activarConTeclado(e, () => abrirPendiente(p))}
                            onClick={() => abrirPendiente(p)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#e0e0e0', flex: 1 }}>
                                <span style={{ color: '#4a4a4a', marginRight: '0.5rem', cursor: 'grab' }}>⋮⋮</span>
                                {p.titulo}
                              </div>
                              <span style={{ background: `${prioridadColor}22`, color: prioridadColor, padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', marginLeft: '0.5rem' }}>{p.prioridad}</span>
                            </div>
                            {p.descripcion && <div style={{ fontSize: '0.8rem', color: '#a0a0a0', marginBottom: '0.5rem', lineHeight: '1.4', paddingLeft: '1.2rem' }}>{p.descripcion}</div>}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.7rem', paddingLeft: '1.2rem' }}>
                              {p.asignado_a && <span style={{ background: '#1a3d1a', color: '#00ff41', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>👤 {p.asignado_a}</span>}
                              {p.turno && <span style={{ background: '#1a2a3d', color: '#60a5fa', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>🕐 {p.turno}</span>}
                              <span style={{ background: '#2a1a3d', color: '#c084fc', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>👤 {p.created_by_username || p.creado_por || 'Sistema'}</span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#4a4a4a', marginTop: '0.4rem', paddingLeft: '1.2rem' }}>
                              📅 Creado: {parseFecha(p.fecha_creacion)?.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) || '-'}
                            </div>
                            {p.notas && <div style={{ fontSize: '0.75rem', color: '#6a9b6a', marginTop: '0.5rem', fontStyle: 'italic', paddingLeft: '1.2rem' }}>📝 {p.notas}</div>}
                            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                              {p.estado !== 'pendiente' && <button onClick={(e) => { e.stopPropagation(); cambiarEstadoPendiente(p.id, p.estado === 'completado' ? 'en_proceso' : 'pendiente'); }} style={{ padding: '0.15rem 0.4rem', background: '#f59e0b22', border: '1px solid #f59e0b44', borderRadius: '4px', color: '#f59e0b', cursor: 'pointer', fontSize: '0.7rem' }}>←</button>}
                              {p.estado !== 'completado' && <button onClick={(e) => { e.stopPropagation(); cambiarEstadoPendiente(p.id, p.estado === 'pendiente' ? 'en_proceso' : 'completado'); }} style={{ padding: '0.15rem 0.4rem', background: '#10b98122', border: '1px solid #10b98144', borderRadius: '4px', color: '#10b981', cursor: 'pointer', fontSize: '0.7rem' }}>→</button>}
                            </div>
                          </div>
                        );
                      })}
                      {items.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#4a4a4a', fontSize: '0.85rem' }}>
                          Sin pendientes
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>);
}

export function ViajesSection({
  calculandoViajeEta,
  crearViaje,
  dragOverViajeColumn,
  draggedViaje,
  driverPhoneOverrides,
  estadoColors,
  formViaje,
  formatFechaProgramada,
  geocercasCoincidentes,
  geofenceOptions,
  iniciarArrastreViaje,
  normalizarEstadoViaje,
  obtenerOpcionesRemolque,
  obtenerRemolqueAsignadoUnidad,
  operadores,
  parseFecha,
  s,
  samsaraDrivers,
  setDragOverViajeColumn,
  setFormViaje,
  setShowProgramarViajeModal,
  setShowViajeModal,
  setViajeDetalle,
  setViajeEditando,
  setViajeForm,
  setViajesHistorialSearch,
  setViajesProximosSearch,
  setViajesView,
  showProgramarViajeModal,
  soloPrimerViajeActivoPorUnidad,
  soltarViaje,
  terminarArrastreViaje,
  vehiculos,
  viajeEta,
  viajeEtaError,
  viajeWasDraggedRef,
  viajes,
  viajesHistorialSearch,
  viajesProximosOcultos,
  viajesProximosSearch,
  viajesView,
}) {
  return (<div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#e0e0e0' }}>Programación de Viajes</h2>
                  <p style={{ margin: '0.25rem 0 0', color: '#6a9b6a', fontSize: '0.9rem' }}>{viajes.length} viajes registrados · {viajes.filter(v => !['completado', 'cancelado'].includes(String(v.estado || '').toLowerCase())).length} activos</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', border: '1px solid #1a3d1a', borderRadius: '10px', overflow: 'hidden' }}>
                  <button type="button" onClick={() => setViajesView('tablero')} style={{ padding: '0.5rem 0.9rem', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', background: viajesView === 'tablero' ? '#00ff41' : 'transparent', color: viajesView === 'tablero' ? '#061006' : '#6a9b6a' }}>Tablero</button>
                  <button type="button" onClick={() => setViajesView('proximos')} style={{ padding: '0.5rem 0.9rem', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', background: viajesView === 'proximos' ? '#f59e0b' : 'transparent', color: viajesView === 'proximos' ? '#061006' : '#6a9b6a' }}>Próximos ({viajesProximosOcultos(viajes).length})</button>
                  <button type="button" onClick={() => setViajesView('historial')} style={{ padding: '0.5rem 0.9rem', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', background: viajesView === 'historial' ? '#00ff41' : 'transparent', color: viajesView === 'historial' ? '#061006' : '#6a9b6a' }}>Historial</button>
                </div>
                <button type="button" onClick={() => setShowProgramarViajeModal(true)} style={s.button('#10b981')}>+ Programar viaje</button>
              </div>
            </div>
            {showProgramarViajeModal &&
  <ProgramarViajeModal
  setShowProgramarViajeModal={setShowProgramarViajeModal}
  s={s}
  crearViaje={crearViaje}
  formViaje={formViaje}
  vehiculos={vehiculos}
  operadores={operadores}
  obtenerRemolqueAsignadoUnidad={obtenerRemolqueAsignadoUnidad}
  setFormViaje={setFormViaje}
  samsaraDrivers={samsaraDrivers}
  driverPhoneOverrides={driverPhoneOverrides}
  geofenceOptions={geofenceOptions}
  obtenerOpcionesRemolque={obtenerOpcionesRemolque}
  viajes={viajes}
  normalizarEstadoViaje={normalizarEstadoViaje}
  setViajeDetalle={setViajeDetalle}
  setViajeForm={setViajeForm}
  setShowViajeModal={setShowViajeModal}
  setViajeEditando={setViajeEditando}
  estadoColors={estadoColors}
  formatFechaProgramada={formatFechaProgramada}
  calculandoViajeEta={calculandoViajeEta}
  viajeEta={viajeEta}
  viajeEtaError={viajeEtaError}
/>
}
            {viajesView === 'tablero' && (() => {
              const proximosPorUnidad = new Map();
              for (const oculto of viajesProximosOcultos(viajes)) {
                const key = String(oculto.vehicle_id || '') || normalizarMatch(oculto.vehicle_name);
                proximosPorUnidad.set(key, (proximosPorUnidad.get(key) || 0) + 1);
              }
              return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.65rem' }}>
              {[
                { key: 'programado', label: 'Programado', color: '#8b5cf6' },
                { key: 'en_ruta_vacio', label: 'En Ruta Vacío', color: '#3b82f6' },
                { key: 'en_ruta_cargado', label: 'En Ruta Cargado', color: '#10b981' },
                { key: 'proceso_carga', label: 'Proceso Carga', color: '#f59e0b' },
                { key: 'proceso_descarga', label: 'Proceso Descarga', color: '#ec4899' },
                { key: 'proceso_liberacion', label: 'Proceso Liberación', color: '#22c55e' },
                { key: 'espera_ingreso', label: 'Espera Ingreso', color: '#f97316' },
                { key: 'en_resguardo', label: 'En Resguardo', color: '#14b8a6' },
              ].map(col => {
                const items = soloPrimerViajeActivoPorUnidad(viajes).filter(v => String(v.estado || 'programado').toLowerCase() === col.key);
                const isDragOver = dragOverViajeColumn === col.key;
                return (
                  <div
                    key={col.key}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverViajeColumn(col.key); }}
                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverViajeColumn(null); }}
                    onDrop={(e) => soltarViaje(e, col.key)}
                    style={{ background: isDragOver ? `${col.color}18` : '#0a0a0a', border: `2px solid ${isDragOver ? col.color : `${col.color}33`}`, borderRadius: '10px', padding: '0.55rem', minHeight: '145px', transition: 'background 0.15s ease, border-color 0.15s ease' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '0.82rem', color: col.color }}>{col.label}</h3>
                      <span style={s.badge(col.color)}>{items.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {items.length === 0 ? (
                        <div style={{ color: '#4a8a4a', fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>Sin viajes</div>
                      ) : items.sort(ordenarViajesPorUnidad).map(v => (
                        <div key={v.id} className="trip-card-compact" role="button" tabIndex={0} draggable aria-label={`Ver detalles del viaje de ${v.vehicle_name || v.vehicle_id}`}
                          onPointerDown={() => { viajeWasDraggedRef.current = false; }}
                          onDragStart={(e) => iniciarArrastreViaje(e, v)} onDragEnd={terminarArrastreViaje}
                          onKeyDown={(e) => activarConTeclado(e, () => { setViajeDetalle(v); setViajeForm(v); setShowViajeModal(true); setViajeEditando(false); })}
                          onClick={() => { if (viajeWasDraggedRef.current) return; setViajeDetalle(v); setViajeForm(v); setShowViajeModal(true); setViajeEditando(false); }}
                          style={{ background: '#111', border: `1px solid ${col.color}33`, borderRadius: '8px', padding: '0.5rem', cursor: draggedViaje?.id === v.id ? 'grabbing' : 'grab', opacity: draggedViaje?.id === v.id ? 0.5 : 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '0.4rem' }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ color: '#4a8a4a', fontSize: '0.58rem', textTransform: 'uppercase' }}>Unidad</div>
                              <div style={{ color: '#00ff41', fontWeight: 700, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.vehicle_name || v.vehicle_id}</div>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ color: '#4a8a4a', fontSize: '0.58rem', textTransform: 'uppercase' }}>Remolque</div>
                              <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.remolque || 'Sin remolque'}</div>
                            </div>
                          </div>
                           <div className="trip-route-geofences">
                             <span className="trip-geofence-chip origin" title={v.origen || 'Sin origen'}>📍 {geocercasCoincidentes(v.origen)[0] || v.origen || 'Sin origen'}</span>
                             <span className="trip-route-arrow">→</span>
                             <div className="trip-route-destinations">
                               {v.tipo_entrega === 'reparto' ? destinosViaje(v).map((destino, index) => (
                                 <span key={`${v.id}-stop-${index}`} className="trip-geofence-chip destination" title={destino}>{index + 1}. {geocercasCoincidentes(destino)[0] || destino}</span>
                               )) : (
                                 <span className="trip-geofence-chip destination" title={v.destino || 'Sin destino'}>🏁 {geocercasCoincidentes(v.destino)[0] || v.destino || 'Sin destino'}</span>
                               )}
                             </div>
                            </div>
                           {v.tipo_entrega === 'reparto' && (() => {
                             const paradas = paradasViaje(v);
                             const completadas = paradas.filter(parada => parada.estado === 'completada').length;
                             return <div style={{ color: completadas === paradas.length ? '#00ff41' : '#f59e0b', fontSize: '0.65rem', fontWeight: 700 }}>{completadas} de {paradas.length} paradas completadas</div>;
                           })()}
                           {(() => {
                             const llegadaOrigen = parseFecha(v.hora_llegada_origen);
                             const salidaOrigen = parseFecha(v.hora_salida_origen);
                             if (!llegadaOrigen && !salidaOrigen) return null;
                             if (llegadaOrigen && (!salidaOrigen || llegadaOrigen > salidaOrigen)) {
                               return <div style={{ color: '#00ff41', fontSize: '0.62rem', fontWeight: 700 }}>📍 En origen · desde {llegadaOrigen.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>;
                             }
                             const mins = Math.max(0, Math.floor((Date.now() - salidaOrigen.getTime()) / 60000));
                             if (mins > 24 * 60) return null;
                             return <div style={{ color: '#3b82f6', fontSize: '0.62rem', fontWeight: 700 }}>Salió del origen · hace {mins} min</div>;
                           })()}
                           {v.estado === 'espera_ingreso' && v.hora_salida && (() => {
                             const salida = parseFecha(v.hora_salida);
                             if (!salida) return null;
                             const mins = Math.max(0, Math.floor((Date.now() - salida.getTime()) / 60000));
                             return <div style={{ color: '#f59e0b', fontSize: '0.62rem', fontWeight: 700 }}>Salió del sitio · hace {mins} min</div>;
                           })()}
                           {(() => {
                             const extra = proximosPorUnidad.get(String(v.vehicle_id || '') || normalizarMatch(v.vehicle_name)) || 0;
                             if (!extra) return null;
                             return <div style={{ color: '#a78bfa', fontSize: '0.62rem', fontWeight: 700 }}>+{extra} viaje{extra > 1 ? 's' : ''} en próximos</div>;
                           })()}
                         </div>
                       ))}
                     </div>
                   </div>
                 );
               })}
             </div>
              );
            })()}

            {viajesView === 'proximos' && (
              <div>
                {viajesProximosOcultos(viajes).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#4a8a4a' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📅</div>
                    <p>No hay viajes próximos ocultos</p>
                    <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>Los viajes adicionales de cada unidad aparecerán aquí mientras el primer viaje esté activo</p>
                  </div>
                ) : (
                  <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #1a3d1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div style={{ color: '#e0e0e0', fontWeight: 700 }}>Viajes próximos ocultos</div>
                      <input
                        type="search"
                        placeholder="Buscar por unidad, conductor, origen o destino..."
                        value={viajesProximosSearch}
                        onChange={event => setViajesProximosSearch(event.target.value)}
                        style={{ ...s.input, width: 'min(100%, 320px)' }}
                      />
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ ...s.table, minWidth: '1020px' }}>
                        <thead>
                          <tr>
                            <th style={s.th}>Estado</th>
                            <th style={s.th}>Unidad</th>
                            <th style={s.th}>Conductor</th>
                            <th style={s.th}>Ruta</th>
                            <th style={s.th}>Remolque</th>
                            <th style={s.th}>Inicio</th>
                            <th style={s.th}>Fin</th>
                            <th style={s.th}>En tablero</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viajesProximosOcultos(viajes)
                            .filter(v => {
                              const q = viajesProximosSearch.trim().toLowerCase();
                              if (!q) return true;
                              return [v.vehicle_name, v.conductor, v.origen, v.destino, v.remolque, (v.destinos_json || '')]
                                .some(value => String(value || '').toLowerCase().includes(q));
                            })
                            .sort((a, b) => new Date(a.fecha_inicio || a.created_at || 0) - new Date(b.fecha_inicio || b.created_at || 0))
                            .map(v => {
                              const estado = normalizarEstadoViaje(v.estado);
                              const color = estadoColors[estado] || '#f59e0b';
                              const destinos = v.tipo_entrega === 'reparto' ? destinosViaje(v) : [v.destino].filter(Boolean);
                              return (
                                <tr key={v.id} role="button" tabIndex={0} onClick={() => { setViajeDetalle(v); setViajeForm(v); setShowViajeModal(true); setViajeEditando(false); }} onKeyDown={(e) => activarConTeclado(e, () => { setViajeDetalle(v); setViajeForm(v); setShowViajeModal(true); setViajeEditando(false); })} style={{ cursor: 'pointer' }}>
                                  <td style={s.td}><span style={s.badge(color)}>{estado.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span></td>
                                  <td style={{ ...s.td, color: '#00ff41', fontWeight: 700 }}>{v.vehicle_name || v.vehicle_id}</td>
                                  <td style={s.td}>{v.conductor || <span style={{ color: '#4b6b4b' }}>Sin conductor</span>}</td>
                                  <td style={s.td}>
                                    <span style={{ color: '#10b981' }}>{v.origen || 'Sin origen'}</span>
                                    <span style={{ color: '#4a8a4a' }}> → </span>
                                    <span style={{ color: '#60a5fa' }}>{v.tipo_entrega === 'reparto' ? `${destinos.length} paradas` : (destinos[0] || 'Sin destino')}</span>
                                  </td>
                                  <td style={s.td}>{v.remolque || <span style={{ color: '#4b6b4b' }}>Sin remolque</span>}</td>
                                  <td style={s.td}>{v.fecha_inicio ? formatFechaProgramada(v.fecha_inicio) : '-'}</td>
                                  <td style={s.td}>{v.fecha_fin ? formatFechaProgramada(v.fecha_fin) : '-'}</td>
                                  <td style={s.td}>{(() => {
                                    const key = String(v.vehicle_id || '') || normalizarMatch(v.vehicle_name);
                                    const enTablero = soloPrimerViajeActivoPorUnidad(viajes).find(t => !['completado', 'cancelado'].includes(String(t.estado || '').toLowerCase()) && (String(t.vehicle_id || '') || normalizarMatch(t.vehicle_name)) === key);
                                    if (!enTablero) return <span style={{ color: '#4b6b4b' }}>-</span>;
                                    return (
                                      <button type="button" title={`Ver viaje #${enTablero.id} que ocupa el tablero de esta unidad`} onClick={(e) => { e.stopPropagation(); setViajeDetalle(enTablero); setViajeForm(enTablero); setShowViajeModal(true); setViajeEditando(false); }} style={{ background: 'none', border: '1px solid #1a3d1a', borderRadius: '6px', color: '#00ff41', cursor: 'pointer', padding: '0.15rem 0.45rem', fontSize: '0.72rem', fontWeight: 700 }}>
                                        #{enTablero.id} · {String(enTablero.estado || '').replace(/_/g, ' ')}
                                      </button>
                                    );
                                  })()}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {viajesView === 'historial' && (
              <div>
                {viajes.filter(v => ['completado', 'cancelado'].includes(String(v.estado || '').toLowerCase())).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#4a8a4a' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🗂️</div>
                    <p>No hay viajes en el historial todavía</p>
                    <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>Los viajes completados y cancelados aparecerán aquí</p>
                  </div>
                ) : (
                  <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #1a3d1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div style={{ color: '#e0e0e0', fontWeight: 700 }}>Historial de viajes</div>
                      <input
                        type="search"
                        placeholder="Buscar por unidad, conductor, origen o destino..."
                        value={viajesHistorialSearch}
                        onChange={event => setViajesHistorialSearch(event.target.value)}
                        style={{ ...s.input, width: 'min(100%, 320px)' }}
                      />
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ ...s.table, minWidth: '900px' }}>
                        <thead>
                          <tr>
                            <th style={s.th}>Estado</th>
                            <th style={s.th}>Unidad</th>
                            <th style={s.th}>Conductor</th>
                            <th style={s.th}>Ruta</th>
                            <th style={s.th}>Remolque</th>
                            <th style={s.th}>Inicio</th>
                            <th style={s.th}>Fin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viajes
                            .filter(v => ['completado', 'cancelado'].includes(String(v.estado || '').toLowerCase()))
                            .filter(v => {
                              const q = viajesHistorialSearch.trim().toLowerCase();
                              if (!q) return true;
                              return [v.vehicle_name, v.conductor, v.origen, v.destino, v.remolque, (v.destinos_json || '')]
                                .some(value => String(value || '').toLowerCase().includes(q));
                            })
                            .sort((a, b) => new Date(b.fecha_inicio || b.created_at || 0) - new Date(a.fecha_inicio || a.created_at || 0))
                            .map(v => {
                              const estado = normalizarEstadoViaje(v.estado);
                              const color = estadoColors[estado] || '#8b5cf6';
                              const destinos = v.tipo_entrega === 'reparto' ? destinosViaje(v) : [v.destino].filter(Boolean);
                              return (
                                <tr key={v.id} role="button" tabIndex={0} onClick={() => { setViajeDetalle(v); setViajeForm(v); setShowViajeModal(true); setViajeEditando(false); }} onKeyDown={(e) => activarConTeclado(e, () => { setViajeDetalle(v); setViajeForm(v); setShowViajeModal(true); setViajeEditando(false); })} style={{ cursor: 'pointer' }}>
                                  <td style={s.td}><span style={s.badge(color)}>{estado === 'completado' ? 'Completado' : 'Cancelado'}</span></td>
                                  <td style={{ ...s.td, color: '#00ff41', fontWeight: 700 }}>{v.vehicle_name || v.vehicle_id}</td>
                                  <td style={s.td}>{v.conductor || <span style={{ color: '#4b6b4b' }}>Sin conductor</span>}</td>
                                  <td style={s.td}>
                                    <span style={{ color: '#10b981' }}>{v.origen || 'Sin origen'}</span>
                                    <span style={{ color: '#4a8a4a' }}> → </span>
                                    <span style={{ color: '#60a5fa' }}>{v.tipo_entrega === 'reparto' ? `${destinos.length} paradas` : (destinos[0] || 'Sin destino')}</span>
                                  </td>
                                  <td style={s.td}>{v.remolque || <span style={{ color: '#4b6b4b' }}>Sin remolque</span>}</td>
                                  <td style={s.td}>{v.fecha_inicio ? formatFechaProgramada(v.fecha_inicio) : '-'}</td>
                                  <td style={s.td}>{v.fecha_fin ? formatFechaProgramada(v.fecha_fin) : '-'}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>);
}

export function ClientesSection({
  abrirClienteGeofenceModal,
  abrirClienteModal,
  abrirExistingGeofenceModal,
  clienteSearch,
  clientes,
  clientesFiltrados,
  desvincularClienteGeofence,
  eliminarCliente,
  parseFecha,
  s,
  selectedCliente,
  selectedClienteGeofences,
  selectedClienteId,
  selectedClienteUnidades,
  setClienteSearch,
  setSelectedClienteId,
  vehiculos,
  vincularClienteUnidad,
  desvincularClienteUnidad,
}) {
  const [unidadSeleccionada, setUnidadSeleccionada] = useState('');
  const unidadesDisponibles = useMemo(() => {
    const asignadas = new Set(selectedClienteUnidades.map(u => String(u.vehicle_id)));
    return vehiculos
      .filter(v => v.id && !asignadas.has(String(v.id)))
      .map(v => ({ id: v.id, name: v.name || v.id }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [vehiculos, selectedClienteUnidades]);
  return (<div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#4ade80', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Directorio comercial</div>
                <h2 style={{ margin: 0, fontSize: '1.6rem', color: '#f0fdf4' }}>Clientes</h2>
                <p style={{ margin: '0.35rem 0 0', color: '#6a9b6a', fontSize: '0.9rem' }}>Contactos centrales para la coordinación de cargas y entregas</p>
              </div>
              <button type="button" onClick={() => abrirClienteModal()} style={{ ...s.button('#00ff41'), background: '#00ff41', color: '#061006', fontWeight: 800 }}>+ Nuevo cliente</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem' }}>
              {[
                { label: 'Clientes registrados', value: clientes.length, color: '#00ff41' },
                { label: 'Con teléfono', value: clientes.filter(cliente => cliente.telefono).length, color: '#3b82f6' },
                { label: 'Con correo', value: clientes.filter(cliente => cliente.email).length, color: '#a855f7' },
                { label: 'Con grupos WPP', value: clientes.filter(cliente => (cliente.wpp_groups || []).length).length, color: '#22d3ee' },
              ].map(item => (
                <div key={item.label} style={{ ...s.card, padding: '1rem 1.1rem', borderLeft: `3px solid ${item.color}` }}>
                  <div style={{ color: '#6a9b6a', fontSize: '0.75rem' }}>{item.label}</div>
                  <div style={{ color: item.color, fontSize: '1.65rem', lineHeight: 1.2, fontWeight: 800, marginTop: '0.2rem' }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid #1a3d1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  type="search"
                  placeholder="Buscar por cliente, contacto, teléfono o correo..."
                  value={clienteSearch}
                  onChange={event => setClienteSearch(event.target.value)}
                  style={{ ...s.input, width: 'min(100%, 430px)' }}
                />
                <span style={{ color: '#6a9b6a', fontSize: '0.78rem' }}>{clientesFiltrados.length} resultado{clientesFiltrados.length === 1 ? '' : 's'}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ ...s.table, minWidth: '780px' }}>
                  <thead>
                    <tr>
                      <th style={s.th}>Cliente</th>
                      <th style={s.th}>Contacto</th>
                      <th style={s.th}>Teléfono</th>
                      <th style={s.th}>Correo</th>
                      <th style={s.th}>Grupos WPP</th>
                      <th style={s.th}>Registro</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesFiltrados.map(cliente => (
                      <tr
                        key={cliente.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedClienteId(cliente.id)}
                        onKeyDown={event => activarConTeclado(event, () => setSelectedClienteId(cliente.id))}
                        style={{ cursor: 'pointer', background: String(selectedClienteId) === String(cliente.id) ? '#102510' : 'transparent', outline: String(selectedClienteId) === String(cliente.id) ? '1px solid #285b35' : 'none' }}
                      >
                        <td style={{ ...s.td, color: '#f0fdf4', fontWeight: 700 }}>{cliente.nombre}</td>
                        <td style={s.td}>{cliente.contacto || <span style={{ color: '#4b6b4b' }}>Sin contacto</span>}</td>
                        <td style={s.td}>
                          {cliente.telefono ? <a href={`tel:${cliente.telefono}`} style={{ color: '#60a5fa', textDecoration: 'none' }}>{cliente.telefono}</a> : <span style={{ color: '#4b6b4b' }}>Sin teléfono</span>}
                        </td>
                        <td style={s.td}>
                          {cliente.email ? <a href={`mailto:${cliente.email}`} style={{ color: '#c084fc', textDecoration: 'none' }}>{cliente.email}</a> : <span style={{ color: '#4b6b4b' }}>Sin correo</span>}
                        </td>
                        <td style={s.td}>
                          {(cliente.wpp_groups || []).length === 0
                            ? <span style={{ color: '#4b6b4b' }}>Sin grupos</span>
                            : <span style={{ color: '#22d3ee' }}>{cliente.wpp_groups.join(', ')}</span>}
                        </td>
                        <td style={s.td}>{cliente.created_at ? parseFecha(cliente.created_at)?.toLocaleDateString('es-MX') : '-'}</td>
                        <td style={{ ...s.td, textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.45rem' }}>
                            <button type="button" onClick={event => { event.stopPropagation(); abrirClienteModal(cliente); }} style={s.button('#3b82f6')}>Editar</button>
                            <button type="button" onClick={event => { event.stopPropagation(); eliminarCliente(cliente); }} style={s.button('#ef4444')}>Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {clientesFiltrados.length === 0 && (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#6a9b6a' }}>
                  {clientes.length === 0 ? 'Aún no hay clientes registrados.' : 'No hay clientes que coincidan con la búsqueda.'}
                </div>
              )}
            </div>

            {selectedCliente && (
              <div style={{ ...s.card, borderColor: '#285b35', padding: '1.15rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ color: '#4ade80', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Cliente seleccionado</div>
                    <h3 style={{ margin: '0.25rem 0 0', color: '#f0fdf4' }}>{selectedCliente.nombre}</h3>
                    <div style={{ color: '#6a9b6a', fontSize: '0.82rem', marginTop: '0.2rem' }}>{selectedClienteGeofences.length} geocerca{selectedClienteGeofences.length === 1 ? '' : 's'} asociada{selectedClienteGeofences.length === 1 ? '' : 's'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button type="button" onClick={abrirExistingGeofenceModal} style={{ ...s.button('#00ff41'), background: '#0d2b0d' }}>Seleccionar existente</button>
                    <button type="button" onClick={abrirClienteGeofenceModal} style={s.button('#3b82f6')}>+ Crear nueva</button>
                    <button type="button" onClick={() => setSelectedClienteId(null)} style={s.button('#6b7280')}>Cerrar detalle</button>
                  </div>
                </div>

                {selectedClienteGeofences.length === 0 ? (
                  <div style={{ marginTop: '1rem', padding: '1.25rem', border: '1px dashed #285b35', borderRadius: '10px', color: '#6a9b6a', textAlign: 'center' }}>Este cliente todavía no tiene geocercas. Agrega la primera para incluirla en el mapa y en la detección de eventos.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                    {selectedClienteGeofences.map(geofence => (
                      <div key={geofence.id} style={{ padding: '0.85rem', border: '1px solid #1a3d1a', borderRadius: '10px', background: '#0a150a' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ color: '#e5ffe9', fontWeight: 700, overflowWrap: 'anywhere' }}><span style={{ color: geofence.color || '#3b82f6' }}>●</span> {geofence.nombre}</div>
                            <div style={{ color: '#6a9b6a', fontSize: '0.75rem', marginTop: '0.3rem' }}>Radio: {Number(geofence.radio_metros || 0).toLocaleString('es-MX')} m · {geofence.source === 'samsara' ? 'Samsara' : 'Local'}</div>
                            <div style={{ color: '#4f7a55', fontSize: '0.72rem', marginTop: '0.2rem', overflowWrap: 'anywhere' }}>{geofence.direccion || (Number.isFinite(Number(geofence.latitud)) && Number.isFinite(Number(geofence.longitud)) ? `${Number(geofence.latitud).toFixed(5)}, ${Number(geofence.longitud).toFixed(5)}` : 'Sin dirección')}</div>
                          </div>
                          <button type="button" aria-label={`Desvincular ${geofence.nombre}`} title="Desvincular" onClick={() => desvincularClienteGeofence(geofence)} style={{ alignSelf: 'flex-start', background: 'none', border: 0, color: '#f59e0b', cursor: 'pointer', fontSize: '1rem' }}>↗</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: '1.1rem' }}>
                  <div style={{ color: '#4ade80', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.45rem' }}>Unidades asignadas</div>
                  {selectedClienteUnidades.length === 0 ? (
                    <div style={{ color: '#6a9b6a', fontSize: '0.85rem' }}>Sin unidades asignadas. Selecciona una unidad del listado para asignarla a este cliente.</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {selectedClienteUnidades.map(unidad => (
                        <span key={unidad.vehicle_id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.4rem 0.75rem', border: '1px solid #1a3d1a', borderRadius: '999px', background: '#0a150a', color: '#e5ffe9', fontSize: '0.82rem' }}>
                          🚛 {unidad.vehicle_name}
                          <button type="button" aria-label={`Quitar ${unidad.vehicle_name}`} title="Quitar asignación" onClick={() => desvincularClienteUnidad(unidad.vehicle_id)} style={{ background: 'none', border: 0, color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', padding: 0, lineHeight: 1 }}>✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem', flexWrap: 'wrap' }}>
                    <select
                      value={unidadSeleccionada}
                      onChange={event => setUnidadSeleccionada(event.target.value)}
                      style={{ ...s.select, width: 'min(100%, 320px)' }}
                      aria-label="Seleccionar unidad para asignar"
                    >
                      <option value="">Seleccionar unidad...</option>
                      {unidadesDisponibles.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!unidadSeleccionada}
                      onClick={() => {
                        const seleccion = unidadesDisponibles.find(v => String(v.id) === String(unidadSeleccionada));
                        if (!seleccion) return;
                        vincularClienteUnidad(seleccion.id, seleccion.name);
                        setUnidadSeleccionada('');
                      }}
                      style={{ ...s.button('#00ff41'), opacity: unidadSeleccionada ? 1 : 0.45, cursor: unidadSeleccionada ? 'pointer' : 'not-allowed' }}
                    >
                      + Asignar unidad
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: '1.1rem' }}>
                  <div style={{ color: '#4ade80', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.45rem' }}>Grupos de WhatsApp para reportes</div>
                  {(selectedCliente.wpp_groups || []).length === 0 ? (
                    <div style={{ color: '#6a9b6a', fontSize: '0.85rem' }}>Sin grupos configurados. Pulsa &quot;Editar&quot; en el cliente para agregarlos.</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {selectedCliente.wpp_groups.map(grupo => (
                        <span key={grupo} style={{ padding: '0.4rem 0.75rem', border: '1px solid #1a3d1a', borderRadius: '999px', background: '#0a150a', color: '#e5ffe9', fontSize: '0.82rem' }}>{grupo}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>);
}

export function OperadoresSection({
  driverPhoneOverrides,
  filtroOperador,
  hiddenDrivers,
  s,
  samsaraDrivers,
  setDriverPhoneOverrides,
  setFiltroOperador,
  setHiddenDrivers,
}) {
  return (<div>
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
                    <th style={s.th}>Teléfono</th>
                    <th style={s.th}>Estado</th>
                    <th style={s.th}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {samsaraDrivers
                    .filter(d => !hiddenDrivers.includes(d.id))
                    .filter(d => !filtroOperador || d.name.toLowerCase().includes(filtroOperador.toLowerCase()) || (d.username && d.username.toLowerCase().includes(filtroOperador.toLowerCase())))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((driver) => (
                      <tr key={driver.id}>
                        <td style={{ ...s.td, fontWeight: '500' }}>{driver.name}</td>
                        <td style={s.td}>
                          <input
                            value={driverPhoneOverrides[driver.id] ?? driver.phone ?? ''}
                            onChange={(e) => setDriverPhoneOverrides(prev => ({ ...prev, [driver.id]: e.target.value }))}
                            style={{ ...s.input, width: '160px', padding: '0.35rem 0.5rem' }}
                            placeholder="Teléfono"
                          />
                        </td>
                        <td style={s.td}>
                          <span style={s.badge(driver.status === 'active' ? '#10b981' : '#ef4444')}>
                            {driver.status === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td style={s.td}>
                          <button
                            onClick={() => setHiddenDrivers(prev => prev.includes(driver.id) ? prev : [...prev, driver.id])}
                            style={{ background: 'none', border: '1px solid #3a1a1a', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', padding: '0.3rem 0.55rem' }}
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {hiddenDrivers.length > 0 && (
                <div style={{ marginTop: '0.75rem', color: '#6a9b6a', fontSize: '0.8rem' }}>
                  Operadores ocultos: {hiddenDrivers.length}
                  <button onClick={() => setHiddenDrivers([])} style={{ marginLeft: '0.75rem', background: 'none', border: 'none', color: '#00ff41', cursor: 'pointer' }}>Restaurar todos</button>
                </div>
              )}
            </div>
          </div>);
}

export function RemolquesSection({
  abrirRemolqueDashboard,
  asignarRemolqueDesdeDashboard,
  desasignarRemolque,
  displayRemolque,
  eliminarRemolque,
  setResguardoRemolque,
  historialRemolque,
  historialRemolqueError,
  historialRemolqueLoading,
  numeroRemolque,
  obtenerMiembrosFull,
  parseFecha,
  remolqueCategorias,
  remolqueDashModo,
  remolqueDashSaving,
  remolqueDashSegundoId,
  remolqueDashVehicleId,
  remolques,
  s,
  selectedRemolque,
  setFormRemolque,
  setRemolqueDashModo,
  setRemolqueDashSegundoId,
  setRemolqueDashVehicleId,
  setRemolqueEditando,
  setShowRemolqueModal,
  tempColor,
  ubicacionRemolque,
  vehiculos,
}) {
  return (<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: '#e0e0e0', margin: 0 }}>Remolques</h2>
              <button onClick={() => { setRemolqueEditando(null); setFormRemolque({ numero: '', categoria: 'Caja Seca' }); setShowRemolqueModal(true); }} style={{ padding: '0.5rem 1rem', background: '#00ff41', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>+ Nuevo</button>
            </div>

            {remolqueCategorias.map(cat => {
              const filas = remolques.filter(r => (r.categoria || 'Caja Seca') === cat).sort((a, b) => String(a.numero).localeCompare(String(b.numero), undefined, { numeric: true }));
              return (
                <div key={cat} style={{ background: '#111', border: '1px solid #1a3d1a', borderRadius: '10px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, color: '#00ff41', fontSize: '1rem' }}>{cat}</h3>
                    <span style={{ color: '#6a9b6a', fontSize: '0.8rem' }}>{filas.length}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    {filas.length === 0 ? (
                      <div style={{ color: '#6a9b6a', fontSize: '0.85rem', fontStyle: 'italic' }}>Sin remolques</div>
                    ) : filas.map(r => (
                      <div key={r.id} role="button" tabIndex={0} onKeyDown={(e) => activarConTeclado(e, () => abrirRemolqueDashboard(r))} onClick={() => abrirRemolqueDashboard(r)}
                        style={{ background: selectedRemolque === r.id ? '#1a3d1a' : '#111', border: `1px solid ${selectedRemolque === r.id ? '#00ff41' : '#1a3d1a'}`, borderRadius: '10px', padding: '1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#00ff41', fontWeight: 700, fontSize: '1.1rem' }}>{numeroRemolque(r.numero)}</span>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button onClick={(e) => { e.stopPropagation(); setRemolqueEditando(r); setFormRemolque({ numero: r.numero, categoria: r.categoria || 'Caja Seca' }); setShowRemolqueModal(true); }} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.9rem' }}>✏️</button>
                            <button onClick={(e) => { e.stopPropagation(); eliminarRemolque(r.id); }} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#f59e0b', textTransform: 'uppercase' }}>{r.categoria || 'Caja Seca'}</div>
                        {Number(r.resguardo) === 1 && (
                          <div style={{ fontSize: '0.72rem', color: '#f59e0b', background: '#1a1100', padding: '0.2rem 0.5rem', borderRadius: '6px', alignSelf: 'flex-start' }}>
                            En resguardo{r.fecha_cita ? ` · cita: ${new Date(r.fecha_cita).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}` : ''}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <label style={{ fontSize: '0.72rem', color: '#8b5cf6', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={Number(r.resguardo) === 1}
                              onChange={async (e) => { const v = e.target.checked; await setResguardoRemolque(r.id, { resguardo: v, fecha_cita: r.fecha_cita || '' }); }}
                              onClick={ev => ev.stopPropagation()}
                            />
                            Resguardo
                          </label>
                          {Number(r.resguardo) === 1 && (
                            <input
                              type="date"
                              value={(r.fecha_cita || '').slice(0, 10)}
                              onChange={async (e) => { e.stopPropagation(); await setResguardoRemolque(r.id, { resguardo: true, fecha_cita: e.target.value }); }}
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid #444', borderRadius: '6px', background: '#111', color: '#e0e0e0' }}
                            />
                          )}
                        </div>
                        {r.temperatura?.returnC != null && (
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: tempColor(r.temperatura) }}>
                            Temperatura: {r.temperatura.returnC}°C · ajuste {r.temperatura.setPointC ?? '—'}°C · {r.temperatura.state || 'Sin estado'}
                          </div>
                        )}
                        {(() => {
                          const ubic = ubicacionRemolque(r);
                          if (ubic.libre) {
                            return (
                              <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700, background: '#0a2a1a', padding: '0.3rem 0.6rem', borderRadius: '6px', display: 'inline-block', alignSelf: 'flex-start' }}>
                                ✓ Disponible
                              </div>
                            );
                          }
                          const unidadLabel = (String(r.tipo_asignacion || '').toLowerCase() === 'full' || r.grupo_full) && obtenerMiembrosFull(r).length > 1
                            ? `FULL: ${obtenerMiembrosFull(r).map(m => numeroRemolque(m.numero)).join(' + ')} · ${ubic.unidad}`
                            : `🚛 ${ubic.unidad}`;
                          const estadoColor = !ubic.online ? '#ef4444' : ubic.enMovimiento ? '#f59e0b' : '#00ff41';
                          const estadoLabel = !ubic.online ? 'Sin señal' : ubic.enMovimiento ? `En movimiento · ${ubic.velocidad} km/h` : 'Detenida';
                          return (
                            <>
                              <div style={{ fontSize: '0.85rem', color: '#00ff41', background: '#002200', padding: '0.3rem 0.6rem', borderRadius: '6px', display: 'inline-block', alignSelf: 'flex-start' }}>
                                {unidadLabel}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#e0e0e0', lineHeight: 1.4 }}>
                                📍 {ubic.geofence?.nombre || ubic.location?.location || 'Sin ubicación'}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: estadoColor, fontWeight: 700 }}>
                                {estadoLabel}{ubic.lastSeenMin < 999 ? ` · hace ${ubic.lastSeenMin} min` : ''}
                              </div>
                            </>
                          );
                        })()}
                        <button
                          type="button"
                          disabled={Number(r.resguardo) === 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (Number(r.resguardo) === 1) return;
                            if (r.vehicle_id_asignado || r.unidad_asignada) desasignarRemolque(r.id);
                            else abrirRemolqueDashboard(r);
                          }}
                          style={{ ...s.button((r.vehicle_id_asignado || r.unidad_asignada) ? '#ef4444' : '#3b82f6'), marginTop: '0.25rem', width: '100%', opacity: Number(r.resguardo) === 1 ? 0.55 : 1, cursor: Number(r.resguardo) === 1 ? 'default' : 'pointer' }}
                        >
                          {Number(r.resguardo) === 1 ? 'En resguardo' : (r.vehicle_id_asignado || r.unidad_asignada) ? 'Desasignar' : 'Asignar a unidad'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {selectedRemolque && (
              <div style={{ background: '#111', border: '1px solid #1a3d1a', borderRadius: '10px', padding: '1rem' }}>
                {(() => {
                  const remolque = remolques.find(item => item.id === selectedRemolque);
                  if (!remolque) return null;
                  const asignado = remolque.vehicle_id_asignado || remolque.unidad_asignada;
                  const esTanque = String(remolque.categoria || '').toLowerCase() === 'tanque';
                  return (
                    <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #1a3d1a' }}>
                      <h3 style={{ color: '#00ff41', margin: '0 0 0.75rem 0' }}>Asignación de {numeroRemolque(remolque.numero)}</h3>
                      {asignado ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <span style={{ color: '#e0e0e0' }}>
                            {obtenerMiembrosFull(remolque).length > 1 ? `FULL: ${displayRemolque(remolque)}` : numeroRemolque(remolque.numero)} · {remolque.unidad_asignada || remolque.vehicle_id_asignado}
                          </span>
                          <button type="button" onClick={() => desasignarRemolque(remolque.id)} style={s.button('#ef4444')}>Desasignar</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {esTanque && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {['sencillo', 'full'].map(modo => (
                                <button key={modo} type="button" onClick={() => { setRemolqueDashModo(modo); if (modo === 'sencillo') setRemolqueDashSegundoId(''); }} style={{ ...s.button(remolqueDashModo === modo ? '#f59e0b' : '#6b7280'), flex: 1 }}>
                                  {modo === 'full' ? 'Armar Full' : 'Sencillo'}
                                </button>
                              ))}
                            </div>
                          )}
                          <select value={remolqueDashVehicleId} onChange={e => setRemolqueDashVehicleId(e.target.value)} style={s.select}>
                            <option value="">Seleccionar unidad...</option>
                            {vehiculos.map(vehicle => <option key={vehicle.id} value={String(vehicle.id)}>{vehicle.name}</option>)}
                          </select>
                          {remolqueDashModo === 'full' && esTanque && (
                            <select value={remolqueDashSegundoId} onChange={e => setRemolqueDashSegundoId(e.target.value)} style={s.select}>
                              <option value="">Seleccionar segundo tanque...</option>
                              {remolques.filter(item => item.id !== remolque.id && String(item.categoria || '').toLowerCase() === 'tanque' && !item.vehicle_id_asignado).map(item => (
                                <option key={item.id} value={String(item.id)}>{numeroRemolque(item.numero)}</option>
                              ))}
                            </select>
                          )}
                          <button type="button" disabled={remolqueDashSaving} onClick={() => asignarRemolqueDesdeDashboard(remolque)} style={s.button('#10b981')}>
                            {remolqueDashSaving ? 'Asignando...' : remolqueDashModo === 'full' && esTanque ? 'Asignar Full' : 'Asignar remolque'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
                <h3 style={{ color: '#e0e0e0', margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>Historial de asignaciones</h3>
                {historialRemolqueLoading && <div style={{ color: '#6a9b6a' }}>Cargando historial...</div>}
                {historialRemolqueError && <div style={{ color: '#f87171' }}>{historialRemolqueError}</div>}
                {!historialRemolqueLoading && !historialRemolqueError && historialRemolque.length === 0 && <div style={{ color: '#6a9b6a' }}>Sin asignaciones registradas.</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {historialRemolque.map((h, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: h.activa ? '#002200' : '#1a1a1a', borderRadius: '8px', border: `1px solid ${h.activa ? '#00ff4133' : '#333'}` }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ color: h.activa ? '#00ff41' : '#ccc', fontWeight: 600 }}>🚛 {h.vehicle_name || h.vehicle_id}</span>
                        <span style={{ color: '#888', fontSize: '0.8rem' }}>
                          {h.fecha_inicio ? `Inicio: ${parseFecha(h.fecha_inicio).toLocaleDateString('es-MX')}` : ''}
                          {h.fecha_fin ? ` — Fin: ${parseFecha(h.fecha_fin).toLocaleDateString('es-MX')}` : h.activa ? ' — Activa' : ''}
                        </span>
                      </div>
                      {h.activa && (
                        <button onClick={() => desasignarRemolque(h.remolque_id)} style={{ background: '#ff444433', color: '#ff4444', border: '1px solid #ff444455', padding: '0.3rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Desasignar</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>);
}

export function SeguimientoSection({
  abrirActualizarSeguimiento,
  abrirGeneradorMensajes,
  abrirNuevoSeguimiento,
  actualizarGrupoSeguimiento,
  aplicarSeguimientoDesdeUnidad,
  cargarHistorialSeguimiento,
  editarSeguimiento,
  eliminarSeguimiento,
  formSeguimiento,
  geofenceOptions,
  gruposUnicos,
  guardarSeguimiento,
  limpiarSeguimientoForm,
  loadAll,
  parseFecha,
  s,
  seguimientoEditando,
  seguimientoEstados,
  seguimientoEstatusFilter,
  seguimientoFilter,
  seguimientoFiltrado,
  seguimientoFormAvanzado,
  seguimientoGrupoFilter,
  seguimientoHistorial,
  seguimientoHistorialError,
  seguimientoHistorialLoading,
   seguimientoResumen,
   seguimientoUnidadFilter,
   seleccionarUnidadSeguimiento,
   selectedSeguimiento,
  setActiveTab,
  setFormSeguimiento,
  setSeguimientoEstatusFilter,
  setSeguimientoFilter,
  setSeguimientoFormAvanzado,
  setSeguimientoGrupoFilter,
  setSeguimientoHistorial,
  setSeguimientoHistorialError,
  setSeguimientoModalError,
  setSeguimientoModalGrupo,
  setSeguimientoModalNota,
  setSeguimientoModalUnidadId,
  setSeguimientoUnidadFilter,
  setSelectedSeguimiento,
  setShowSeguimientoUpdateModal,
  showSeguimientoForm,
  tdStyle,
  thStyle,
  vehiculos,
}) {
  return (<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ color: '#e0e0e0', margin: 0, fontSize: '1.35rem' }}>Seguimiento Operativo</h2>
                <p style={{ margin: '0.25rem 0 0', color: '#6a9b6a', fontSize: '0.9rem' }}>Actualiza, filtra y revisa el historial por unidad</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={s.badge('#3b82f6')}>{seguimientoResumen.total} registros</span>
                <span style={s.badge('#10b981')}>{seguimientoResumen.activos} activos</span>
                <span style={s.badge('#6b7280')}>{seguimientoResumen.disponibles} disponibles</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {showSeguimientoForm && (
              <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>{seguimientoEditando ? 'Editar seguimiento' : 'Nuevo seguimiento'}</h3>
                    <div style={{ fontSize: '0.8rem', color: '#6a9b6a' }}>Elige la unidad y la mayoría de los datos se llenan solos desde su viaje</div>
                  </div>
                  <button onClick={limpiarSeguimientoForm} style={s.button('#6b7280')}>Cancelar</button>
                </div>
                <form onSubmit={guardarSeguimiento}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={s.label}>Unidad *</label>
                      <select
                        style={s.select}
                        value={vehiculos.find(v => v.name === formSeguimiento.unidad)?.id || ''}
                        onChange={(e) => { aplicarSeguimientoDesdeUnidad(e.target.value); setSeguimientoFormAvanzado(false); }}
                        required
                      >
                        <option value="">Seleccionar unidad...</option>
                        {vehiculos.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={s.label}>Grupo</label>
                      <input style={s.input} list="seguimiento-group-suggestions" value={formSeguimiento.grupo} onChange={e => setFormSeguimiento({ ...formSeguimiento, grupo: e.target.value })} placeholder="Grupo a reportar" />
                    </div>
                  </div>

                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={s.label}>Estatus</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {seguimientoEstados.map(est => {
                        const activo = formSeguimiento.estatus === est;
                        const estColor = est === 'Disponible' ? '#6b7280' : est === 'Programado' ? '#8b5cf6' : est.includes('carga') ? '#f59e0b' : est.includes('descarga') ? '#ec4899' : est === 'En resguardo' ? '#f97316' : '#10b981';
                        return (
                          <button key={est} type="button" onClick={() => setFormSeguimiento({ ...formSeguimiento, estatus: est })}
                            style={{ padding: '0.45rem 0.7rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, background: activo ? estColor : 'transparent', color: activo ? '#0d0d0d' : '#9ca3af', border: activo ? `1px solid ${estColor}` : '1px solid #1f1f1f' }}>
                            {est}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={s.label}>Observación</label>
                    <textarea style={{ ...s.input, minHeight: '70px', resize: 'vertical', fontFamily: 'inherit' }} value={formSeguimiento.comentarios_monitoreo} onChange={e => setFormSeguimiento({ ...formSeguimiento, comentarios_monitoreo: e.target.value })} placeholder="Notas de seguimiento (aparecen en el reporte)" />
                  </div>

                  <div style={{ padding: '0.75rem', background: '#111111', border: '1px solid #1a3d1a', borderRadius: '10px', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.72rem', color: '#4a8a4a', textTransform: 'uppercase', fontWeight: 700 }}>Resumen (auto-llenado del viaje)</span>
                      <button type="button" onClick={() => setSeguimientoFormAvanzado(v => !v)} style={{ background: 'none', border: '1px solid #1a3d1a', color: '#60a5fa', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', padding: '3px 8px' }}>
                        {seguimientoFormAvanzado ? 'Ocultar campos avanzados' : 'Editar campos avanzados'}
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', fontSize: '0.78rem', color: '#c0c0c0' }}>
                      <div>Operador: <strong style={{ color: '#e0e0e0' }}>{formSeguimiento.operador || '—'}</strong></div>
                      <div>Remolque: <strong style={{ color: '#e0e0e0' }}>{formSeguimiento.remolque || '—'}</strong></div>
                      <div>Ruta: <strong style={{ color: '#e0e0e0' }}>{formSeguimiento.ruta || '—'}</strong></div>
                      <div>Origen: <strong style={{ color: '#e0e0e0' }}>{formSeguimiento.origen || '—'}</strong></div>
                      <div>Destino: <strong style={{ color: '#e0e0e0' }}>{formSeguimiento.destino || '—'}</strong></div>
                      <div>Cita carga: <strong style={{ color: '#e0e0e0' }}>{formSeguimiento.cita_carga || '—'}</strong></div>
                      <div>Cita descarga: <strong style={{ color: '#e0e0e0' }}>{formSeguimiento.cita_descarga || '—'}</strong></div>
                      <div>Hora llegada: <strong style={{ color: '#e0e0e0' }}>{formSeguimiento.hora_llegada || '—'}</strong></div>
                      <div>Hora liberación: <strong style={{ color: '#e0e0e0' }}>{formSeguimiento.hora_liberacion || '—'}</strong></div>
                      <div>Comentarios cliente: <strong style={{ color: '#e0e0e0' }}>{formSeguimiento.comentarios_cliente || '—'}</strong></div>
                    </div>
                    {seguimientoFormAvanzado && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #1a3d1a' }}>
                        <div>
                          <label style={s.label}>Operador</label>
                          <input style={s.input} value={formSeguimiento.operador} onChange={e => setFormSeguimiento({ ...formSeguimiento, operador: e.target.value })} placeholder="Operador" />
                        </div>
                        <div>
                          <label style={s.label}>Remolque</label>
                          <input style={s.input} value={formSeguimiento.remolque} onChange={e => setFormSeguimiento({ ...formSeguimiento, remolque: e.target.value })} placeholder="Remolque" />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={s.label}>Ruta</label>
                          <input style={s.input} value={formSeguimiento.ruta} onChange={e => setFormSeguimiento({ ...formSeguimiento, ruta: e.target.value })} placeholder="Ruta o referencia" />
                        </div>
                        <div>
                          <label style={s.label}>Origen</label>
                          <select style={s.select} value={formSeguimiento.origen} onChange={e => setFormSeguimiento({ ...formSeguimiento, origen: e.target.value })}>{geofenceOptions(formSeguimiento.origen)}</select>
                        </div>
                        <div>
                          <label style={s.label}>Destino</label>
                          <select style={s.select} value={formSeguimiento.destino} onChange={e => setFormSeguimiento({ ...formSeguimiento, destino: e.target.value })}>{geofenceOptions(formSeguimiento.destino)}</select>
                        </div>
                        <div>
                          <label style={s.label}>Cita carga</label>
                          <input style={s.input} value={formSeguimiento.cita_carga} onChange={e => setFormSeguimiento({ ...formSeguimiento, cita_carga: e.target.value })} placeholder="Fecha / hora" />
                        </div>
                        <div>
                          <label style={s.label}>Cita descarga</label>
                          <input style={s.input} value={formSeguimiento.cita_descarga} onChange={e => setFormSeguimiento({ ...formSeguimiento, cita_descarga: e.target.value })} placeholder="Fecha / hora" />
                        </div>
                        <div>
                          <label style={s.label}>Hora llegada</label>
                          <input style={s.input} value={formSeguimiento.hora_llegada} onChange={e => setFormSeguimiento({ ...formSeguimiento, hora_llegada: e.target.value })} placeholder="Llegada con el cliente" />
                        </div>
                        <div>
                          <label style={s.label}>Hora liberación</label>
                          <input style={s.input} value={formSeguimiento.hora_liberacion} onChange={e => setFormSeguimiento({ ...formSeguimiento, hora_liberacion: e.target.value })} placeholder="Salida de la geocerca" />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={s.label}>Comentarios cliente</label>
                          <textarea style={{ ...s.input, minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }} value={formSeguimiento.comentarios_cliente} onChange={e => setFormSeguimiento({ ...formSeguimiento, comentarios_cliente: e.target.value })} placeholder="Observaciones del cliente" />
                        </div>
                      </div>
                    )}
                  </div>

                  <button type="submit" style={{ ...s.button('#10b981'), width: '100%' }}>{seguimientoEditando ? 'Guardar cambios' : 'Guardar seguimiento'}</button>
                </form>
              </div>
              )}

              <div style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#4a8a4a', fontSize: '0.8rem' }}>🔍</span>
                      <input
                        placeholder="Buscar unidad, ruta, operador..."
                        value={seguimientoFilter}
                        onChange={e => setSeguimientoFilter(e.target.value)}
                        style={{ padding: '0.45rem 0.75rem 0.45rem 1.8rem', border: '1px solid #1a3d1a', borderRadius: '8px', fontSize: '0.8rem', background: '#ffffff', color: '#000', width: '220px' }}
                      />
                    </div>
                    <input
                      placeholder="Filtrar unidad"
                      value={seguimientoUnidadFilter}
                      onChange={e => setSeguimientoUnidadFilter(e.target.value)}
                      style={{ ...s.input, width: '150px' }}
                    />
                    <select value={seguimientoEstatusFilter} onChange={e => setSeguimientoEstatusFilter(e.target.value)} style={{ ...s.select, width: '170px' }}>
                      <option value="">Todos los estatus</option>
                      {seguimientoEstados.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <select value={seguimientoGrupoFilter} onChange={e => setSeguimientoGrupoFilter(e.target.value)} style={{ ...s.select, width: '160px' }}>
                      <option value="">Todos los grupos</option>
                      {gruposUnicos.map(grupo => <option key={grupo} value={grupo}>{grupo}</option>)}
                    </select>
                    <button onClick={() => { setSeguimientoFilter(''); setSeguimientoUnidadFilter(''); setSeguimientoEstatusFilter(''); setSeguimientoGrupoFilter(''); }} style={s.button('#6b7280')}>Limpiar</button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={abrirNuevoSeguimiento} style={s.button('#00ff41')}>+ Agregar</button>
                    <button onClick={abrirActualizarSeguimiento} style={s.button('#10b981')}>Actualizar Seguimiento</button>
                    <button onClick={abrirGeneradorMensajes} style={s.button('#8b5cf6')}>📲 Generar Mensaje</button>
                  </div>
                </div>

                <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 360px)', borderRadius: '8px', border: '1px solid #0f2410' }}>
                  <table className="seg-table" style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ background: '#0d1a0d', position: 'sticky', top: 0, zIndex: 2 }}>
                        <th style={{ ...thStyle, width: '44px', textAlign: 'center' }}>#</th>
                        <th style={{ ...thStyle, width: '120px' }}>Unidad</th>
                        <th style={{ ...thStyle, width: '110px' }}>Grupo</th>
                        <th style={{ ...thStyle, width: '100px' }}>Remolque</th>
                        <th style={{ ...thStyle, width: '120px' }}>Operador</th>
                        <th style={{ ...thStyle, width: '130px' }}>Origen</th>
                        <th style={{ ...thStyle, width: '130px' }}>Destino</th>
                        <th style={{ ...thStyle, width: '140px' }}>Cita carga</th>
                        <th style={{ ...thStyle, width: '140px' }}>Cita descarga</th>
                        <th style={{ ...thStyle, width: '150px' }}>Llegada con cliente</th>
                        <th style={{ ...thStyle, width: '150px' }}>Liberación</th>
                        <th style={{ ...thStyle, width: '120px' }}>Estatus</th>
                        <th style={{ ...thStyle, width: '220px' }}>Viaje</th>
                        <th style={{ ...thStyle, width: '260px' }}>Observaciones</th>
                        <th style={{ ...thStyle, width: '130px' }}>Actualizado</th>
                        <th style={{ ...thStyle, width: '170px', textAlign: 'center' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seguimientoFiltrado.length === 0 ? (
                        <tr>
                          <td colSpan={15} style={{ padding: '1.5rem', textAlign: 'center', color: '#6a9b6a' }}>No hay registros con estos filtros.</td>
                        </tr>
                      ) : seguimientoFiltrado.map((row, idx) => {
                        const estatus = String(row.estatus || 'Disponible');
                        const estatusColor = estatus === 'Disponible' ? '#6b7280' : estatus === 'Programado' ? '#8b5cf6' : estatus.includes('carga') ? '#f59e0b' : estatus.includes('descarga') ? '#ec4899' : estatus === 'En resguardo' ? '#f97316' : '#10b981';
                        const rowBg = idx % 2 === 0 ? '#0d0d0d' : '#111111';
                        const observaciones = row.comentarios_cliente || row.comentarios_monitoreo || '-';
                        const viajeActual = row._viajeActual || null;
                        const viajeSiguiente = row._viajeSiguiente || null;
                        const esAuto = !!row._auto;
                        return (
                          <tr key={esAuto ? `auto-${row._unidadObj?.id || row.unidad}` : row.id} style={{ background: selectedSeguimiento?.id === row.id ? '#102010' : rowBg, borderBottom: '1px solid #1a1a1a' }}>
                            <td style={{ ...tdStyle, textAlign: 'center', color: '#4a8a4a', fontSize: '0.7rem' }}>{idx + 1}</td>
                            <td style={{ ...tdStyle, fontWeight: 700, color: '#00ff41' }}>{row.unidad || '-'}</td>
                            <td style={tdStyle}>
                              {esAuto ? (
                                <span style={{ color: '#6a9b6a', fontSize: '0.78rem' }}>{row.grupo || 'Sin registro'}</span>
                              ) : (
                                <select
                                  aria-label={`Grupo de ${row.unidad || 'unidad'}`}
                                  value={row.grupo || ''}
                                  onChange={(e) => actualizarGrupoSeguimiento(row, e.target.value)}
                                  style={{ ...s.select, width: '150px', padding: '3px 6px', fontSize: '0.72rem' }}
                                >
                                  <option value="">Sin grupo</option>
                                  {gruposUnicos.map(grupo => <option key={grupo} value={grupo}>{grupo}</option>)}
                                </select>
                              )}
                            </td>
                            <td style={tdStyle}>{row.remolque || '-'}</td>
                            <td style={tdStyle}>{row.operador || '-'}</td>
                            <td style={{ ...tdStyle, whiteSpace: 'normal', maxWidth: '160px' }}>{row.origen || '-'}</td>
                            <td style={{ ...tdStyle, whiteSpace: 'normal', maxWidth: '160px' }}>{row.destino || '-'}</td>
                            <td style={{ ...tdStyle, whiteSpace: 'normal', maxWidth: '150px' }}>{row.cita_carga || '-'}</td>
                            <td style={{ ...tdStyle, whiteSpace: 'normal', maxWidth: '150px' }}>{row.cita_descarga || '-'}</td>
                            <td style={{ ...tdStyle, whiteSpace: 'normal', maxWidth: '160px' }}>{row.hora_llegada || '-'}</td>
                            <td style={{ ...tdStyle, whiteSpace: 'normal', maxWidth: '160px' }}>{row.hora_liberacion || '-'}</td>
                            <td style={tdStyle}><span style={s.badge(estatusColor)}>{estatus}</span></td>
                            <td style={{ ...tdStyle, whiteSpace: 'normal', maxWidth: '220px' }}>
                              {viajeActual || viajeSiguiente ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                  {viajeActual && (
                                    <div>
                                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginBottom: '0.15rem', flexWrap: 'wrap' }}>
                                        <span style={s.badge('#10b981')}>Actual</span>
                                        <span style={{ color: '#c0c0c0', fontSize: '0.72rem' }}>{String(viajeActual.estado || '').replace(/_/g, ' ')}</span>
                                      </div>
                                      <div style={{ color: '#e0e0e0', fontSize: '0.72rem' }}>{viajeActual.origen || '-'} → {viajeActual.destino || '-'}</div>
                                    </div>
                                  )}
                                  {viajeSiguiente && (
                                    <div>
                                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginBottom: '0.15rem', flexWrap: 'wrap' }}>
                                        <span style={s.badge('#f59e0b')}>Siguiente</span>
                                        <span style={{ color: '#c0c0c0', fontSize: '0.72rem' }}>{String(viajeSiguiente.estado || '').replace(/_/g, ' ')}</span>
                                      </div>
                                      <div style={{ color: '#a3a3a3', fontSize: '0.72rem' }}>{viajeSiguiente.origen || '-'} → {viajeSiguiente.destino || '-'}</div>
                                    </div>
                                  )}
                                </div>
                              ) : '-'}
                            </td>
                            <td style={{ ...tdStyle, whiteSpace: 'normal', maxWidth: '320px' }}>{observaciones}</td>
                            <td style={tdStyle}>{parseFecha(row.fecha_actualizacion)?.toLocaleString('es-MX') || '-'}</td>
                            <td style={{ ...tdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {esAuto ? (
                                <button onClick={() => { abrirActualizarSeguimiento(); seleccionarUnidadSeguimiento(String(row._unidadObj?.id || '')); }} style={{ background: 'none', border: '1px solid #1a3d1a', color: '#00ff41', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 6px' }}>Actualizar</button>
                              ) : (
                                <>
                                  <button onClick={() => cargarHistorialSeguimiento(row)} style={{ background: 'none', border: '1px solid #1a3d1a', color: '#00ff41', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 6px', marginRight: '0.35rem' }}>Historial</button>
                                  <button onClick={() => editarSeguimiento(row)} style={{ background: 'none', border: '1px solid #1a3d1a', color: '#60a5fa', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 6px', marginRight: '0.35rem' }}>Editar</button>
                                  <button onClick={() => eliminarSeguimiento(row.id)} style={{ background: 'none', border: '1px solid #3a1a1a', color: '#ef4444', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 6px' }}>✕</button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {selectedSeguimiento && (
              <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Historial de {selectedSeguimiento.unidad}</h3>
                    <div style={{ color: '#6a9b6a', fontSize: '0.8rem' }}>{selectedSeguimiento.origen || '-'} → {selectedSeguimiento.destino || '-'}</div>
                  </div>
                  <button onClick={() => { setSelectedSeguimiento(null); setSeguimientoHistorial([]); setSeguimientoHistorialError(''); }} style={s.button('#6b7280')}>Cerrar</button>
                </div>
                {seguimientoHistorialLoading ? (
                  <div style={{ color: '#6a9b6a' }}>Cargando historial...</div>
                ) : seguimientoHistorialError ? (
                  <div style={{ color: '#f87171' }}>{seguimientoHistorialError}</div>
                ) : seguimientoHistorial.length === 0 ? (
                  <div style={{ color: '#6a9b6a' }}>No hay cambios registrados para este seguimiento.</div>
                ) : (
                  <div style={{ overflow: 'auto' }}>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          <th style={s.th}>Campo</th>
                          <th style={s.th}>Anterior</th>
                          <th style={s.th}>Nuevo</th>
                          <th style={s.th}>Usuario</th>
                          <th style={s.th}>Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {seguimientoHistorial.map(item => (
                          <tr key={item.id}>
                            <td style={s.td}>{item.campo}</td>
                            <td style={s.td}>{item.valor_anterior || '-'}</td>
                            <td style={s.td}>{item.valor_nuevo || '-'}</td>
                            <td style={s.td}>{item.usuario || 'Sistema'}</td>
                            <td style={s.td}>{parseFecha(item.fecha_cambio)?.toLocaleString('es-MX') || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={loadAll} style={s.button()}>Actualizar</button>
            </div>
          </div>);
}

export function GeocercasSection({
  allGeofences,
  busquedaGeofence,
  crearGeofence,
  customRiskZones,
  defaultZonesList,
  eliminarGeofence,
  eliminarZonaRiesgo,
  formGeofence,
  geofenceCat,
  geofenceCategories,
  geofenceEvents,
  geofenceHistoryError,
  geofenceHistoryLoading,
  geofences,
  handleZonePlaced,
  loadAll,
  parseFecha,
  placingZone,
  renombrarGeofence,
  s,
  selectedGeofenceHistory,
  setBusquedaGeofence,
  setFormGeofence,
  setGeofenceCat,
  setPlacingZone,
  showGeofenceHistoryPanel,
  toggleGeofence,
  toggleGeofencesBulk,
  vehiculos,
  verHistorialGeneralGeocercas,
  verHistorialGeocerca,
}) {
  const [renombrandoId, setRenombrandoId] = useState(null);
  const [renombrandoNombre, setRenombrandoNombre] = useState('');
  return (<div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Catálogo de Geocercas</h2>
                <p style={{ margin: '0.25rem 0 0', color: '#6a9b6a', fontSize: '0.9rem' }}>{allGeofences.filter(g => g.activa).length} activas de {allGeofences.length} totales</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input placeholder="Buscar geocerca..." value={busquedaGeofence} onChange={e => setBusquedaGeofence(e.target.value)} style={{ ...s.input, width: '250px' }} />
                <button onClick={() => toggleGeofencesBulk(geofences.map(g => g.id), 1)} style={s.button('#10b981')}>Activar Todas</button>
                <button onClick={() => toggleGeofencesBulk(geofences.map(g => g.id), 0)} style={s.button('#ef4444')}>Desactivar Todas</button>
                <button onClick={loadAll} style={s.button()}>Actualizar</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              {geofenceCategories.map(cat => {
                const count = cat.key === 'todas' ? allGeofences.length : allGeofences.filter(g => g.categoria === cat.key).length;
                const activeCount = cat.key === 'todas' ? allGeofences.filter(g => g.activa).length : allGeofences.filter(g => g.categoria === cat.key && g.activa).length;
                return (
                  <button key={cat.key} onClick={() => setGeofenceCat(cat.key)}
                    style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: geofenceCat === cat.key ? '2px solid #00ff41' : '1px solid #1a3d1a', background: geofenceCat === cat.key ? '#0d2b0d' : '#0a150a', color: geofenceCat === cat.key ? '#00ff41' : '#6a9b6a', cursor: 'pointer', fontSize: '0.85rem', fontWeight: geofenceCat === cat.key ? '600' : '400', transition: 'all 0.2s' }}>
                    {cat.icon} {cat.label} <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>({activeCount}/{count})</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '1.5rem' }}>
              <div style={s.card}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Nueva Geocerca</h3>
                <form onSubmit={crearGeofence}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={s.label}>Nombre *</label>
                    <input style={s.input} placeholder="Ej: Planta GERS Chihuahua" value={formGeofence.nombre} onChange={e => setFormGeofence({...formGeofence, nombre: e.target.value})} required />
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={s.label}>Dirección</label>
                    <input style={s.input} placeholder="Escribe una dirección para geocodificar" value={formGeofence.direccion || ''} onChange={e => setFormGeofence({...formGeofence, direccion: e.target.value})} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={s.label}>Latitud *</label>
                      <input style={s.input} type="number" step="any" placeholder="28.6353" value={formGeofence.latitud} onChange={e => setFormGeofence({...formGeofence, latitud: e.target.value})} />
                    </div>
                    <div>
                      <label style={s.label}>Longitud *</label>
                      <input style={s.input} type="number" step="any" placeholder="-106.0889" value={formGeofence.longitud} onChange={e => setFormGeofence({...formGeofence, longitud: e.target.value})} />
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
                  {allGeofences
                    .filter(g => geofenceCat === 'todas' || g.categoria === geofenceCat)
                    .filter(g => !busquedaGeofence.trim() || g.nombre.toLowerCase().includes(busquedaGeofence.toLowerCase()) || (g.descripcion && g.descripcion.toLowerCase().includes(busquedaGeofence.toLowerCase())))
                    .sort((a, b) => (b.activa - a.activa) || a.nombre.localeCompare(b.nombre))
                    .map(g => (
                    <div key={g.id} style={{ padding: '0.75rem', border: g.activa ? '1px solid #1a3d1a' : '1px solid #0d120d', borderRadius: '10px', background: g.activa ? '#0a1a0a' : '#060d06', opacity: g.activa ? 1 : 0.55, transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: g.color, display: 'inline-block', boxShadow: g.activa ? `0 0 6px ${g.color}` : 'none' }}></span>
                            {renombrandoId === g.id ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
                                <input
                                  autoFocus
                                  value={renombrandoNombre}
                                  onChange={e => setRenombrandoNombre(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') { renombrarGeofence(g.id, renombrandoNombre); setRenombrandoId(null); } if (e.key === 'Escape') setRenombrandoId(null); }}
                                  style={{ ...s.input, flex: 1, minWidth: 0, padding: '4px 8px', fontSize: '0.85rem' }}
                                />
                                <button onClick={() => { renombrarGeofence(g.id, renombrandoNombre); setRenombrandoId(null); }} style={{ background: 'none', border: '1px solid #10b981', color: '#10b981', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>✓</button>
                                <button onClick={() => setRenombrandoId(null)} style={{ background: 'none', border: '1px solid #6b7280', color: '#6b7280', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>✕</button>
                              </span>
                            ) : (
                              <span style={{ flex: 1, minWidth: 0 }}>
                                {g.nombre}
                                {g.source !== 'samsara' && (
                                  <button onClick={() => { setRenombrandoId(g.id); setRenombrandoNombre(g.nombre); }} title="Renombrar geocerca" style={{ background: 'none', border: 'none', color: '#6a9b6a', cursor: 'pointer', fontSize: '0.8rem', marginLeft: '0.4rem', padding: '0 2px' }}>✎</button>
                                )}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#4a8a4a', marginTop: '0.2rem' }}>
                            {g.latitud.toFixed(5)}, {g.longitud.toFixed(5)} · {g.radio_metros}m
                          </div>
                          {g.descripcion && <div style={{ fontSize: '0.78rem', color: '#6a9b6a', marginTop: '0.25rem' }}>{g.descripcion}</div>}
                          <div style={{ fontSize: '0.65rem', color: g.source === 'samsara' ? '#8b5cf6' : '#3a6a3a', marginTop: '0.2rem', textTransform: 'uppercase' }}>{g.source === 'samsara' ? 'samsara' : g.categoria || 'custom'}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.35rem', marginLeft: '0.5rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button onClick={() => verHistorialGeocerca(g)} style={{ background: 'none', border: '1px solid #1a3d1a', color: '#00ff41', cursor: 'pointer', fontSize: '0.8rem', padding: '2px 6px', borderRadius: '4px' }}>Historial</button>
                        </div>
                        {g.source !== 'samsara' ? (
                        <div style={{ display: 'flex', gap: '0.35rem', marginLeft: '0.5rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button onClick={() => toggleGeofence(g.id, g.activa)}
                            style={{ width: '36px', height: '20px', borderRadius: '10px', border: 'none', cursor: 'pointer', position: 'relative', background: g.activa ? '#10b981' : '#374151', transition: 'background 0.2s' }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: g.activa ? '18px' : '2px', transition: 'left 0.2s' }}></div>
                          </button>
                          <button onClick={() => eliminarGeofence(g.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', padding: '2px 4px' }}>✕</button>
                        </div>
                        ) : (
                        <div style={{ marginLeft: '0.5rem', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.65rem', color: '#8b5cf6', padding: '2px 8px', borderRadius: '4px', background: 'rgba(139,92,246,0.15)' }}>Sync Samsara</span>
                        </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ ...s.card, marginTop: '1.5rem', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>⚠️ Zonas de peligro</h3>
                  <div style={{ color: '#6a9b6a', fontSize: '0.8rem', marginTop: '0.25rem' }}>{customRiskZones.length} propias · {defaultZonesList.length} predefinidas de México</div>
                </div>
                <button onClick={() => setPlacingZone(prev => !prev)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: placingZone ? '1px solid #ef4444' : '1px dashed #f87171', background: placingZone ? '#7f1d1d' : 'transparent', color: '#f87171', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  {placingZone ? '✕ Cancelar colocación' : '➕ Agregar zona (clic en el mapa)'}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                {placingZone && (
                  <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(10px)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', color: '#e0e0e0', zIndex: 1000, border: '1px solid #f87171', pointerEvents: 'none' }}>
                    🎯 Haz clic en el mapa para colocar la zona de riesgo
                  </div>
                )}
                <div style={{ height: '420px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #1a3d1a' }}>
                  <MapaUnidades vehiculos={vehiculos} geofences={allGeofences} customRiskZones={customRiskZones} placingZone={placingZone} onZonePlaced={handleZonePlaced} />
                </div>
              </div>
              <div style={{ marginTop: '1rem' }}>
                {customRiskZones.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.6rem' }}>
                    {customRiskZones.map(z => {
                      const zColor = { critical: '#f87171', high: '#fb923c', medium: '#facc15' }[z.severity] || '#fb923c';
                      const zLabel = { critical: 'Crítica', high: 'Alta', medium: 'Media' }[z.severity];
                      return (
                        <div key={z.id} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px', borderLeft: `3px solid ${zColor}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, fontSize: '12px', color: '#e0e0e0' }}>{z.name}</span>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span style={{ padding: '2px 6px', borderRadius: 10, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: `${zColor}15`, color: zColor }}>{zLabel}</span>
                              <button onClick={() => eliminarZonaRiesgo(z.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                            </div>
                          </div>
                          <div style={{ fontSize: '10px', color: '#4a8a4a', marginTop: 2 }}>{z.description || 'Sin descripción'}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: '#6a9b6a' }}>Aún no hay zonas propias. Presiona &quot;Agregar zona&quot; y haz clic en el mapa para crear una.</div>
                )}
              </div>
            </div>

            {showGeofenceHistoryPanel && (
              <div style={{ ...s.card, marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>
                    {selectedGeofenceHistory ? `Historial de ${selectedGeofenceHistory.nombre}` : 'Historial de Eventos'} ({geofenceEvents.length})
                  </h3>
                  {selectedGeofenceHistory && <button onClick={verHistorialGeneralGeocercas} style={s.button('#6b7280')}>Ver general</button>}
                </div>
                {geofenceHistoryLoading ? (
                  <div style={{ padding: '1rem', color: '#6a9b6a' }}>Cargando historial...</div>
                ) : geofenceHistoryError ? (
                  <div style={{ padding: '1rem', color: '#f87171' }}>{geofenceHistoryError}</div>
                ) : geofenceEvents.length === 0 ? (
                  <div style={{ padding: '1rem', color: '#6a9b6a' }}>No hay eventos para esta geocerca.</div>
                ) : (
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Unidad</th>
                      <th style={s.th}>Geocerca</th>
                      <th style={s.th}>Evento</th>
                      <th style={s.th}>Origen</th>
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
                        <td style={s.td}>{ev.source === 'samsara' ? 'Samsara' : 'Local'}</td>
                        <td style={s.td}>{parseFecha(ev.created_at)?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                )}
              </div>
            )}
          </div>);
}

export function MapasSection({
  detectarMapasLinks,
  eliminarMapa,
  googleMyMapsEmbedUrl,
  googleUrlSeguro,
  guardarMapaDetectado,
  mapaUrl,
  mapas,
  mapasError,
  refreshMapas,
  s,
  selectedMapa,
  setSelectedMapa,
}) {
  const [mapaBusqueda, setMapaBusqueda] = useState('');
  const [importLinks, setImportLinks] = useState('');
  const [importDetectando, setImportDetectando] = useState(false);
  const [importGuardando, setImportGuardando] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importSaveError, setImportSaveError] = useState('');
  const [importSaveOk, setImportSaveOk] = useState('');
  const [importDetectados, setImportDetectados] = useState([]);
  const importErrorCount = Array.isArray(importResult?.errores) ? importResult.errores.length : 0;
  const importGeocercasCreadas = [...new Set((importResult?.mapas || []).flatMap(m => m.geocercas_creadas || []))];
  const importDuplicados = importResult?.duplicados || [];
  const normalizarBusqueda = value => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const mapasFiltrados = normalizarBusqueda(mapaBusqueda)
    ? mapas.filter(mapa => [mapa.nombre, mapa.origen, mapa.destino, ...parseDestinos(mapa.destinos_json || mapa.destinos)]
        .some(campo => normalizarBusqueda(campo).includes(normalizarBusqueda(mapaBusqueda))))
    : mapas;
  const detectarRutas = async () => {
    const urls = importLinks.split(/\r?\n|,/).map(u => u.trim()).filter(Boolean);
    if (!urls.length) return;
    setImportDetectando(true);
    setImportGuardando(false);
    setImportSaveError('');
    setImportSaveOk('');
    setImportResult(null);
    setImportDetectados([]);
    try {
      const result = await detectarMapasLinks(urls);
      setImportResult(result);
      if (result.errores?.length && !result.mapas?.length) {
        setImportSaveError(result.errores.map(e => e.error || 'No se pudo procesar').join(' '));
        return;
      }
      const mapasDetectados = (result.mapas || []).map((mapa, index) => ({
        ...mapa,
        key: `${Date.now()}-${index}`,
        destinosEdit: mapa.tipo_entrega === 'reparto' ? parseDestinos(mapa.destinos) : [],
      }));
      if (!mapasDetectados.length) {
        const dupMsg = importDuplicados.length ? ` ${importDuplicados.length} ruta(s) ya estaban guardadas.` : '';
        setImportSaveOk(`No se detectaron rutas nuevas.${dupMsg}`);
        return;
      }
      setImportDetectados(mapasDetectados);
    } catch (err) {
      setImportSaveError(err.message || 'No se pudieron detectar los links');
    } finally {
      setImportDetectando(false);
    }
  };
  const actualizarDetectado = (key, cambios) => {
    setImportDetectados(prev => prev.map(item => item.key === key ? { ...item, ...cambios } : item));
  };
  const cambiarTipoDetectado = (key, tipo) => {
    setImportDetectados(prev => prev.map(item => {
      if (item.key !== key || item.tipo_entrega === tipo) return item;
      if (tipo === 'reparto') {
        const actuales = item.destinosEdit.length ? item.destinosEdit : [item.destino].filter(Boolean);
        const destinosEdit = [...actuales];
        while (destinosEdit.length < 2) destinosEdit.push('');
        return { ...item, tipo_entrega: 'reparto', destinosEdit };
      }
      const ultimo = item.destinosEdit[item.destinosEdit.length - 1] || '';
      return { ...item, tipo_entrega: 'directo', destino: ultimo || item.destino || '', destinosEdit: [] };
    }));
  };
  const quitarDetectado = (key) => {
    setImportDetectados(prev => prev.filter(item => item.key !== key));
  };
  const guardarDetectadas = async () => {
    if (!importDetectados.length) return;
    setImportGuardando(true);
    setImportSaveError('');
    setImportSaveOk('');
    const total = importDetectados.length;
    let ok = 0;
    const fallos = [];
    const resultados = await Promise.allSettled(
      importDetectados.map(mapa => guardarMapaDetectado({
        ...mapa,
        destino: mapa.tipo_entrega === 'reparto' ? (mapa.destinosEdit[mapa.destinosEdit.length - 1] || '') : mapa.destino,
        destinos: mapa.tipo_entrega === 'reparto' ? mapa.destinosEdit : (String(mapa.destino || '').trim() ? [mapa.destino] : []),
      }))
    );
    resultados.forEach((res, i) => {
      if (res.status === 'fulfilled') {
        ok += 1;
      } else {
        const err = res.reason;
        fallos.push({ nombre: importDetectados[i]?.nombre || `ruta ${i + 1}`, error: (err && err.message) || 'No se pudo guardar' });
      }
    });
    await refreshMapas();
    if (fallos.length === 0) {
      const geo = importGeocercasCreadas.length ? ` · ${importGeocercasCreadas.length} geocerca(s) creada(s)` : '';
      const dup = importDuplicados.length ? `. ${importDuplicados.length} ruta(s) ya estaban guardadas` : '';
      setImportSaveOk(`Se guardaron ${ok} ruta(s)${geo}${dup}.`);
      setImportDetectados([]);
      setImportLinks('');
    } else {
      setImportSaveError(`Guardadas ${ok} de ${total} rutas. Falló: ${fallos.map(f => `'${f.nombre}': ${f.error}`).join('; ')}`);
    }
    setImportGuardando(false);
  };
  const copiarTexto = async (texto) => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(texto);
        return true;
      } catch {}
    }
    const textarea = document.createElement('textarea');
    textarea.value = texto;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {}
    document.body.removeChild(textarea);
    return ok;
  };
  return (<div className="mapas-page">
            <div className="mapas-header">
              <div>
                <h2>Mapas</h2>
                <p>Rutas operativas guardadas en Google My Maps</p>
              </div>
              <button type="button" onClick={() => refreshMapas()} style={s.button()}>Actualizar</button>
            </div>

            {mapasError && <div className="mapas-error" role="alert">{mapasError}</div>}

            <div className="mapas-layout">
              <aside className="mapas-sidebar">
                <div className="mapas-import-card">
                  <h3>Importar rutas</h3>
                  <p className="mapas-import-hint">Pega links de Google My Maps (uno por línea). Se detecta origen, destino y paradas; podrás revisarlos y editarlos antes de guardar.</p>
                  <label>
                    <span>Links de Google My Maps</span>
                    <textarea rows="4" value={importLinks} onChange={e => setImportLinks(e.target.value)} placeholder={"https://www.google.com/maps/d/viewer?mid=...\nhttps://www.google.com/maps/d/viewer?mid=..."} />
                  </label>
                  <button type="button" disabled={importDetectando || !importLinks.trim()} onClick={detectarRutas} style={s.button()}>{importDetectando ? 'Detectando...' : 'Detectar rutas'}</button>
                  {importDetectados.length > 0 && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4a8a4a', textTransform: 'uppercase' }}>Rutas detectadas ({importDetectados.length})</span>
                        <button type="button" onClick={() => setImportDetectados([])} style={{ ...s.button('#ef4444'), padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}>Descartar todo</button>
                      </div>
                      {importDetectados.map(mapa => (
                        <div key={mapa.key} style={{ border: '1px solid #1a3d1a', borderRadius: '8px', padding: '0.55rem', background: '#111', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              {[{ v: 'directo', label: 'Directo', color: '#3b82f6' }, { v: 'reparto', label: 'Reparto', color: '#f59e0b' }].map(opt => (
                                <button key={opt.v} type="button" onClick={() => cambiarTipoDetectado(mapa.key, opt.v)}
                                  style={mapa.tipo_entrega === opt.v
                                    ? { ...s.badge(opt.color), border: `1px solid ${opt.color}`, cursor: 'pointer' }
                                    : { ...s.badge('#4b5563'), cursor: 'pointer', opacity: 0.65 }}>
                                  {opt.label}{opt.v === 'reparto' && mapa.tipo_entrega === 'reparto' ? ` · ${mapa.destinosEdit.length}` : ''}
                                </button>
                              ))}
                            </div>
                            <button type="button" onClick={() => quitarDetectado(mapa.key)} title="Quitar de esta importación" style={{ ...s.button('#ef4444'), padding: '0.15rem 0.45rem', fontSize: '0.65rem' }}>✕ Quitar</button>
                          </div>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <span style={{ fontSize: '0.62rem', color: '#4a8a4a', textTransform: 'uppercase' }}>Nombre</span>
                            <input value={mapa.nombre} onChange={e => actualizarDetectado(mapa.key, { nombre: e.target.value })} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <span style={{ fontSize: '0.62rem', color: '#4a8a4a', textTransform: 'uppercase' }}>Origen</span>
                            <input value={mapa.origen} onChange={e => actualizarDetectado(mapa.key, { origen: e.target.value })} />
                          </label>
                          {mapa.tipo_entrega === 'reparto' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                              <span style={{ fontSize: '0.62rem', color: '#4a8a4a', textTransform: 'uppercase' }}>Destinos / paradas</span>
                              {mapa.destinosEdit.map((destino, idx) => (
                                <div key={`${mapa.key}-dest-${idx}`} style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', minWidth: '1rem' }}>{idx + 1}.</span>
                                  <input value={destino} onChange={e => actualizarDetectado(mapa.key, { destinosEdit: mapa.destinosEdit.map((d, i) => i === idx ? e.target.value : d) }) } />
                                  <button type="button" onClick={() => actualizarDetectado(mapa.key, { destinosEdit: mapa.destinosEdit.filter((_, i) => i !== idx) })} title="Eliminar parada" style={{ ...s.button('#ef4444'), padding: '0.15rem 0.4rem', fontSize: '0.65rem' }}>✕</button>
                                </div>
                              ))}
                              <button type="button" onClick={() => actualizarDetectado(mapa.key, { destinosEdit: [...mapa.destinosEdit, ''] })} style={{ ...s.button('#10b981'), padding: '0.25rem 0.5rem', fontSize: '0.68rem' }}>+ Agregar parada</button>
                            </div>
                          ) : (
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              <span style={{ fontSize: '0.62rem', color: '#4a8a4a', textTransform: 'uppercase' }}>Destino</span>
                              <input value={mapa.destino || ''} onChange={e => actualizarDetectado(mapa.key, { destino: e.target.value })} />
                            </label>
                          )}
                          {(mapa.geocercas_creadas || []).length > 0 && (
                            <span style={{ fontSize: '0.62rem', color: '#6a9b6a' }}>📍 Geocercas: {mapa.geocercas_creadas.join(', ')}</span>
                          )}
                        </div>
                      ))}
                      <button type="button" disabled={importGuardando} onClick={guardarDetectadas} style={s.button()}>{importGuardando ? 'Guardando...' : `Guardar ${importDetectados.length} ruta(s)`}</button>
                    </div>
                  )}
                  {importGeocercasCreadas.length > 0 && (
                    <p className="mapas-import-created">📍 Geocercas nuevas: {importGeocercasCreadas.join(', ')}</p>
                  )}
                  {importDuplicados.length > 0 && (
                    <p className="mapas-import-ok">ℹ️ {importDuplicados.length} ruta(s) ya estaban guardadas: {importDuplicados.map(m => m.nombre).join(', ')}</p>
                  )}
                  {importResult && importErrorCount > 0 && (
                    <p className="mapas-import-errors">⚠️ No se pudo procesar: {importResult.errores.map(e => e.url).join(', ')}</p>
                  )}
                  {importSaveOk && <p className="mapas-import-ok" role="status">{importSaveOk}</p>}
                  {importSaveError && <p className="mapas-import-error" role="alert">{importSaveError}</p>}
                </div>
              </aside>

              <section className="mapas-viewer">
                {!selectedMapa ? (
                  <div className="mapas-viewer-empty">
                    <span>🗺️</span>
                    <p>Selecciona un mapa para visualizarlo.</p>
                  </div>
                ) : (() => {
                  const urlSegura = googleUrlSeguro(mapaUrl(selectedMapa));
                  const embedUrl = googleMyMapsEmbedUrl(urlSegura);
                  return (
                    <>
                      <div className="mapas-viewer-header">
                        <div>
                          <h3>{selectedMapa.nombre}{selectedMapa.tipo_entrega === 'reparto' && <span className="trip-reparto-badge">Reparto</span>}</h3>
                          {selectedMapa.tipo_entrega === 'reparto' ? (
                            <p>{selectedMapa.origen || 'Origen sin definir'} → {parseDestinos(selectedMapa.destinos_json || selectedMapa.destinos).length} paradas</p>
                          ) : (
                            <p>{selectedMapa.origen || 'Origen sin definir'} → {selectedMapa.destino || 'Destino sin definir'}</p>
                          )}
                        </div>
                        <div className="mapas-viewer-actions">
                          {urlSegura && <a href={urlSegura} target="_blank" rel="noopener noreferrer">Abrir en Google</a>}
                          {urlSegura && (
                            <button type="button" className="mapas-share-btn" onClick={async () => {
                              const ok = await copiarTexto(urlSegura);
                              alert(ok ? 'Link copiado al portapapeles' : 'No se pudo copiar el link');
                            }}>Compartir</button>
                          )}
                        </div>
                      </div>
                      {selectedMapa.descripcion && <div className="mapas-viewer-description">{selectedMapa.descripcion}</div>}
                      {embedUrl ? (
                        <div className="mapas-iframe-wrap">
                          <iframe src={embedUrl} title={`Mapa ${selectedMapa.nombre}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
                        </div>
                      ) : (
                        <div className="mapas-not-embeddable">
                          <strong>Este enlace no se puede incrustar.</strong>
                          <p>Abre el mapa en Google o edítalo y pega una URL de Google My Maps que incluya el parámetro mid.</p>
                          {urlSegura && <a href={urlSegura} target="_blank" rel="noopener noreferrer">Abrir enlace en Google</a>}
                        </div>
                      )}
                    </>
                  );
                })()}
              </section>

              <div className="mapas-list-section">
                <div className="mapas-search" role="search">
                  <input
                    type="search"
                    value={mapaBusqueda}
                    onChange={e => setMapaBusqueda(e.target.value)}
                    placeholder="Buscar ruta por nombre, origen o destino..."
                    aria-label="Buscar ruta"
                  />
                </div>

                <div className="mapas-list" aria-label="Mapas guardados">
                  {mapas.length === 0 ? (
                    <div className="mapas-empty">No hay mapas guardados.</div>
                  ) : mapasFiltrados.length === 0 ? (
                    <div className="mapas-empty">No se encontraron rutas para «{mapaBusqueda}».</div>
                  ) : mapasFiltrados.map(mapa => (
                    <article
                      key={mapa.id}
                      className={`mapa-card${String(selectedMapa?.id) === String(mapa.id) ? ' selected' : ''}`}
                      role="button"
                      tabIndex="0"
                      onClick={() => setSelectedMapa(mapa)}
                      onKeyDown={e => activarConTeclado(e, () => setSelectedMapa(mapa))}
                    >
                      <div className="mapa-card-title">{mapa.nombre}{mapa.tipo_entrega === 'reparto' && <span className="trip-reparto-badge">Reparto</span>}</div>
                      {mapa.descripcion && <p>{mapa.descripcion}</p>}
                      <div className="mapa-card-actions">
                        <button type="button" onClick={e => { e.stopPropagation(); eliminarMapa(mapa); }} style={s.button('#ef4444')}>Eliminar</button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>);
}

export function RutasSection({
  cambiarFechaRuta,
  cargarFechasRuta,
  cargarHistorialRuta,
  parseFecha,
  routeDate,
  routeDates,
  routeHistory,
  routeLoading,
  routeVehicleId,
  s,
  vehiculos,
  velocidadKmh,
}) {
  return (<div>
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
                  <input style={{ ...s.input, flex: 1 }} type="date" value={routeDate} onChange={e => cambiarFechaRuta(e.target.value)} />
                  <button onClick={cargarHistorialRuta} style={s.button()}>Buscar</button>
                </div>
              </div>
            </div>

            {routeDates.length > 0 && (
              <div style={{ ...s.card, marginBottom: '1.5rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '0.9rem', color: '#e0e0e0' }}>Días disponibles</h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {routeDates.map(d => (
                    <button key={d.fecha} onClick={() => cambiarFechaRuta(d.fecha)}
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
                {(() => {
                  const routeStops = routeHistory.filter((p, i) => i > 0 && !estaEnMovimiento(p.speed) && estaEnMovimiento(routeHistory[i - 1]?.speed));
                  return (
                    <>
                      <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '0.9rem', color: '#e0e0e0' }}>
                        Paradas ({routeStops.length})
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
                              {parseFecha(routeHistory[0].recorded_at)?.toLocaleTimeString()} - {parseFecha(routeHistory[routeHistory.length - 1].recorded_at)?.toLocaleTimeString()}
                            </span>
                          </div>
                          <div style={{ maxHeight: 'calc(100vh - 480px)', overflow: 'auto' }}>
                            {routeStops.length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '1rem', color: '#4a8a4a' }}>No hubo paradas en este recorrido.</div>
                            ) : routeStops.map((p) => (
                              <div key={p.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #0d1f0d', fontSize: '0.8rem' }}>
                                <div style={{ color: '#c0c0c0' }}>
                                  <span style={{ color: '#00ff41', fontWeight: '600' }}>{parseFecha(p.recorded_at)?.toLocaleTimeString()}</span>
                                  {' · '}{velocidadKmh(p.speed)} km/h
                                </div>
                                <div style={{ color: '#4a8a4a', fontSize: '0.75rem' }}>{p.location || 'Sin dirección'}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>);
}

export function CitasSection({
  abrirReporteWpp,
  citasEta,
  citasEtaLoading,
  citasOperativas,
  estadoVehiculoCita,
  findGeofence,
  geocercasCoincidentes,
  loadAll,
  marcandoCitaId,
  marcarCitaCompletada,
  parseCitaDate,
  s,
  setCitaSeleccionada,
  setCitasEtaRefresh,
  unidadCitaLabel,
}) {
  return (<div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#e0e0e0' }}>Citas por Día de Entrega</h2>
                <p style={{ margin: '0.25rem 0 0', color: '#6a9b6a', fontSize: '0.9rem' }}>ETA desde GPS actual a la geocerca destino, comparada contra la cita de descarga</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <span style={s.badge('#10b981')}>A tiempo</span>
                <span style={s.badge('#ef4444')}>Retraso</span>
                <span style={s.badge('#3b82f6')}>Adelanto</span>
                <button disabled={citasEtaLoading} onClick={async () => { await loadAll(); setCitasEtaRefresh(value => value + 1); }} style={s.button()}>{citasEtaLoading ? 'Calculando ETA...' : 'Actualizar ETA'}</button>
                <button type="button" onClick={abrirReporteWpp} style={{ ...s.button('#00ff41'), background: '#00ff41', color: '#061006', fontWeight: 800 }}>Generar reporte WPP</button>
              </div>
            </div>

            {(() => {
              const deliveryKey = (item) => {
                const date = parseCitaDate(item.cita_descarga || item.cita_carga || '');
                if (!date) return 'sin-fecha';
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
              };
              const deliveryLabel = (key) => {
                if (key === 'sin-fecha') return 'Sin fecha de entrega';
                const [y, m, d] = key.split('-').map(Number);
                const date = new Date(y, m - 1, d);
                return date.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
              };
              const items = citasOperativas;

              const grouped = items.reduce((acc, item) => {
                const key = deliveryKey(item);
                if (!acc[key]) acc[key] = [];
                acc[key].push(item);
                return acc;
              }, {});
              const groups = Object.entries(grouped).sort((a, b) => {
                if (a[0] === 'sin-fecha') return 1;
                if (b[0] === 'sin-fecha') return -1;
                return a[0].localeCompare(b[0]);
              });

              return items.length === 0 ? (
                <div style={{ ...s.card, textAlign: 'center', padding: '3rem', color: '#6a9b6a' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📅</div>
                  <p>No hay unidades con citas registradas</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {groups.map(([key, rows]) => (
                    <div key={key} style={{ ...s.card, padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.9rem', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#00ff41' }}>{deliveryLabel(key)}</div>
                          <div style={{ fontSize: '0.8rem', color: '#6a9b6a' }}>{rows.length} cita(s)</div>
                        </div>
                        <span style={s.badge('#3b82f6')}>Entrega</span>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={s.table}>
                          <thead>
                            <tr>
                              <th style={s.th}>Unidad</th>
                              <th style={s.th}>Estado</th>
                              <th style={s.th}>Destino</th>
                              <th style={s.th}>Cita descarga</th>
                              <th style={s.th}>ETA / Llegada</th>
                              <th style={s.th}>Cumplimiento</th>
                              <th style={s.th}>Remolque</th>
                              <th style={s.th}>Estatus</th>
                              <th style={s.th}>Acción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map(item => {
                              const etaInfo = citasEta[item.id];
                              const etaColor = { delayed: '#ef4444', on_time: '#10b981', early: '#3b82f6', scheduled: '#8b5cf6', arrived: '#10b981', completado: '#10b981', cancelado: '#6b7280', unavailable: '#6b7280' }[etaInfo?.status] || '#f59e0b';
                              const appointment = parseCitaDate(item.cita_descarga || item.cita_carga);
                              const estadoVeh = estadoVehiculoCita(item);
                              return (
                              <tr key={item.id} onClick={() => setCitaSeleccionada(item)} style={{ background: etaInfo?.status === 'delayed' ? '#2a1111' : etaInfo?.status === 'on_time' ? '#0d2418' : undefined, cursor: 'pointer' }}>
                                <td style={s.td}><strong style={{ color: '#00ff41' }}>{unidadCitaLabel(item) || '-'}</strong></td>
                                <td style={s.td}><span style={s.badge(estadoVeh.color)}>{estadoVeh.label}</span></td>
                                <td style={{ ...s.td, color: '#60a5fa' }}>📍 {findGeofence(item.destino)?.nombre || geocercasCoincidentes(item.destino)[0] || item.destino || '-'}</td>
                                <td style={s.td}>{appointment ? appointment.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</td>
                                <td style={s.td}>
                                  {etaInfo?.status === 'arrived' ? (
                                    <div>
                                      <strong style={{ color: etaColor }}>{etaInfo.arrival.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</strong>
                                      <div style={{ color: '#6a9b6a', fontSize: '0.7rem' }}>{etaInfo.realArrival ? 'Llegada real' : 'Llegada (GPS)'}</div>
                                    </div>
                                  ) : etaInfo?.eta ? (
                                    <div><strong style={{ color: etaColor }}>{etaInfo.arrival.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</strong><div style={{ color: '#6a9b6a', fontSize: '0.7rem' }}>{etaInfo.eta.duracion} · {etaInfo.eta.distancia}</div></div>
                                  ) : citasEtaLoading && !etaInfo ? <span style={{ color: '#f59e0b' }}>Calculando...</span> : '-'}
                                </td>
                                <td style={s.td}><span style={s.badge(etaColor)}>{etaInfo?.label || (citasEtaLoading ? 'Calculando...' : 'Sin cálculo')}</span></td>
                                <td style={s.td}>{item.remolque || '-'}</td>
                                <td style={s.td}><span style={s.badge(item.tipo === 'Viaje' ? '#3b82f6' : '#f59e0b')}>{item.estatus || 'pendiente'}</span></td>
                                <td style={s.td}>
                                  <button
                                    type="button"
                                    disabled={marcandoCitaId === item.id}
                                    onClick={(e) => { e.stopPropagation(); marcarCitaCompletada(item); }}
                                    style={{ ...s.button('#10b981'), padding: '0.25rem 0.5rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                  >
                                    {marcandoCitaId === item.id ? 'Guardando...' : '✓ Completar'}
                                  </button>
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>);
}

export function UsuariosSection({
  currentUser,
  eliminarUsuario,
  formUsuario,
  guardarUsuario,
  s,
  setFormUsuario,
  usuarioMsg,
  usuarios,
}) {
  return (<div>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Usuarios</h2>
            <div style={{ ...s.card, marginBottom: '1.5rem' }}>
              <form onSubmit={guardarUsuario} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
                <div>
                  <label style={s.label}>Usuario</label>
                  <input style={s.input} value={formUsuario.username} onChange={(e) => setFormUsuario({ ...formUsuario, username: e.target.value })} required />
                </div>
                <div>
                  <label style={s.label}>Nombre</label>
                  <input style={s.input} value={formUsuario.nombre} onChange={(e) => setFormUsuario({ ...formUsuario, nombre: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>Contraseña</label>
                  <input style={s.input} type="password" value={formUsuario.password} onChange={(e) => setFormUsuario({ ...formUsuario, password: e.target.value })} required />
                </div>
                <div>
                  <label style={s.label}>Rol</label>
                  <select style={s.select} value={formUsuario.rol} onChange={(e) => setFormUsuario({ ...formUsuario, rol: e.target.value })}>
                    <option value="user">Usuario</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button type="submit" style={s.button('#00ff41')}>Crear usuario</button>
                  {usuarioMsg && <span style={{ color: '#6a9b6a', fontSize: '0.85rem' }}>{usuarioMsg}</span>}
                </div>
              </form>
            </div>
            <div style={s.card}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Usuario</th>
                    <th style={s.th}>Nombre</th>
                    <th style={s.th}>Rol</th>
                    <th style={s.th}>Estado</th>
                    <th style={s.th}>Creado</th>
                    <th style={s.th}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id}>
                      <td style={s.td}>{u.username}</td>
                      <td style={s.td}>{u.nombre || '-'}</td>
                      <td style={s.td}>{u.rol}</td>
                      <td style={s.td}>{u.activo ? 'Activo' : 'Inactivo'}</td>
                      <td style={s.td}>{u.created_at || '-'}</td>
                      <td style={s.td}>
                        <button
                          type="button"
                          disabled={u.id === currentUser?.id}
                          onClick={() => eliminarUsuario(u)}
                          title={u.id === currentUser?.id ? 'No puedes eliminar tu propia cuenta' : `Eliminar ${u.username}`}
                          style={{ ...s.button('#ef4444'), opacity: u.id === currentUser?.id ? 0.45 : 1, cursor: u.id === currentUser?.id ? 'not-allowed' : 'pointer' }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>);
}

export function ReportesSection({
  actualizarFiltroReporte,
  cargarReporte,
  filtroReporte,
  generarPDF,
  reporteError,
  reporteLoading,
  reportes,
  s,
  vehiculos,
}) {
  return (<div>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Reportes</h2>
            <div style={{ ...s.card, marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                  <label style={s.label}>Tipo</label>
                  <select style={s.select} value={filtroReporte.tipo} onChange={(e) => actualizarFiltroReporte({ tipo: e.target.value, vehicle_id: '' })}>
                    <option value="pendientes">Pendientes</option>
                    <option value="pendientes-completados">Pendientes completados</option>
                    <option value="viajes">Viajes</option>
                    <option value="seguimiento">Seguimiento operativo</option>
                    <option value="bitacora">Bitácora</option>
                    <option value="incidencias">Incidencias</option>
                  </select>
                </div>
                {(filtroReporte.tipo === 'seguimiento' || filtroReporte.tipo === 'bitacora' || filtroReporte.tipo === 'incidencias') && (
                  <div>
                    <label style={s.label}>Unidad</label>
                    <select style={s.select} value={filtroReporte.vehicle_id || ''} onChange={(e) => actualizarFiltroReporte({ vehicle_id: e.target.value })}>
                      <option value="">Todas</option>
                      {vehiculos.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label style={s.label}>Fecha Inicio</label>
                  <input style={s.input} type="date" value={filtroReporte.fecha_inicio} onChange={(e) => actualizarFiltroReporte({ fecha_inicio: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>Fecha Fin</label>
                  <input style={s.input} type="date" value={filtroReporte.fecha_fin} onChange={(e) => actualizarFiltroReporte({ fecha_fin: e.target.value })} />
                </div>
                <button onClick={cargarReporte} disabled={reporteLoading} style={s.button('#10b981')}>{reporteLoading ? 'Generando...' : 'Generar'}</button>
                {reportes.length > 0 && <button onClick={generarPDF} style={s.button('#ef4444')}>Descargar PDF</button>}
              </div>
            </div>
            <div style={s.card}>
              {reporteError ? (
                <div role="alert" style={{ padding: '1rem', color: '#f87171' }}>{reporteError}</div>
              ) : reportes.length === 0 ? (
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
          </div>);
}
