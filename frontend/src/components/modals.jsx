'use client';

import dynamic from 'next/dynamic';
import {
  activarConTeclado,
  destinosViaje,
  normalizarViaje,
  paradasViaje,
  parseDestinos,
} from '../lib/viajes';

const MapaUnidades = dynamic(() => import('./MapaUnidades'), { ssr: false });

export function ProgramarViajeModal({
  setShowProgramarViajeModal,
  s,
  crearViaje,
  formViaje,
  vehiculos,
  operadores,
  obtenerRemolqueAsignadoUnidad,
  setFormViaje,
  samsaraDrivers,
  driverPhoneOverrides,
  geofenceOptions,
  obtenerOpcionesRemolque,
  viajes,
  normalizarEstadoViaje,
  setViajeDetalle,
  setViajeForm,
  setShowViajeModal,
  setViajeEditando,
  estadoColors,
  formatFechaProgramada,
  calculandoViajeEta,
  viajeEta,
  viajeEtaError,
}) {
  return (<div className="modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 2100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.82)' }} onClick={() => setShowProgramarViajeModal(false)}>
                <div className="modal-panel" role="dialog" aria-modal="true" aria-label="Programar viaje" style={{ width: 'min(1200px, 96vw)', maxHeight: '92vh', overflow: 'auto', padding: '1.25rem', border: '1px solid #1a3d1a', borderRadius: '16px', background: '#0a0a0a', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <h2 style={{ margin: 0, color: '#00ff41', fontSize: '1.25rem' }}>Programar viaje</h2>
                      <p style={{ margin: '0.2rem 0 0', color: '#6a9b6a', fontSize: '0.82rem' }}>Captura el viaje y revisa la unidad antes de guardarlo</p>
                    </div>
                    <button type="button" onClick={() => setShowProgramarViajeModal(false)} style={s.button('#6b7280')}>Cerrar</button>
                  </div>
                  <div className="trip-program-modal-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem' }}>
              <div style={s.card}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', color: '#e0e0e0' }}>Nuevo Viaje</h3>
                <form onSubmit={crearViaje}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={s.label}>Vehiculo</label>
                    <select style={s.select} value={formViaje.vehicle_id} onChange={(e) => {
                      const v = vehiculos.find(vh => String(vh.id) === e.target.value);
                      const op = operadores[e.target.value];
                      const remolqueAsignado = obtenerRemolqueAsignadoUnidad(e.target.value, v?.name || '');
                      setFormViaje({
                        ...formViaje,
                        vehicle_id: e.target.value,
                        vehicle_name: v?.name || '',
                        origen: '',
                        conductor: op?.nombre || '',
                        telefono: op?.telefono || '',
                        remolque: v ? remolqueAsignado : '',
                      });
                    }}>
                      <option value="">Seleccionar...</option>
                      {vehiculos.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={s.label}>Conductor</label>
                      <select style={s.select} value={formViaje.conductor} onChange={(e) => {
                        const driver = samsaraDrivers.find(d => d.name === e.target.value);
                        setFormViaje({ ...formViaje, conductor: e.target.value, telefono: driver ? (driverPhoneOverrides[driver.id] ?? driver.phone ?? '') : '' });
                      }}>
                        <option value="">Seleccionar...</option>
                        {samsaraDrivers.filter(d => d.status === 'active').sort((a, b) => a.name.localeCompare(b.name)).map(d => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={s.label}>Telefono (WhatsApp)</label>
                      <input style={s.input} placeholder="Auto-del conductor" value={formViaje.telefono} onChange={(e) => setFormViaje({ ...formViaje, telefono: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div>
                      <label style={s.label}>Origen</label>
                       <select style={s.select} value={formViaje.origen} onChange={(e) => setFormViaje({ ...formViaje, origen: e.target.value })}>{geofenceOptions(formViaje.origen)}</select>
                    </div>
                  </div>
                  <div className="trip-delivery-type" role="group" aria-label="Tipo de entrega">
                    <button type="button" className={formViaje.tipo_entrega !== 'reparto' ? 'active' : ''} onClick={() => setFormViaje(prev => ({ ...prev, tipo_entrega: 'directo', destino: parseDestinos(prev.destinos).at(-1) || prev.destino }))}>Destino único</button>
                    <button type="button" className={formViaje.tipo_entrega === 'reparto' ? 'active' : ''} onClick={() => setFormViaje(prev => ({ ...prev, tipo_entrega: 'reparto', destinos: parseDestinos(prev.destinos).length >= 2 ? prev.destinos : [prev.destino || '', ''] }))}>Reparto</button>
                  </div>
                  {formViaje.tipo_entrega === 'reparto' ? (
                    <div className="trip-stops-editor">
                      <label style={s.label}>Destinos en orden</label>
                      {formViaje.destinos.map((destino, index) => (
                        <div className="trip-stop-input" key={index}>
                          <span>{index + 1}</span>
                           <select style={s.select} aria-label={`Destino ${index + 1}`} value={destino} onChange={(e) => setFormViaje(prev => ({ ...prev, destinos: prev.destinos.map((item, itemIndex) => itemIndex === index ? e.target.value : item) }))}>{geofenceOptions(destino)}</select>
                          <button type="button" disabled={formViaje.destinos.length <= 2} onClick={() => setFormViaje(prev => ({ ...prev, destinos: prev.destinos.filter((_, itemIndex) => itemIndex !== index) }))} aria-label={`Eliminar destino ${index + 1}`}>Quitar</button>
                        </div>
                      ))}
                      <button type="button" className="trip-add-stop" onClick={() => setFormViaje(prev => ({ ...prev, destinos: [...prev.destinos, ''] }))}>+ Agregar destino</button>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={s.label}>Destino</label>
                       <select style={s.select} value={formViaje.destino} onChange={(e) => setFormViaje({ ...formViaje, destino: e.target.value })}>{geofenceOptions(formViaje.destino)}</select>
                    </div>
                  )}
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
                    <label style={s.label}>Remolque</label>
                    <select style={s.select} value={formViaje.remolque} onChange={(e) => setFormViaje({ ...formViaje, remolque: e.target.value })}>
                      <option value="">Sin remolque</option>
                      {obtenerOpcionesRemolque(formViaje.vehicle_id).map(r => (
                        <option key={r.key} value={r.value}>{r.label}</option>
                      ))}
                    </select>
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
                  const estadosEnCurso = new Set(['en_ruta_vacio', 'en_ruta_cargado', 'espera_ingreso', 'proceso_carga', 'proceso_descarga', 'proceso_liberacion', 'en_resguardo']);
                  const viajesUnidad = viajes
                    .filter(viaje => String(viaje.vehicle_id) === String(v.id) || String(viaje.vehicle_name || '').trim().toLowerCase() === String(v.name || '').trim().toLowerCase())
                    .map(normalizarViaje);
                  const ordenarPorInicio = (a, b) => new Date(a.fecha_inicio || a.created_at || 0) - new Date(b.fecha_inicio || b.created_at || 0);
                  const viajesEnCursoUnidad = viajesUnidad.filter(viaje => estadosEnCurso.has(normalizarEstadoViaje(viaje.estado))).sort(ordenarPorInicio);
                  const viajesProgramadosUnidad = viajesUnidad.filter(viaje => normalizarEstadoViaje(viaje.estado) === 'programado').sort(ordenarPorInicio);
                  const abrirViajeUnidad = (viaje) => {
                    setViajeDetalle(viaje);
                    setViajeForm(viaje);
                    setShowViajeModal(true);
                    setViajeEditando(false);
                  };
                  const renderViajeUnidad = (viaje) => {
                    const estado = normalizarEstadoViaje(viaje.estado);
                    const color = estadoColors[estado] || '#8b5cf6';
                    const destinos = viaje.tipo_entrega === 'reparto' ? destinosViaje(viaje) : [viaje.destino].filter(Boolean);
                    const paradas = paradasViaje(viaje);
                    const completadas = paradas.filter(parada => parada.estado === 'completada').length;
                    return (
                      <div key={viaje.id} role="button" tabIndex={0} onClick={() => abrirViajeUnidad(viaje)} onKeyDown={(e) => activarConTeclado(e, () => abrirViajeUnidad(viaje))}
                        style={{ padding: '0.7rem', background: '#111', border: `1px solid ${color}44`, borderRadius: '8px', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <span style={{ color, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>{estado.replaceAll('_', ' ')}</span>
                          <span style={{ color: '#94a3b8', fontSize: '0.68rem' }}>{viaje.fecha_inicio ? formatFechaProgramada(viaje.fecha_inicio) : 'Sin fecha'}</span>
                        </div>
                        <div style={{ color: '#d4d4d4', fontSize: '0.78rem', lineHeight: 1.4 }}>
                          <strong style={{ color: '#10b981' }}>{viaje.origen || 'Sin origen'}</strong>
                          <span style={{ color: '#4a8a4a' }}> → </span>
                          <strong style={{ color: '#60a5fa' }}>{viaje.tipo_entrega === 'reparto' ? `${destinos.length} paradas` : (destinos[0] || 'Sin destino')}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.35rem', color: '#6a9b6a', fontSize: '0.68rem' }}>
                          <span>{viaje.conductor || 'Sin conductor'}</span>
                          {viaje.remolque && <span>· {viaje.remolque}</span>}
                        </div>
                        {paradas.length > 0 && <div style={{ marginTop: '0.4rem', color: completadas === paradas.length ? '#00ff41' : '#f59e0b', fontSize: '0.7rem', fontWeight: 700 }}>{completadas} de {paradas.length} paradas completadas</div>}
                      </div>
                    );
                  };
                  return (
                    <div style={{ fontSize: '0.85rem' }}>
                      <div style={{ padding: '0.75rem', background: '#111', borderRadius: '8px', border: '1px solid #1a3d1a' }}>
                        <div style={{ fontWeight: '600', color: '#00ff41', fontSize: '1rem', marginBottom: '0.5rem' }}>{v.name}</div>
                        <div style={{ color: '#c0c0c0' }}>Operador: {operadores[String(v.id)]?.nombre || 'Sin asignar'}</div>
                        <div style={{ color: '#c0c0c0' }}>Ubicación: {v.location?.location || 'Sin datos'}</div>
                        <div style={{ color: '#c0c0c0' }}>Diesel: {v.fuelLevelPercent !== null ? `${Math.round(v.fuelLevelPercent * 100)}%` : 'N/D'}</div>
                        <div style={{ color: v.isOnline ? '#00ff41' : '#f59e0b' }}>Estado: {v.isOnline ? 'Online' : 'Sin señal'}</div>
                      </div>
                      <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#0d0d0d', borderRadius: '8px', border: '1px solid #1a3d1a' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                          <div style={{ color: '#e0e0e0', fontSize: '0.8rem', fontWeight: 700 }}>Viajes de la unidad</div>
                          <span style={s.badge('#6366f1')}>{viajesEnCursoUnidad.length + viajesProgramadosUnidad.length}</span>
                        </div>
                        {viajesEnCursoUnidad.length > 0 && (
                          <div style={{ marginBottom: viajesProgramadosUnidad.length > 0 ? '0.85rem' : 0 }}>
                            <div style={{ color: '#10b981', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.45rem' }}>En curso ({viajesEnCursoUnidad.length})</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{viajesEnCursoUnidad.map(renderViajeUnidad)}</div>
                          </div>
                        )}
                        {viajesProgramadosUnidad.length > 0 && (
                          <div>
                            <div style={{ color: '#8b5cf6', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.45rem' }}>Programados ({viajesProgramadosUnidad.length})</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{viajesProgramadosUnidad.map(renderViajeUnidad)}</div>
                          </div>
                        )}
                        {viajesEnCursoUnidad.length === 0 && viajesProgramadosUnidad.length === 0 && (
                          <div style={{ color: '#4a8a4a', fontSize: '0.78rem', textAlign: 'center', padding: '0.75rem 0' }}>Sin viajes activos o programados</div>
                        )}
                      </div>
                      {calculandoViajeEta && (
                        <div style={{ marginTop: '0.75rem', padding: '0.6rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #f59e0b33', fontSize: '0.85rem', color: '#f59e0b', textAlign: 'center' }}>
                          Calculando ETA...
                        </div>
                      )}
                      {viajeEta && !calculandoViajeEta && (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #10b98133' }}>
                           <div style={{ fontWeight: '600', fontSize: '0.8rem', color: '#10b981', marginBottom: '0.5rem', textTransform: 'uppercase' }}>{formViaje.tipo_entrega === 'reparto' ? 'ETA a primera parada (Tractocamión)' : 'ETA Calculado (Tractocamión)'}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                            <div>
                              <div style={{ fontSize: '0.65rem', color: '#4a8a4a', textTransform: 'uppercase' }}>Llegada</div>
                              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#10b981' }}>{viajeEta.fechaLlegada || viajeEta.horaLlegada}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.65rem', color: '#4a8a4a', textTransform: 'uppercase' }}>Tiempo</div>
                              <div style={{ fontSize: '1rem', fontWeight: '600' }}>{viajeEta.duracion}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.65rem', color: '#4a8a4a', textTransform: 'uppercase' }}>Distancia</div>
                              <div style={{ fontSize: '1rem', fontWeight: '600' }}>{viajeEta.distancia}</div>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#4a8a4a', marginTop: '0.5rem', textAlign: 'center' }}>{viajeEta.destinoNombre}</div>
                          <div style={{ fontSize: '0.7rem', color: '#6a9b6a', marginTop: '0.25rem', textAlign: 'center' }}>Llegada: {viajeEta.fechaLlegada || viajeEta.horaLlegada}</div>
                        </div>
                      )}
                      {viajeEtaError && !calculandoViajeEta && !viajeEta && (
                        <div style={{ marginTop: '0.75rem', padding: '0.6rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #ef444433', fontSize: '0.82rem', color: '#ef4444' }}>
                          {viajeEtaError}
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#4a8a4a' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚚</div>
                    <p>Selecciona un vehículo para ver sus datos</p>
                    <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>También verás sus viajes activos y programados</p>
                  </div>
                )}
              </div>
            </div>
                </div>
              </div>);
}

export function CitaDetalleModal({
  setCitaSeleccionada,
  citaSeleccionada,
  findGeofence,
  geocercasCoincidentes,
  vehiculoDeCita,
  estadoVehiculoCita,
  parseCitaDate,
  s,
  velocidadKmh,
  citaLlegada,
  allGeofences,
  marcarCitaCompletada,
  marcandoCitaId,
}) {
  return (<div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100 }}
            onClick={() => setCitaSeleccionada(null)}>
            <div className="modal-panel" role="dialog" aria-modal="true" aria-label={`Detalle de cita de ${citaSeleccionada.unidad}`} style={{ background: '#0d0d0d', borderRadius: '16px', width: '560px', maxHeight: '88vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(0,255,65,0.1)', border: '1px solid #1a3d1a' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #1a3d1a', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#e0e0e0' }}>📍 Cita de {citaSeleccionada.unidad || 'unidad'}</h3>
                  <p style={{ margin: '0.25rem 0 0', color: '#6a9b6a', fontSize: '0.85rem' }}>
                    {findGeofence(citaSeleccionada.destino)?.nombre || geocercasCoincidentes(citaSeleccionada.destino)[0] || citaSeleccionada.destino || 'Sin destino'}
                  </p>
                </div>
                <button onClick={() => setCitaSeleccionada(null)} style={{ background: 'none', border: 'none', color: '#6a9b6a', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ padding: '1.5rem' }}>
                {(() => {
                  const vehicle = vehiculoDeCita(citaSeleccionada);
                  const estadoVeh = estadoVehiculoCita(citaSeleccionada);
                  const appointment = parseCitaDate(citaSeleccionada.cita_descarga || citaSeleccionada.cita_carga);
                  return (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '1rem' }}>
                          <div style={{ fontSize: '0.75rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Estado del vehículo</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={s.badge(estadoVeh.color)}>{estadoVeh.label}</span>
                            {vehicle?.location && <span style={{ fontSize: '0.85rem', color: '#e0e0e0' }}>{velocidadKmh(vehicle.location.speed)} km/h</span>}
                          </div>
                          {estadoVeh.label === 'En destino' && citaLlegada && (
                            <div style={{ fontSize: '0.85rem', color: '#00ff41', marginTop: '0.5rem' }}>
                              Llegó a destino: {citaLlegada.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                          )}
                        </div>
                        <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '1rem' }}>
                          <div style={{ fontSize: '0.75rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Cita de descarga</div>
                          <div style={{ fontSize: '0.9rem', color: '#e0e0e0', fontWeight: '600' }}>
                            {appointment ? appointment.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#4a8a4a', marginTop: '0.25rem' }}>{citaSeleccionada.remolque ? `Remolque: ${citaSeleccionada.remolque}` : 'Sin remolque'}</div>
                        </div>
                      </div>
                      <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Ubicación actual</div>
                        {vehicle?.location ? (
                          <>
                            <div style={{ fontSize: '0.9rem', color: '#e0e0e0', fontWeight: '600' }}>{vehicle.location.location || 'Sin dirección'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#4a8a4a', marginTop: '0.25rem' }}>
                              {Number(vehicle.location.latitude).toFixed(5)}, {Number(vehicle.location.longitude).toFixed(5)}
                              {vehicle.lastSeen != null && vehicle.lastSeen < 999 ? ` · hace ${vehicle.lastSeen} min` : ''}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: '0.9rem', color: '#6a9b6a' }}>Sin GPS reciente para esta unidad</div>
                        )}
                      </div>
                      {vehicle?.location && (
                        <div style={{ height: '280px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1a3d1a' }}>
                          <MapaUnidades vehiculos={[vehicle]} geofences={allGeofences} selectedVehicleId={vehicle.id} />
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                        <button onClick={() => marcarCitaCompletada(citaSeleccionada)} disabled={marcandoCitaId === citaSeleccionada.id} style={{ flex: 1, padding: '0.7rem', background: '#10b981', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                          {marcandoCitaId === citaSeleccionada.id ? 'Guardando...' : '✓ Marcar completada'}
                        </button>
                        <button onClick={() => setCitaSeleccionada(null)} style={{ flex: 1, padding: '0.7rem', background: '#00ff41', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>Cerrar</button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>);
}

export function WppReporteModal({
  setShowWppReporte,
  s,
  wppReporteDia,
  setWppReporteDia,
  recalcularReporteWpp,
  citasOperativas,
  diaEntregaCita,
  clienteDeDestino,
  labelDiaEntrega,
  wppReporteGrupos,
  wppReporteTextos,
  generarReporteWppCliente,
  copiarReporteWppEnvio,
  copiarReporteWpp,
  setWppReporteGrupos,
  setWppReporteTextos,
}) {
  return (<div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 2300, overflowY: 'auto', padding: '2rem 1rem' }}
            onClick={() => setShowWppReporte(false)}>
            <div className="modal-panel" role="dialog" aria-modal="true" aria-label="Reporte de WhatsApp" style={{ background: '#0d0d0d', border: '1px solid #1a3d1a', borderRadius: '16px', width: '760px', maxWidth: '100%', padding: '1.5rem', boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(0,255,65,0.1)' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: '#4ade80', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Reporte diario</div>
                  <h2 style={{ margin: '0.25rem 0 0', color: '#f0fdf4' }}>Reporte WhatsApp por cliente</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input type="date" style={{ ...s.input, width: 'auto' }} value={wppReporteDia} onChange={e => { const d = e.target.value; setWppReporteDia(d); recalcularReporteWpp(d); }} />
                  <button type="button" onClick={() => recalcularReporteWpp(wppReporteDia)} style={s.button('#f59e0b')}>Regenerar textos</button>
                  <button type="button" onClick={() => setShowWppReporte(false)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.4rem', cursor: 'pointer' }}>✕</button>
                </div>
              </div>

              {(() => {
                const itemsDelDia = citasOperativas.filter(item => diaEntregaCita(item) === wppReporteDia);
                const porCliente = new Map();
                itemsDelDia.forEach(item => {
                  const cliente = clienteDeDestino(item.destino);
                  const clave = cliente ? String(cliente.id) : 'sin-cliente';
                  if (!porCliente.has(clave)) porCliente.set(clave, { cliente, items: [] });
                  porCliente.get(clave).items.push(item);
                });
                const clientesReporte = [...porCliente.values()].sort((a, b) => {
                  const na = a.cliente?.nombre || 'Sin cliente';
                  const nb = b.cliente?.nombre || 'Sin cliente';
                  return na.localeCompare(nb);
                });

                if (itemsDelDia.length === 0) {
                  return (
                    <div style={{ ...s.card, textAlign: 'center', padding: '2.5rem', color: '#6a9b6a' }}>
                      No hay citas para {labelDiaEntrega(wppReporteDia)}.
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ color: '#6a9b6a', fontSize: '0.85rem' }}>
                      {labelDiaEntrega(wppReporteDia)} · {itemsDelDia.length} cita{itemsDelDia.length === 1 ? '' : 's'} · {clientesReporte.length} cliente{clientesReporte.length === 1 ? '' : 's'}
                    </div>

                    {clientesReporte.map(({ cliente, items }) => {
                      const clave = cliente ? String(cliente.id) : 'sin-cliente';
                      const disponibles = cliente ? (cliente.wpp_groups || []) : [];
                      const seleccion = wppReporteGrupos[clave] ?? [];
                      const texto = wppReporteTextos[clave] ?? generarReporteWppCliente(cliente, items);
                      return (
                        <div key={clave} style={{ ...s.card, padding: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.7rem' }}>
                            <div>
                              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#00ff41' }}>{cliente ? cliente.nombre : 'Sin cliente'}</div>
                              <div style={{ fontSize: '0.75rem', color: '#6a9b6a' }}>{items.length} cita{items.length === 1 ? '' : 's'}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <button type="button" onClick={() => copiarReporteWppEnvio(cliente, texto)} style={s.button('#00ff41')}>Copiar para enviar</button>
                              <button type="button" onClick={() => copiarReporteWpp(texto)} style={s.button('#3b82f6')}>Copiar texto</button>
                            </div>
                          </div>

                          <div style={{ marginBottom: '0.7rem' }}>
                            <div style={{ color: '#4a8a4a', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.35rem' }}>Grupos de WhatsApp</div>
                            {disponibles.length === 0 ? (
                              <div style={{ color: '#6a9b6a', fontSize: '0.8rem' }}>{cliente ? 'El cliente no tiene grupos configurados. Agrégale grupos en la pestaña Clientes.' : 'La cita no tiene un cliente asociado para grupos de WhatsApp.'}</div>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                                {disponibles.map(grupo => {
                                  const marcado = seleccion.includes(grupo);
                                  return (
                                    <label key={grupo} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.65rem', border: `1px solid ${marcado ? '#00ff41' : '#1a3d1a'}`, borderRadius: '999px', background: marcado ? '#0d2b0d' : '#0a150a', color: marcado ? '#00ff41' : '#6a9b6a', cursor: 'pointer', fontSize: '0.8rem' }}>
                                      <input type="checkbox" checked={marcado} onChange={() => {
                                        setWppReporteGrupos(prev => {
                                          const actual = prev[clave] ?? disponibles;
                                          const nuevo = actual.includes(grupo) ? actual.filter(g => g !== grupo) : [...actual, grupo];
                                          return { ...prev, [clave]: nuevo };
                                        });
                                      }} />
                                      {grupo}
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <textarea
                            rows={Math.min(10, 3 + items.length * 2)}
                            style={{ ...s.input, width: '100%', fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: 1.5, resize: 'vertical' }}
                            value={texto}
                            onChange={e => setWppReporteTextos(prev => ({ ...prev, [clave]: e.target.value }))}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>);
}

export function ZoneModal({
  setShowZoneModal,
  crearZonaRiesgo,
  s,
  newZone,
  setNewZone,
}) {
  return (<div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={() => setShowZoneModal(false)}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-label="Nueva zona de riesgo" style={{ background: '#0d0d0d', borderRadius: '16px', width: '420px', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(248,113,113,0.1)', border: '1px solid #3d1a1a' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #3d1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#e0e0e0' }}>⚠️ Nueva Zona de Riesgo</h3>
              <button onClick={() => setShowZoneModal(false)} style={{ background: 'none', border: 'none', color: '#6a9b6a', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={crearZonaRiesgo} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={s.label}>Nombre *</label>
                <input style={s.input} value={newZone.name} onChange={e => setNewZone({ ...newZone, name: e.target.value })} required placeholder="Ej: Carretera Peligrosa" />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={s.label}>Descripción</label>
                <textarea style={{ ...s.input, minHeight: '60px', resize: 'vertical' }} value={newZone.description} onChange={e => setNewZone({ ...newZone, description: e.target.value })} placeholder="Describe el tipo de peligro..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={s.label}>Latitud</label>
                  <input style={s.input} type="number" step="any" min="-90" max="90" value={newZone.lat} onChange={e => setNewZone({ ...newZone, lat: e.target.value })} required placeholder="Ej: 28.6353" />
                </div>
                <div>
                  <label style={s.label}>Longitud</label>
                  <input style={s.input} type="number" step="any" min="-180" max="180" value={newZone.lng} onChange={e => setNewZone({ ...newZone, lng: e.target.value })} required placeholder="Ej: -106.0889" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={s.label}>Severidad</label>
                  <select style={s.select} value={newZone.severity} onChange={e => setNewZone({ ...newZone, severity: e.target.value })}>
                    <option value="critical">Crítica</option>
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                  </select>
                </div>
                <div>
                  <label style={s.label}>Radio (m)</label>
                  <input style={s.input} type="number" min="100" max="200000" value={newZone.radius} onChange={e => setNewZone({ ...newZone, radius: e.target.value })} />
                </div>
              </div>
              <button type="submit" disabled={!newZone.lat || !newZone.lng} style={{ width: '100%', padding: '0.7rem', background: (!newZone.lat || !newZone.lng) ? '#333' : '#f87171', color: '#fff', border: 'none', borderRadius: '8px', cursor: (!newZone.lat || !newZone.lng) ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                ⚠️ Crear Zona de Riesgo
              </button>
            </form>
          </div>
        </div>);
}

export function UnidadModal({
  setShowUnidadModal,
  editUnidad,
  guardarUnidad,
  s,
  formUnidad,
  setFormUnidad,
}) {
  return (<div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={() => setShowUnidadModal(false)}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-label={editUnidad ? 'Editar unidad' : 'Nueva unidad'} style={{ background: '#0d0d0d', borderRadius: '16px', width: '440px', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(0,255,65,0.1)', border: '1px solid #1a3d1a' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #1a3d1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#e0e0e0' }}>{editUnidad ? '✏️ Editar Unidad' : '➕ Nueva Unidad'}</h3>
              <button onClick={() => setShowUnidadModal(false)} style={{ background: 'none', border: 'none', color: '#6a9b6a', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={guardarUnidad} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={s.label}>Nombre *</label>
                <input style={s.input} value={formUnidad.nombre} onChange={e => setFormUnidad({ ...formUnidad, nombre: e.target.value })} required placeholder="Ej: GERS-001" />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={s.label}>Estatus</label>
                <select style={s.select} value={formUnidad.estatus} onChange={e => setFormUnidad({ ...formUnidad, estatus: e.target.value })}>
                  <option value="Activa">Activa</option>
                  <option value="No disponible">No disponible</option>
                  <option value="Siniestrada">Siniestrada</option>
                  <option value="En mantenimiento">En mantenimiento</option>
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={s.label}>Notas</label>
                <textarea style={{ ...s.input, minHeight: '70px', resize: 'vertical' }} value={formUnidad.notas} onChange={e => setFormUnidad({ ...formUnidad, notas: e.target.value })} placeholder="Descripción, detalles..." />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={s.label}>ID Samsara (opcional)</label>
                <input style={s.input} value={formUnidad.samsara_id} onChange={e => setFormUnidad({ ...formUnidad, samsara_id: e.target.value })} placeholder="Vincular con ID de Samsara" />
              </div>
              <button type="submit" style={{ width: '100%', padding: '0.7rem', background: '#00ff41', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                {editUnidad ? 'Guardar Cambios' : 'Crear Unidad'}
              </button>
            </form>
          </div>
        </div>);
}

export function DetalleUnidadModal({
  setSelectedVehicle,
  selectedVehicle,
  operadorDraft,
  samsaraDrivers,
  setOperadorDraft,
  setTelefonoDraft,
  driverPhoneOverrides,
  telefonoDraft,
  guardarOperador,
  remolques,
  obtenerMiembrosFull,
  displayRemolque,
  numeroRemolque,
  setRemolqueModo,
  remolqueModo,
  remolqueDraft,
  setRemolqueDraft,
  remolquesFullDraft,
  setRemolquesFullDraft,
  s,
  guardarRemolqueSeleccionado,
  viajes,
  ordenarViajesUnidad,
  estadoColors,
  parseFechaProgramada,
  velocidadKmh,
  comentarioRapido,
  setComentarioRapido,
  destinoInput,
  setDestinoInput,
  geofenceOptions,
  calculandoEta,
  etaError,
  etaData,
  guardarComentarioRapido,
}) {
  return (<div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setSelectedVehicle(null)}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-label={`Detalles de ${selectedVehicle.name}`} style={{ background: '#0d0d0d', borderRadius: '16px', width: '520px', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(0,255,65,0.1)', border: '1px solid #1a3d1a' }}
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
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <input
                    list="samsara-drivers-suggestions"
                    value={operadorDraft}
                    onChange={e => {
                      const nombre = e.target.value;
                      const driver = samsaraDrivers.find(d => d.name === nombre);
                      setOperadorDraft(nombre);
                      setTelefonoDraft(driver ? (driverPhoneOverrides[driver.id] ?? driver.phone ?? '') : telefonoDraft);
                    }}
                    placeholder="Escribe o elige operador"
                    style={{ flex: 1, padding: '0.55rem 0.75rem', border: '1px solid #1a3d1a', borderRadius: '8px', fontSize: '0.85rem', background: '#ffffff', color: '#000000' }}
                  />
                  <datalist id="samsara-drivers-suggestions">
                    {samsaraDrivers.filter(d => d.status === 'active').sort((a, b) => a.name.localeCompare(b.name)).map(d => (
                      <option key={d.id} value={d.name} />
                    ))}
                  </datalist>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <input
                    placeholder="Telefono WhatsApp (521XXXXXXXXXX)"
                    value={telefonoDraft}
                    onChange={e => setTelefonoDraft(e.target.value)}
                    style={{ flex: 1, padding: '0.55rem 0.75rem', border: '1px solid #1a3d1a', borderRadius: '8px', fontSize: '0.85rem', background: '#ffffff', color: '#000000' }}
                  />
                  <button
                    onClick={() => guardarOperador(selectedVehicle.id, selectedVehicle.name, operadorDraft || '', telefonoDraft || '')}
                    style={{ padding: '0.55rem 0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    Asignar
                  </button>
                  <button
                    onClick={() => {
                      setOperadorDraft('');
                      setTelefonoDraft('');
                      guardarOperador(selectedVehicle.id, selectedVehicle.name, '', '');
                    }}
                    style={{ padding: '0.55rem 0.75rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    Quitar operador
                  </button>
                </div>
              </div>

              <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Remolque Asignado</div>
                {(() => {
                  const asignado = remolques.find(r => String(r.vehicle_id_asignado || '') === String(selectedVehicle.id) || String(r.unidad_asignada || '').toLowerCase() === String(selectedVehicle.name || '').toLowerCase());
                  const esFull = asignado && obtenerMiembrosFull(asignado).length > 1;
                  return asignado ? (
                    <div style={{ color: '#f59e0b', fontWeight: 700, marginBottom: '0.75rem' }}>
                      {esFull ? `Full · ${displayRemolque(asignado)}` : numeroRemolque(asignado.numero)}
                    </div>
                  ) : null;
                })()}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {['sencillo', 'full'].map(modo => (
                    <button key={modo} type="button" onClick={() => setRemolqueModo(modo)} style={{ flex: 1, padding: '0.45rem', borderRadius: '7px', cursor: 'pointer', fontWeight: 700, border: `1px solid ${remolqueModo === modo ? '#f59e0b' : '#444'}`, background: remolqueModo === modo ? '#332200' : '#111', color: remolqueModo === modo ? '#f59e0b' : '#aaa' }}>
                      {modo === 'full' ? 'Full' : 'Sencillo'}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {remolqueModo === 'sencillo' ? (
                    <>
                      <select
                        value={remolqueDraft}
                        onChange={e => setRemolqueDraft(e.target.value)}
                        style={{ flex: 1, padding: '0.55rem 0.75rem', border: '1px solid #1a3d1a', borderRadius: '8px', fontSize: '0.85rem', background: '#ffffff', color: '#000000' }}
                      >
                        <option value="">Sin remolque</option>
                        {remolques.filter(r => !r.vehicle_id_asignado || String(r.vehicle_id_asignado) === String(selectedVehicle.id)).map(r => (
                          <option key={r.id} value={String(r.id)}>{numeroRemolque(r.numero)}{r.unidad_asignada ? ` (${r.unidad_asignada})` : ''}</option>
                        ))}
                      </select>
                    </>
                  ) : [0, 1].map(index => (
                    <select key={index} aria-label={`Tanque ${index + 1}`} value={remolquesFullDraft[index]} onChange={e => setRemolquesFullDraft(draft => draft.map((id, i) => i === index ? e.target.value : id))} style={{ ...s.select, flex: 1 }}>
                      <option value="">Tanque {index + 1}</option>
                      {remolques.filter(r => String(r.categoria || '').toLowerCase() === 'tanque'
                        && (!r.vehicle_id_asignado || String(r.vehicle_id_asignado) === String(selectedVehicle.id) || String(r.unidad_asignada || '').toLowerCase() === String(selectedVehicle.name || '').toLowerCase())
                        && String(r.id) !== String(remolquesFullDraft[index === 0 ? 1 : 0])).map(r => (
                          <option key={r.id} value={String(r.id)}>{numeroRemolque(r.numero)}</option>
                        ))}
                    </select>
                  ))}
                  <button
                    onClick={guardarRemolqueSeleccionado}
                    style={{ padding: '0.55rem 0.75rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    Guardar
                  </button>
                </div>
              </div>

              {(() => {
                const viajesVehiculo = viajes.filter(v => String(v.vehicle_id) === String(selectedVehicle.id));
                const viajesOrdenados = ordenarViajesUnidad(viajesVehiculo);
                const viajesVigentes = viajesOrdenados.filter(v => !['completado', 'cancelado'].includes(String(v.estado || '').toLowerCase()));
                const viajesHistorial = viajesOrdenados.filter(v => ['completado', 'cancelado'].includes(String(v.estado || '').toLowerCase()));
                if (viajesVigentes.length === 0 && viajesHistorial.length === 0) return null;
                return (
                  <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Viajes</div>
                    {viajesVigentes.map((v, idx) => {
                      const viajeColor = estadoColors[String(v.estado || '').toLowerCase()] || '#10b981';
                      const viajeLabel = String(v.estado || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                      const seqLabel = idx === 0 ? '1. Actual' : idx === 1 ? '2. Siguiente' : `${idx + 1}. En cola`;
                      return (
                      <div key={v.id} style={{ padding: '0.75rem', background: idx === 0 ? '#0d2e0d' : '#111', borderRadius: '8px', border: `1px solid ${viajeColor}33`, marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                          <span style={{ fontSize: '0.65rem', background: viajeColor, color: '#000', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: '700', textTransform: 'uppercase' }}>{seqLabel}</span>
                           <span style={{ fontSize: '0.65rem', background: `${viajeColor}33`, color: viajeColor, padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: '700', textTransform: 'uppercase' }}>{viajeLabel}</span>
                           {v.tipo_entrega === 'reparto' && <span className="trip-reparto-badge">Reparto</span>}
                          <span style={{ fontSize: '0.7rem', color: '#6a9b6a' }}>{v.fecha_inicio ? parseFechaProgramada(v.fecha_inicio).toLocaleDateString('es-MX') : '-'}</span>
                        </div>
                         {v.tipo_entrega === 'reparto' ? <><div style={{ fontSize: '0.82rem', color: '#e0e0e0' }}><strong>{v.origen}</strong> →</div><div className="trip-stops-display">{destinosViaje(v).map((destino, stopIndex) => <div key={`${v.id}-vehicle-stop-${stopIndex}`}><span>{stopIndex + 1}</span>{destino}</div>)}</div></> : <div style={{ fontSize: '0.82rem', color: '#e0e0e0' }}><strong>{v.origen}</strong> → <strong>{v.destino}</strong></div>}
                        {v.conductor && <div style={{ fontSize: '0.72rem', color: '#6a9b6a', marginTop: '0.15rem' }}>Conductor: {v.conductor}</div>}
                        <div style={{ fontSize: '0.7rem', color: '#4a8a4a', marginTop: '0.15rem' }}>
                          {v.fecha_inicio ? parseFechaProgramada(v.fecha_inicio).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '--'} - {v.fecha_fin ? parseFechaProgramada(v.fecha_fin).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '--'}
                        </div>
                      </div>
                      );
                    })}

                    {viajesHistorial.length > 0 && (
                      <div style={{ marginTop: '0.9rem', paddingTop: '0.9rem', borderTop: '1px solid #262626' }}>
                        <div style={{ fontSize: '0.7rem', color: '#6a9b6a', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Historial</div>
                        {viajesHistorial.map(v => {
                          const viajeColor = estadoColors[String(v.estado || '').toLowerCase()] || '#6a9b6a';
                          const viajeLabel = String(v.estado || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                          return (
                            <div key={v.id} style={{ padding: '0.6rem 0.75rem', background: '#0f0f0f', borderRadius: '8px', border: '1px solid #333', marginBottom: '0.5rem', opacity: 0.8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                                 <span style={{ fontSize: '0.65rem', background: viajeColor, color: '#000', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: '700', textTransform: 'uppercase' }}>{viajeLabel}</span>
                                 {v.tipo_entrega === 'reparto' && <span className="trip-reparto-badge">Reparto</span>}
                                <span style={{ fontSize: '0.7rem', color: '#6a9b6a' }}>{v.fecha_fin ? parseFechaProgramada(v.fecha_fin).toLocaleDateString('es-MX') : '-'}</span>
                              </div>
                               {v.tipo_entrega === 'reparto' ? <><div style={{ fontSize: '0.82rem', color: '#a3a3a3' }}><strong>{v.origen}</strong> →</div><div className="trip-stops-display">{destinosViaje(v).map((destino, stopIndex) => <div key={`${v.id}-history-stop-${stopIndex}`}><span>{stopIndex + 1}</span>{destino}</div>)}</div></> : <div style={{ fontSize: '0.82rem', color: '#a3a3a3' }}><strong>{v.origen}</strong> → <strong>{v.destino}</strong></div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {selectedVehicle.location && (
                <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#4a8a4a', textTransform: 'uppercase' }}>Velocidad</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600' }}>{velocidadKmh(selectedVehicle.location.speed)} km/h</div>
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
                  </div>
                </div>
              )}

              <div style={{ borderTop: '1px solid #1a3d1a', paddingTop: '1.25rem' }}>
                <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: '#e0e0e0' }}>Agregar Comentario</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <select value={comentarioRapido.tipo} onChange={e => setComentarioRapido({...comentarioRapido, tipo: e.target.value})}
                    style={{ padding: '0.55rem 0.75rem', border: '1px solid #1a3d1a', borderRadius: '8px', fontSize: '0.85rem', background: '#ffffff', color: '#000000' }}>
                    <option value="seguimiento">Seguimiento</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="alerta">Alerta</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ ...s.label, display: 'block', marginBottom: '0.3rem' }}>Destino</label>
                  <select value={destinoInput} onChange={e => setDestinoInput(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #1a3d1a', borderRadius: '8px', fontSize: '0.85rem', background: '#ffffff', color: '#000000' }}>{geofenceOptions(destinoInput)}</select>
                </div>
                {calculandoEta && (
                  <div style={{ padding: '0.6rem 0.75rem', background: '#1a1a1a', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem', color: '#f59e0b', border: '1px solid #f59e0b33' }}>
                    Calculando ruta...
                  </div>
                )}
                {etaError && !calculandoEta && (
                  <div role="alert" style={{ padding: '0.6rem 0.75rem', background: '#2a1111', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.82rem', color: '#fca5a5', border: '1px solid #ef444455' }}>
                    {etaError}
                  </div>
                )}
                {etaData && !calculandoEta && (
                  <div style={{ padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px', marginBottom: '0.75rem', border: '1px solid #10b98133' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: '#4a8a4a', textTransform: 'uppercase' }}>ETA</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#10b981' }}>{etaData.fechaLlegada || etaData.horaLlegada}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: '#4a8a4a', textTransform: 'uppercase' }}>Tiempo</div>
                        <div style={{ fontSize: '1rem', fontWeight: '600' }}>{etaData.duracion}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: '#4a8a4a', textTransform: 'uppercase' }}>Distancia</div>
                        <div style={{ fontSize: '1rem', fontWeight: '600' }}>{etaData.distancia}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#4a8a4a', marginTop: '0.5rem', textAlign: 'center' }}>{etaData.destinoNombre}</div>
                  </div>
                )}
                <textarea placeholder="Escribe el mensaje de seguimiento..." value={comentarioRapido.contenido} onChange={e => setComentarioRapido({...comentarioRapido, contenido: e.target.value})}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #1a3d1a', borderRadius: '8px', fontSize: '0.85rem', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box', background: '#ffffff', color: '#000000' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                  <button onClick={guardarComentarioRapido}
                    style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.55rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>
                    Guardar Comentario
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>);
}

export function ViajeModal({
  setShowViajeModal,
  setViajeEditando,
  setViajeForm,
  viajeEditando,
  eliminarViaje,
  viajeDetalle,
  setViajeDetalle,
  s,
  viajeForm,
  vehiculos,
  operadores,
  obtenerRemolqueAsignadoUnidad,
  geofenceOptions,
  obtenerOpcionesRemolque,
  actualizarViaje,
  viajeSaving,
  estadoColors,
  geocercasCoincidentes,
  parseFecha,
  actualizarParadaViaje,
  formatFechaProgramada,
  mapas,
  mapaUrl,
  googleUrlSeguro,
  googleMyMapsEmbedUrl,
}) {
  return (<div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => { setShowViajeModal(false); setViajeEditando(false); setViajeForm({}); }}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-label={viajeEditando ? 'Editar viaje' : 'Detalles del viaje'} style={{ background: '#0d1a0d', border: '1px solid #1a3d1a', borderRadius: '12px', padding: '1.5rem', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#00ff41' }}>{viajeEditando ? 'Editar Viaje' : 'Detalles del Viaje'}</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {!viajeEditando && (
                  <>
                    <button onClick={async () => { if (await eliminarViaje(viajeDetalle.id)) { setShowViajeModal(false); setViajeDetalle(null); setViajeForm({}); } }} style={{ ...s.button('#ef4444'), padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>Eliminar</button>
                    <button onClick={() => setViajeEditando(true)} style={{ ...s.button('#f59e0b'), padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>Editar</button>
                  </>
                )}
                 <button onClick={() => { setShowViajeModal(false); setViajeEditando(false); setViajeForm({}); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
              </div>
            </div>

            {viajeEditando ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={s.label}>Unidad</label>
                    <select style={s.select} value={viajeForm.vehicle_id || ''} onChange={(e) => {
                      const v = vehiculos.find(vh => String(vh.id) === e.target.value);
                      const op = operadores[e.target.value];
                      setViajeForm({
                        ...viajeForm,
                        vehicle_id: e.target.value,
                        vehicle_name: v?.name || '',
                         conductor: op?.nombre || '',
                        telefono: op?.telefono || '',
                        remolque: v ? obtenerRemolqueAsignadoUnidad(e.target.value, v.name) : '',
                      });
                    }}>
                      <option value="">Seleccionar...</option>
                      {vehiculos.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Estado</label>
                    <select style={s.select} value={viajeForm.estado || ''} onChange={(e) => setViajeForm({ ...viajeForm, estado: e.target.value })}>
                      <option value="disponible">Disponible</option>
                      <option value="programado">Programado</option>
                      <option value="en_ruta_vacio">En Ruta Vacío</option>
                      <option value="en_ruta_cargado">En Ruta Cargado</option>
                      <option value="espera_ingreso">En Espera de Ingreso</option>
                      <option value="proceso_carga">En Proceso de Carga</option>
                      <option value="proceso_descarga">En Proceso de Descarga</option>
                      <option value="proceso_liberacion">En Proceso de Liberación</option>
                      <option value="en_resguardo">En Resguardo</option>
                      <option value="completado">Completado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={s.label}>Conductor</label>
                  <input style={s.input} value={viajeForm.conductor || ''} onChange={(e) => setViajeForm({ ...viajeForm, conductor: e.target.value })} />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={s.label}>Teléfono</label>
                  <input style={s.input} value={viajeForm.telefono || ''} onChange={(e) => setViajeForm({ ...viajeForm, telefono: e.target.value })} />
                </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <div>
                      <label style={s.label}>Origen</label>
                       <select style={s.select} value={viajeForm.origen || ''} onChange={(e) => setViajeForm({ ...viajeForm, origen: e.target.value })}>{geofenceOptions(viajeForm.origen)}</select>
                    </div>
                  </div>

                  <div className="trip-delivery-type" role="group" aria-label="Tipo de entrega">
                    <button type="button" className={viajeForm.tipo_entrega !== 'reparto' ? 'active' : ''} onClick={() => setViajeForm(prev => ({ ...prev, tipo_entrega: 'directo', destino: parseDestinos(prev.destinos).at(-1) || prev.destino }))}>Destino único</button>
                    <button type="button" className={viajeForm.tipo_entrega === 'reparto' ? 'active' : ''} onClick={() => setViajeForm(prev => ({ ...prev, tipo_entrega: 'reparto', destinos: parseDestinos(prev.destinos).length >= 2 ? prev.destinos : [prev.destino || '', ''] }))}>Reparto</button>
                  </div>
                  {viajeForm.tipo_entrega === 'reparto' ? (
                    <div className="trip-stops-editor">
                      <label style={s.label}>Destinos en orden</label>
                      {(viajeForm.destinos || ['', '']).map((destino, index) => (
                        <div className="trip-stop-input" key={index}>
                          <span>{index + 1}</span>
                           <select style={s.select} aria-label={`Destino ${index + 1}`} value={destino} onChange={(e) => setViajeForm(prev => ({ ...prev, destinos: prev.destinos.map((item, itemIndex) => itemIndex === index ? e.target.value : item) }))}>{geofenceOptions(destino)}</select>
                          <button type="button" disabled={viajeForm.destinos.length <= 2} onClick={() => setViajeForm(prev => ({ ...prev, destinos: prev.destinos.filter((_, itemIndex) => itemIndex !== index) }))} aria-label={`Eliminar destino ${index + 1}`}>Quitar</button>
                        </div>
                      ))}
                      <button type="button" className="trip-add-stop" onClick={() => setViajeForm(prev => ({ ...prev, destinos: [...prev.destinos, ''] }))}>+ Agregar destino</button>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={s.label}>Destino</label>
                       <select style={s.select} value={viajeForm.destino || ''} onChange={(e) => setViajeForm({ ...viajeForm, destino: e.target.value })}>{geofenceOptions(viajeForm.destino)}</select>
                    </div>
                  )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={s.label}>Fecha Inicio</label>
                    <input style={s.input} type="datetime-local" value={viajeForm.fecha_inicio || ''} onChange={(e) => setViajeForm({ ...viajeForm, fecha_inicio: e.target.value })} />
                  </div>
                  <div>
                    <label style={s.label}>Fecha Fin</label>
                    <input style={s.input} type="datetime-local" value={viajeForm.fecha_fin || ''} onChange={(e) => setViajeForm({ ...viajeForm, fecha_fin: e.target.value })} />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={s.label}>Remolque</label>
                  <select style={s.select} value={viajeForm.remolque || ''} onChange={(e) => setViajeForm({ ...viajeForm, remolque: e.target.value })}>
                    <option value="">Sin remolque</option>
                    {obtenerOpcionesRemolque(viajeForm.vehicle_id).map(r => (
                      <option key={r.key} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={s.label}>Notas</label>
                  <textarea style={{ ...s.input, minHeight: '80px', resize: 'vertical' }} value={viajeForm.notas || ''} onChange={(e) => setViajeForm({ ...viajeForm, notas: e.target.value })} />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                   <button onClick={() => { setViajeForm(normalizarViaje(viajeDetalle)); setViajeEditando(false); }} style={s.button('#6b7280')}>Cancelar</button>
                  <button onClick={actualizarViaje} disabled={viajeSaving} style={s.button('#10b981')}>{viajeSaving ? 'Guardando...' : 'Guardar'}</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #1a3d1a' }}>
                    <div style={{ fontSize: '0.7rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Unidad</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1rem', fontWeight: '600', color: '#00ff41' }}>{viajeDetalle.vehicle_name || viajeDetalle.vehicle_id}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b', background: '#332200', border: '1px solid #f59e0b55', borderRadius: '10px', padding: '2px 8px' }}>🚛 {viajeDetalle.remolque || viajeDetalle.seg_remolque || 'Sin remolque'}</span>
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #1a3d1a' }}>
                    <div style={{ fontSize: '0.7rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Estado</div>
                     <div style={{ fontSize: '1rem', fontWeight: '600', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                       <span style={s.badge(estadoColors[viajeDetalle.estado] || '#6a9b6a')}>{viajeDetalle.estado}</span>
                       {viajeDetalle.tipo_entrega === 'reparto' && <span className="trip-reparto-badge">Reparto</span>}
                    </div>
                  </div>
                </div>

                <div style={{ padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #1a3d1a', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Conductor</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '600' }}>{viajeDetalle.conductor || 'Sin asignar'}</div>
                  {viajeDetalle.telefono && <div style={{ fontSize: '0.8rem', color: '#6a9b6a', marginTop: '0.2rem' }}>📱 {viajeDetalle.telefono}</div>}
                </div>

                <div style={{ padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #1a3d1a', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Ruta</div>
                   <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1.5fr)', gap: '0.75rem', alignItems: 'start' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6a9b6a', marginBottom: '0.2rem' }}>Origen</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{viajeDetalle.origen || '-'}</div>
                    </div>
                    <div style={{ fontSize: '1.5rem', color: '#00ff41' }}>→</div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#6a9b6a', marginBottom: '0.2rem' }}>{viajeDetalle.tipo_entrega === 'reparto' ? 'Paradas' : 'Destino'}</div>
                        {viajeDetalle.tipo_entrega === 'reparto' ? (
                          (() => {
                            const paradas = paradasViaje(viajeDetalle);
                            const completadas = paradas.filter(parada => parada.estado === 'completada').length;
                            const statusMeta = {
                              pendiente: { label: 'Pendiente', color: '#6b7280' },
                              en_camino: { label: 'En camino', color: '#3b82f6' },
                              llego: { label: 'En geocerca', color: '#f59e0b' },
                              completada: { label: 'Completada', color: '#10b981' },
                              omitida: { label: 'Omitida', color: '#ef4444' },
                            };
                            return (
                              <div style={{ display: 'grid', gap: '0.55rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', color: completadas === paradas.length ? '#00ff41' : '#f59e0b', fontSize: '0.72rem', fontWeight: 700 }}>
                                  <span>{completadas} de {paradas.length} completadas</span>
                                  <span>{paradas.length ? Math.round(completadas / paradas.length * 100) : 0}%</span>
                                </div>
                                <div style={{ height: '7px', borderRadius: '5px', background: '#202020', overflow: 'hidden' }}>
                                  <div style={{ width: `${paradas.length ? completadas / paradas.length * 100 : 0}%`, height: '100%', background: '#10b981', transition: 'width 0.25s ease' }} />
                                </div>
                                {paradas.map(parada => {
                                  const meta = statusMeta[parada.estado] || statusMeta.pendiente;
                                  return (
                                    <div key={parada.id || `${viajeDetalle.id}-${parada.orden}`} style={{ padding: '0.65rem', border: `1px solid ${meta.color}55`, borderRadius: '8px', background: `${meta.color}0d` }}>
                                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                        <span style={{ display: 'inline-grid', placeItems: 'center', width: '23px', height: '23px', flex: '0 0 23px', borderRadius: '50%', background: `${meta.color}22`, color: meta.color, fontSize: '0.68rem', fontWeight: 800 }}>{parada.orden}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <strong style={{ color: '#e5e7eb', fontSize: '0.78rem', overflowWrap: 'anywhere' }}>{parada.destino}</strong>
                                            <span style={s.badge(meta.color)}>{meta.label}</span>
                                          </div>
                                          {geocercasCoincidentes(parada.destino).map(name => <div key={name} style={{ color: '#6a9b6a', fontSize: '0.67rem', marginTop: '0.2rem' }}>📍 {name}</div>)}
                                          {(parada.hora_programada || parada.hora_llegada || parada.hora_salida) && (
                                            <div style={{ marginTop: '0.35rem', color: '#94a3b8', fontSize: '0.65rem', lineHeight: 1.45 }}>
                                              {parada.hora_programada && <div style={{ color: '#8b5cf6' }}>Programada: {parseFecha(parada.hora_programada)?.toLocaleString('es-MX')}</div>}
                                              {parada.hora_llegada && <div>Primer contacto: {parseFecha(parada.hora_llegada)?.toLocaleString('es-MX')}</div>}
                                              {parada.hora_salida && <div>Último contacto: {parseFecha(parada.hora_salida)?.toLocaleString('es-MX')}</div>}
                                            </div>
                                          )}
                                          {parada.id && ['en_camino', 'llego'].includes(parada.estado) && (
                                            <button type="button" onClick={() => actualizarParadaViaje(parada, parada.estado === 'llego' ? 'completada' : 'llego')} style={{ ...s.button(parada.estado === 'llego' ? '#10b981' : '#f59e0b'), marginTop: '0.45rem', padding: '0.3rem 0.55rem', fontSize: '0.68rem' }}>
                                              {parada.estado === 'llego' ? 'Registrar salida' : 'Registrar llegada'}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()
                        ) : (
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#60a5fa' }}>{viajeDetalle.destino || '-'}</div>
                            {geocercasCoincidentes(viajeDetalle.destino).map(name => <div key={name} style={{ color: '#6a9b6a', fontSize: '0.67rem', marginTop: '0.2rem' }}>📍 {name}</div>)}
                            {(viajeDetalle.hora_llegada || viajeDetalle.hora_salida) && (
                              <div style={{ marginTop: '0.35rem', color: '#94a3b8', fontSize: '0.65rem', lineHeight: 1.45 }}>
                                {viajeDetalle.hora_llegada && <div>Primer contacto: {parseFecha(viajeDetalle.hora_llegada)?.toLocaleString('es-MX')}</div>}
                                {viajeDetalle.hora_salida && <div>Último contacto: {parseFecha(viajeDetalle.hora_salida)?.toLocaleString('es-MX')}</div>}
                  </div>
                )}
              </div>
            )}
                    </div>
                  </div>
                </div>

                {(() => {
                  const normalizarMatch = value => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                  const listaMapas = Array.isArray(mapas) ? mapas : [];
                  const mapaExacto = listaMapas.find(mapa => mapa.origen && mapa.destino && normalizarMatch(mapa.origen) === normalizarMatch(viajeDetalle.origen) && normalizarMatch(mapa.destino) === normalizarMatch(viajeDetalle.destino));
                  const mapaPorOrigen = !mapaExacto && listaMapas.find(mapa => mapa.origen && geocercasCoincidentes(viajeDetalle.origen).some(nombre => normalizarMatch(nombre) === normalizarMatch(mapa.origen)));
                  const mapaViaje = mapaExacto || mapaPorOrigen;
                  if (!mapaViaje) return null;
                  const urlSegura = googleUrlSeguro(mapaUrl(mapaViaje));
                  const embedUrl = googleMyMapsEmbedUrl(urlSegura);
                  return (
                    <div style={{ padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #1a3d1a', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.7rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Mapa de la ruta</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>{mapaViaje.nombre} {urlSegura && <a href={urlSegura} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>Abrir en Google</a>}</div>
                      {embedUrl ? (
                        <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #1a3d1a' }}>
                          <iframe src={embedUrl} title={`Mapa ${mapaViaje.nombre}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen style={{ width: '100%', height: '280px', border: 'none', display: 'block' }} />
                        </div>
                      ) : urlSegura ? (
                        <a href={urlSegura} target="_blank" rel="noopener noreferrer" style={s.button('#60a5fa')}>Ver ruta en Google</a>
                      ) : null}
                    </div>
                  );
                })()}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #1a3d1a' }}>
                    <div style={{ fontSize: '0.7rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Fecha Inicio</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                      {viajeDetalle.fecha_inicio ? formatFechaProgramada(viajeDetalle.fecha_inicio) : '-'}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #1a3d1a' }}>
                    <div style={{ fontSize: '0.7rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{viajeDetalle.tipo_entrega === 'reparto' ? 'Fin 1ra parada' : 'Fecha Fin'}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                      {viajeDetalle.tipo_entrega === 'reparto' ? (() => {
                        const primera = paradasViaje(viajeDetalle)[0];
                        return (primera?.hora_programada || viajeDetalle.fecha_fin) ? formatFechaProgramada(primera?.hora_programada || viajeDetalle.fecha_fin) : '-';
                      })() : (viajeDetalle.fecha_fin ? formatFechaProgramada(viajeDetalle.fecha_fin) : '-')}
                    </div>
                  </div>
                </div>

                {viajeDetalle.notas && (
                  <div style={{ padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #1a3d1a', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Notas</div>
                    <div style={{ fontSize: '0.85rem', color: '#e0e0e0', lineHeight: '1.5' }}>{viajeDetalle.notas}</div>
                  </div>
                )}

                <div style={{ padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #1a3d1a' }}>
                  <div style={{ fontSize: '0.7rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Creado</div>
                  <div style={{ fontSize: '0.85rem', color: '#6a9b6a' }}>
                    {viajeDetalle.created_at ? parseFecha(viajeDetalle.created_at)?.toLocaleString('es-MX') : '-'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>);
}

export function SeguimientoUpdateModal({
  setShowSeguimientoUpdateModal,
  s,
  todasLasUnidades,
  seguimientoModalUnidadId,
  obtenerSeguimientoUnidad,
  seleccionarUnidadSeguimiento,
  obtenerViajesUnidad,
  operadores,
  seguimientoModalGrupo,
  setSeguimientoModalGrupo,
  seguimientoModalNota,
  setSeguimientoModalNota,
  seguimientoModalError,
  guardarActualizacionSeguimiento,
  seguimientoModalSaving,
}) {
  return (<div className="modal-backdrop"
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200, padding: '1rem' }}
            onClick={() => setShowSeguimientoUpdateModal(false)}
          >
            <div className="modal-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Actualizar seguimiento"
              style={{ width: 'min(1200px, 96vw)', height: 'min(86vh, 920px)', background: '#0d0d0d', border: '1px solid #1a3d1a', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.55)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #1a3d1a' }}>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#00ff41' }}>Actualizar Seguimiento</div>
                  <div style={{ fontSize: '0.8rem', color: '#6a9b6a' }}>Selecciona una unidad, revisa su viaje y agrega observaciones</div>
                </div>
                <button onClick={() => setShowSeguimientoUpdateModal(false)} style={s.button('#6b7280')}>Cerrar</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: 'calc(100% - 66px)' }}>
                <div style={{ borderRight: '1px solid #1a3d1a', overflow: 'auto', padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#4a8a4a', marginBottom: '0.75rem' }}>Unidades</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {todasLasUnidades.map(u => {
                      const activo = String(seguimientoModalUnidadId) === String(u.id);
                      const fila = obtenerSeguimientoUnidad(u.name || u.nombre || '');
                      return (
                        <button
                          key={u.id}
                          onClick={() => seleccionarUnidadSeguimiento(u.id)}
                          style={{
                            textAlign: 'left', padding: '0.8rem', borderRadius: '10px', border: activo ? '1px solid #00ff41' : '1px solid #1f1f1f',
                            background: activo ? '#0d2b0d' : '#111111', color: '#e0e0e0', cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                            <strong style={{ fontSize: '0.9rem' }}>{u.name || u.nombre}</strong>
                            <span style={s.badge(u.isLocal ? '#8b5cf6' : u.isOnline ? '#10b981' : '#ef4444')}>{u.isLocal ? 'Local' : u.isOnline ? 'Online' : 'Offline'}</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#6a9b6a', marginTop: '0.25rem' }}>
                            {fila?.grupo ? `Grupo: ${fila.grupo} · ` : ''}{fila?.estatus || u.estatus || 'Sin estatus'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ padding: '1rem', overflow: 'auto' }}>
                  {!seguimientoModalUnidadId ? (
                    <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#6a9b6a' }}>Selecciona una unidad para ver su avance</div>
                  ) : (() => {
                    const unidad = todasLasUnidades.find(v => String(v.id) === String(seguimientoModalUnidadId));
                    const nombreUnidad = unidad?.name || unidad?.nombre || '';
                    const fila = obtenerSeguimientoUnidad(nombreUnidad);
                    const viajesUnidad = obtenerViajesUnidad(nombreUnidad, unidad?.id);
                    const viajesVigentes = viajesUnidad.filter(v => !['completado', 'cancelado'].includes(String(v.estado || '').toLowerCase()));
                    const viajeActual = viajesVigentes[0] || null;
                    const viajeSiguiente = viajesVigentes[1] || null;
                    const estadoViaje = String(viajeActual?.estado || viajeSiguiente?.estado || fila?.estatus || 'programado').toLowerCase();
                    const etapas = [
                      { key: 'programado', label: 'Programado' },
                      { key: 'carga', label: 'Carga' },
                      { key: 'ruta', label: 'En ruta' },
                      { key: 'entrega', label: 'Entrega' },
                      { key: 'completado', label: 'Completado' },
                    ];
                    const pasoActual = estadoViaje.includes('cargado') ? 2 : estadoViaje.includes('vacio') ? 2 : estadoViaje.includes('carga') ? 1 : estadoViaje.includes('descarga') || estadoViaje.includes('liberacion') ? 3 : estadoViaje === 'completado' ? 4 : 0;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#e0e0e0' }}>{nombreUnidad}</div>
                            <div style={{ fontSize: '0.8rem', color: '#6a9b6a' }}>{operadores[String(unidad?.id)]?.nombre || fila?.operador || 'Sin operador'}{fila?.remolque ? ` · Remolque ${fila.remolque}` : ''}</div>
                          </div>
                          <span style={s.badge(fila?.estatus === 'Disponible' ? '#6b7280' : '#10b981')}>{fila?.estatus || 'Sin seguimiento'}</span>
                        </div>

                        <div style={{ padding: '1rem', background: '#111111', border: '1px solid #1a3d1a', borderRadius: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
                            <div>
                              <div style={{ fontSize: '0.7rem', color: '#4a8a4a', textTransform: 'uppercase' }}>Viaje Actual</div>
                              <div style={{ color: '#e0e0e0', fontWeight: 700 }}>{viajeActual ? `${viajeActual.origen || '-'} → ${viajeActual.destino || '-'}` : 'Sin viaje activo'}</div>
                              {viajeActual && <div style={{ fontSize: '0.75rem', color: '#6a9b6a', marginTop: '0.2rem' }}>{viajeActual.conductor || 'Sin conductor'}</div>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.7rem', color: '#4a8a4a', textTransform: 'uppercase' }}>Siguiente</div>
                              <div style={{ color: '#f59e0b', fontWeight: 700 }}>{viajeSiguiente ? `${viajeSiguiente.origen || '-'} → ${viajeSiguiente.destino || '-'}` : 'Sin viaje siguiente'}</div>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '0.9rem' }}>
                            {etapas.map((step, idx) => {
                              const active = idx <= pasoActual;
                              return (
                                <div key={step.key} style={{ textAlign: 'center', padding: '0.55rem 0.4rem', borderRadius: '10px', background: active ? '#0d2b0d' : '#0a0a0a', border: `1px solid ${active ? '#00ff41' : '#1f1f1f'}`, color: active ? '#00ff41' : '#6a9b6a', fontSize: '0.75rem', fontWeight: 700 }}>
                                  {step.label}
                                </div>
                              );
                            })}
                          </div>

                          <div style={{ height: '10px', background: '#0a0a0a', borderRadius: '999px', overflow: 'hidden', border: '1px solid #1a3d1a', marginBottom: '0.75rem' }}>
                            <div style={{ width: `${((pasoActual + 1) / 5) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #00ff41)' }} />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem', color: '#c0c0c0' }}>
                            <div>Origen: <strong style={{ color: '#e0e0e0' }}>{viajeActual?.origen || fila?.origen || '-'}</strong></div>
                            <div>Destino: <strong style={{ color: '#e0e0e0' }}>{viajeActual?.destino || fila?.destino || '-'}</strong></div>
                            <div>Cita carga: <strong style={{ color: '#e0e0e0' }}>{viajeActual?.fecha_inicio || fila?.cita_carga || '-'}</strong></div>
                            <div>Cita descarga: <strong style={{ color: '#e0e0e0' }}>{viajeActual?.fecha_fin || fila?.cita_descarga || '-'}</strong></div>
                          </div>
                        </div>

                        <div style={{ padding: '1rem', background: '#111111', border: '1px solid #1a3d1a', borderRadius: '12px' }}>
                          <div style={{ marginBottom: '0.85rem' }}>
                            <label htmlFor="seguimiento-modal-grupo" style={{ ...s.label, display: 'block', marginBottom: '0.35rem' }}>Grupo a reportar *</label>
                            <input
                              id="seguimiento-modal-grupo"
                              list="seguimiento-group-suggestions"
                              value={seguimientoModalGrupo}
                              onChange={(e) => setSeguimientoModalGrupo(e.target.value)}
                              placeholder="Ej: Bachoco, Operaciones Norte..."
                              style={{ ...s.input, width: '100%', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Observación</div>
                          <textarea
                            value={seguimientoModalNota}
                            onChange={(e) => setSeguimientoModalNota(e.target.value)}
                            placeholder="Escribe aquí la observación de seguimiento..."
                            style={{ width: '100%', minHeight: '120px', resize: 'vertical', borderRadius: '10px', border: '1px solid #1a3d1a', background: '#fff', color: '#000', padding: '0.8rem', fontFamily: 'inherit' }}
                          />
                          {seguimientoModalError && <div style={{ color: '#f87171', marginTop: '0.6rem', fontSize: '0.85rem' }}>{seguimientoModalError}</div>}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                            <button onClick={() => setShowSeguimientoUpdateModal(false)} style={s.button('#6b7280')}>Cancelar</button>
                            <button onClick={guardarActualizacionSeguimiento} disabled={seguimientoModalSaving} style={s.button('#10b981')}>
                              {seguimientoModalSaving ? 'Guardando...' : 'Guardar Observación'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>);
}

export function MensajeModal({
  setShowMensajeModal,
  s,
  mensajeCliente,
  actualizarMensaje,
  gruposUnicos,
  mensajeTexto,
  setMensajeTexto,
  copiarMensaje,
  enviarWhatsApp,
}) {
  return (<div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowMensajeModal(false)}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-label="Generar mensaje de seguimiento" style={{ background: '#0d1a0d', border: '1px solid #1a3d1a', borderRadius: '12px', padding: '1.5rem', maxWidth: '700px', width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#00ff41' }}>Generar Mensaje de Seguimiento</h2>
              <button onClick={() => setShowMensajeModal(false)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Seleccionar Cliente/Grupo</label>
              <select style={s.select} value={mensajeCliente} onChange={(e) => actualizarMensaje(e.target.value)}>
                <option value="">Seleccionar grupo...</option>
                {gruposUnicos.map(grupo => (
                  <option key={grupo} value={grupo}>{grupo}</option>
                ))}
              </select>
            </div>

            {mensajeTexto && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={s.label}>Mensaje Generado</label>
                <textarea
                  value={mensajeTexto}
                  onChange={(e) => setMensajeTexto(e.target.value)}
                  style={{ ...s.input, minHeight: '300px', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.6' }}
                />
              </div>
            )}

            {mensajeTexto && (
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button onClick={copiarMensaje} style={s.button('#10b981')}>📋 Copiar</button>
                <button onClick={enviarWhatsApp} style={s.button('#25D366')}>📲 WhatsApp</button>
              </div>
            )}
          </div>
        </div>);
}

export function PendienteModal({
  cerrarPendiente,
  pendienteEditando,
  guardarPendiente,
  s,
  formPendiente,
  setFormPendiente,
  eliminarPendiente,
  pendienteSaving,
  parseFecha,
  nuevoComentarioPendiente,
  setNuevoComentarioPendiente,
  agregarComentarioPendiente,
}) {
  return (<div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={cerrarPendiente}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="pendiente-modal-title" style={{ background: '#0d1a0d', border: '1px solid #1a3d1a', borderRadius: '12px', padding: '1.5rem', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 id="pendiente-modal-title" style={{ margin: 0, fontSize: '1.2rem', color: '#00ff41' }}>{pendienteEditando ? 'Detalles del Pendiente' : 'Nuevo Pendiente'}</h2>
              <button aria-label="Cerrar" onClick={cerrarPendiente} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
            </div>
            <form onSubmit={guardarPendiente}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={s.label}>Título *</label>
                <input style={s.input} placeholder="Ej: Revisar unidad GERS-243" value={formPendiente.titulo} onChange={(e) => setFormPendiente({ ...formPendiente, titulo: e.target.value })} required readOnly={!!pendienteEditando} autoFocus />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={s.label}>Descripción</label>
                <textarea style={{ ...s.input, minHeight: '60px', resize: 'vertical' }} placeholder="Detalles del pendiente..." value={formPendiente.descripcion} onChange={(e) => setFormPendiente({ ...formPendiente, descripcion: e.target.value })} readOnly={!!pendienteEditando} />
              </div>
              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: pendienteEditando ? '1fr 1fr 1fr' : '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={s.label}>Prioridad</label>
                  <select style={s.select} value={formPendiente.prioridad} onChange={(e) => setFormPendiente({ ...formPendiente, prioridad: e.target.value })}>
                    <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
                  </select>
                </div>
                <div>
                  <label style={s.label}>Turno</label>
                  <select style={s.select} value={formPendiente.turno} onChange={(e) => setFormPendiente({ ...formPendiente, turno: e.target.value })} disabled={!!pendienteEditando}>
                    <option value="">Sin turno</option><option value="mañana">Mañana</option><option value="tarde">Tarde</option><option value="noche">Noche</option>
                  </select>
                </div>
                {pendienteEditando && <div>
                  <label style={s.label}>Estado</label>
                  <select style={s.select} value={formPendiente.estado} disabled>
                    <option value="pendiente">Pendiente</option><option value="en_proceso">En proceso</option><option value="completado">Completado</option>
                  </select>
                </div>}
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={s.label}>Asignado a</label>
                <input style={s.input} placeholder="Nombre del monitorista" value={formPendiente.asignado_a} onChange={(e) => setFormPendiente({ ...formPendiente, asignado_a: e.target.value })} readOnly={!!pendienteEditando} />
              </div>
              {pendienteEditando && <div style={{ marginBottom: '1rem', color: '#6a9b6a', fontSize: '0.8rem' }}>Solo se puede modificar la prioridad.</div>}
              <div className="modal-actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                {pendienteEditando && <button type="button" onClick={async () => { const ok = await eliminarPendiente(pendienteEditando.id); if (ok) cerrarPendiente(); }} style={s.button('#ef4444')}>Eliminar</button>}
                <button type="button" onClick={cerrarPendiente} style={s.button('#6b7280')}>Cancelar</button>
                <button type="submit" disabled={pendienteSaving} style={s.button('#10b981')}>{pendienteSaving ? 'Guardando...' : pendienteEditando ? 'Guardar prioridad' : 'Guardar'}</button>
              </div>
            </form>
            {pendienteEditando && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={s.label}>Comentarios</label>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '0.75rem' }}>
                    {(pendienteEditando.comentarios || []).length === 0 ? (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#4a4a4a', fontSize: '0.85rem' }}>Sin comentarios</div>
                    ) : (
                      pendienteEditando.comentarios.map(c => (
                        <div key={c.id} style={{ padding: '0.75rem', background: '#1a1a1a', borderRadius: '6px', marginBottom: '0.5rem', border: '1px solid #1a3d1a' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#00ff41', fontWeight: '600' }}>{c.created_by_username || c.autor || 'Anónimo'}</span>
                            <span style={{ fontSize: '0.7rem', color: '#4a4a4a' }}>{parseFecha(c.fecha_creacion)?.toLocaleString('es-MX') || '-'}</span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#e0e0e0', whiteSpace: 'pre-wrap' }}>{c.contenido}</div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="inline-form" style={{ display: 'flex', gap: '0.5rem' }}>
                    <input style={{ ...s.input, flex: 1 }} placeholder="Agregar comentario..." value={nuevoComentarioPendiente} onChange={(e) => setNuevoComentarioPendiente(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && nuevoComentarioPendiente.trim()) { e.preventDefault(); agregarComentarioPendiente(pendienteEditando.id, nuevoComentarioPendiente); } }} />
                    <button type="button" onClick={() => { if (nuevoComentarioPendiente.trim()) agregarComentarioPendiente(pendienteEditando.id, nuevoComentarioPendiente); }} style={s.button('#10b981')}>Agregar</button>
                  </div>
                </div>
            )}
          </div>
        </div>);
}

export function HistorialModal({
  setShowHistorialModal,
  historialPendientes,
  s,
  parseFecha,
}) {
  return (<div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }} onClick={() => setShowHistorialModal(false)}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-label="Historial de pendientes" style={{ background: '#0d1a0d', border: '1px solid #1a3d1a', borderRadius: '12px', padding: '1.5rem', maxWidth: '1100px', width: '95%', maxHeight: '85vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#00ff41' }}>Historial de pendientes</h2>
              <button onClick={() => setShowHistorialModal(false)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
            </div>
            {historialPendientes.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6a9b6a' }}>No hay pendientes archivados.</div>
            ) : (
              <div style={{ overflow: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Título</th>
                      <th style={s.th}>Prioridad</th>
                      <th style={s.th}>Estado</th>
                      <th style={s.th}>Asignado</th>
                      <th style={s.th}>Turno</th>
                      <th style={s.th}>Archivado por</th>
                      <th style={s.th}>Archivado</th>
                      <th style={s.th}>Creado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialPendientes.map((item) => (
                      <tr key={item.id}>
                        <td style={s.td}>{item.titulo}</td>
                        <td style={s.td}>{item.prioridad || '-'}</td>
                        <td style={s.td}>{item.estado || '-'}</td>
                        <td style={s.td}>{item.asignado_a || '-'}</td>
                        <td style={s.td}>{item.turno || '-'}</td>
                        <td style={s.td}>{item.archived_by_username || 'Sistema'}</td>
                        <td style={s.td}>{parseFecha(item.archived_at)?.toLocaleString('es-MX') || '-'}</td>
                        <td style={s.td}>{parseFecha(item.fecha_creacion)?.toLocaleString('es-MX') || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>);
}

export function ExistingGeofenceModal({
  cerrarExistingGeofenceModal,
  selectedCliente,
  vincularExistingGeofence,
  existingGeofenceSaving,
  s,
  existingGeofenceSearch,
  setExistingGeofenceSearch,
  allGeofences,
  geofenceOwnerId,
  clientes,
  existingGeofenceSelections,
  setExistingGeofenceSelections,
}) {
  return (<div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2320 }} onClick={cerrarExistingGeofenceModal}>
          <form className="modal-panel" role="dialog" aria-modal="true" aria-label={`Seleccionar geocerca para ${selectedCliente.nombre}`} onSubmit={vincularExistingGeofence} style={{ background: '#0d0d0d', border: '1px solid #285b35', borderRadius: '16px', width: '720px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '1.35rem', boxShadow: '0 24px 70px rgba(0,0,0,0.6)' }} onClick={event => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ color: '#4ade80', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Catálogo de geocercas</div>
                <h2 style={{ margin: '0.25rem 0 0', color: '#f0fdf4' }}>Asociar a {selectedCliente.nombre}</h2>
                <p style={{ margin: '0.3rem 0 0', color: '#6a9b6a', fontSize: '0.82rem' }}>Incluye geocercas manuales, predefinidas y Samsara.</p>
              </div>
              <button type="button" disabled={existingGeofenceSaving} onClick={cerrarExistingGeofenceModal} aria-label="Cerrar" style={{ background: 'none', border: 0, color: '#ef4444', fontSize: '1.4rem', cursor: 'pointer' }}>✕</button>
            </div>
            <input type="search" autoFocus style={{ ...s.input, marginBottom: '0.75rem' }} value={existingGeofenceSearch} onChange={event => setExistingGeofenceSearch(event.target.value)} placeholder="Buscar por nombre, dirección o categoría..." />
            <div role="group" aria-label="Geocercas disponibles" style={{ minHeight: '180px', maxHeight: '48vh', overflowY: 'auto', border: '1px solid #1a3d1a', borderRadius: '10px', background: '#080d08', padding: '0.4rem' }}>
              {allGeofences
                .filter(geofence => geofence.activa !== 0)
                .filter(geofence => String(geofenceOwnerId(geofence) || '') !== String(selectedCliente.id))
                .filter(geofence => {
                  const search = existingGeofenceSearch.trim().toLowerCase();
                  return !search || [geofence.nombre, geofence.direccion, geofence.descripcion, geofence.categoria, geofence.source].some(value => String(value || '').toLowerCase().includes(search));
                })
                .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' }))
                .map(geofence => {
                  const source = geofence.source === 'samsara' ? 'samsara' : 'local';
                  const value = `${source}|${geofence.id}`;
                  const ownerId = geofenceOwnerId(geofence);
                  const owner = clientes.find(cliente => String(cliente.id) === String(ownerId));
                  const disabled = !!ownerId;
                  const checked = existingGeofenceSelections.includes(value);
                  return (
                    <label key={value} style={{ display: 'grid', gridTemplateColumns: '22px minmax(0, 1fr) auto', gap: '0.55rem', alignItems: 'center', padding: '0.65rem 0.7rem', marginBottom: '0.3rem', border: `1px solid ${checked ? '#00ff41' : '#182718'}`, borderRadius: '8px', background: checked ? '#102510' : '#0d120d', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
                      <input type="checkbox" disabled={disabled} checked={checked} onChange={() => setExistingGeofenceSelections(prev => checked ? prev.filter(item => item !== value) : [...prev, value])} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', color: '#e5ffe9', fontSize: '0.85rem', fontWeight: 700, overflowWrap: 'anywhere' }}>{geofence.nombre}</span>
                        <span style={{ display: 'block', color: '#5f8c65', fontSize: '0.7rem', marginTop: '0.15rem', overflowWrap: 'anywhere' }}>{geofence.direccion || geofence.descripcion || `${geofence.radio_metros || 0} m`}</span>
                      </span>
                      <span style={s.badge(source === 'samsara' ? '#8b5cf6' : '#3b82f6')}>{owner ? `Asignada a ${owner.nombre}` : source === 'samsara' ? 'Samsara' : geofence.categoria || 'Local'}</span>
                    </label>
                  );
                })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <span style={{ color: '#6a9b6a', fontSize: '0.8rem' }}>{existingGeofenceSelections.length} geocerca{existingGeofenceSelections.length === 1 ? '' : 's'} seleccionada{existingGeofenceSelections.length === 1 ? '' : 's'}</span>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button type="button" disabled={existingGeofenceSaving} onClick={cerrarExistingGeofenceModal} style={s.button('#6b7280')}>Cancelar</button>
                <button type="submit" disabled={existingGeofenceSaving || existingGeofenceSelections.length === 0} style={{ ...s.button('#00ff41'), minWidth: '150px', opacity: existingGeofenceSaving || existingGeofenceSelections.length === 0 ? 0.5 : 1 }}>{existingGeofenceSaving ? 'Asociando...' : 'Asociar geocercas'}</button>
              </div>
            </div>
          </form>
        </div>);
}

export function ClienteGeofenceModal({
  cerrarClienteGeofenceModal,
  selectedCliente,
  crearClienteGeofence,
  clienteGeofenceSaving,
  s,
  formClienteGeofence,
  setFormClienteGeofence,
}) {
  return (<div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2300 }} onClick={cerrarClienteGeofenceModal}>
          <form className="modal-panel" role="dialog" aria-modal="true" aria-label={`Nueva geocerca para ${selectedCliente.nombre}`} onSubmit={crearClienteGeofence} style={{ background: '#0d0d0d', border: '1px solid #285b35', borderRadius: '16px', width: '700px', maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto', padding: '1.5rem', boxShadow: '0 24px 70px rgba(0,0,0,0.6)' }} onClick={event => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.2rem' }}>
              <div>
                <div style={{ color: '#4ade80', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Geocerca de cliente</div>
                <h2 style={{ margin: '0.25rem 0 0', color: '#f0fdf4' }}>{selectedCliente.nombre}</h2>
                <p style={{ margin: '0.3rem 0 0', color: '#6a9b6a', fontSize: '0.82rem' }}>Puedes usar una dirección o capturar las coordenadas directamente.</p>
              </div>
              <button type="button" disabled={clienteGeofenceSaving} onClick={cerrarClienteGeofenceModal} aria-label="Cerrar" style={{ background: 'none', border: 0, color: '#ef4444', fontSize: '1.4rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.9rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={s.label}>Nombre de la geocerca *</label>
                <input autoFocus required style={s.input} value={formClienteGeofence.nombre} onChange={event => setFormClienteGeofence(current => ({ ...current, nombre: event.target.value }))} placeholder="Ej: CEDIS Cliente Chihuahua" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={s.label}>Dirección</label>
                <input style={s.input} value={formClienteGeofence.direccion} onChange={event => setFormClienteGeofence(current => ({ ...current, direccion: event.target.value }))} placeholder="Dirección completa para localizar automáticamente" />
              </div>
              <div>
                <label style={s.label}>Latitud</label>
                <input type="number" step="any" min="-90" max="90" style={s.input} value={formClienteGeofence.latitud} onChange={event => setFormClienteGeofence(current => ({ ...current, latitud: event.target.value }))} placeholder="28.6353" />
              </div>
              <div>
                <label style={s.label}>Longitud</label>
                <input type="number" step="any" min="-180" max="180" style={s.input} value={formClienteGeofence.longitud} onChange={event => setFormClienteGeofence(current => ({ ...current, longitud: event.target.value }))} placeholder="-106.0889" />
              </div>
              <div>
                <label style={s.label}>Radio (metros)</label>
                <input required type="number" min="1" max="100000" style={s.input} value={formClienteGeofence.radio_metros} onChange={event => setFormClienteGeofence(current => ({ ...current, radio_metros: event.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Color</label>
                <input type="color" style={{ ...s.input, height: '39px', padding: '4px' }} value={formClienteGeofence.color} onChange={event => setFormClienteGeofence(current => ({ ...current, color: event.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={s.label}>Descripción</label>
                <textarea rows={3} style={{ ...s.input, resize: 'vertical' }} value={formClienteGeofence.descripcion} onChange={event => setFormClienteGeofence(current => ({ ...current, descripcion: event.target.value }))} placeholder="Indicaciones o referencia operativa" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.2rem', flexWrap: 'wrap' }}>
              <button type="button" disabled={clienteGeofenceSaving} onClick={cerrarClienteGeofenceModal} style={s.button('#6b7280')}>Cancelar</button>
              <button type="submit" disabled={clienteGeofenceSaving} style={{ ...s.button('#00ff41'), minWidth: '160px', opacity: clienteGeofenceSaving ? 0.6 : 1 }}>{clienteGeofenceSaving ? 'Creando...' : 'Crear geocerca'}</button>
            </div>
          </form>
        </div>);
}

export function ClienteModal({
  cerrarClienteModal,
  clienteEditando,
  guardarCliente,
  clienteSaving,
  s,
  formCliente,
  setFormCliente,
}) {
  return (<div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.86)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2250 }} onClick={cerrarClienteModal}>
          <form className="modal-panel" role="dialog" aria-modal="true" aria-label={clienteEditando ? 'Editar cliente' : 'Nuevo cliente'} onSubmit={guardarCliente} style={{ background: '#0d0d0d', border: '1px solid #285b35', borderRadius: '16px', width: '600px', maxWidth: '95vw', padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.55)' }} onClick={event => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ color: '#4ade80', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{clienteEditando ? 'Actualizar registro' : 'Alta comercial'}</div>
                <h2 style={{ margin: '0.25rem 0 0', color: '#f0fdf4' }}>{clienteEditando ? 'Editar cliente' : 'Nuevo cliente'}</h2>
              </div>
              <button type="button" disabled={clienteSaving} onClick={cerrarClienteModal} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.4rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={s.label}>Nombre del cliente *</label>
                <input autoFocus required maxLength={150} style={s.input} value={formCliente.nombre} onChange={event => setFormCliente(current => ({ ...current, nombre: event.target.value }))} placeholder="Empresa o razón comercial" />
              </div>
              <div>
                <label style={s.label}>Persona de contacto</label>
                <input maxLength={150} style={s.input} value={formCliente.contacto} onChange={event => setFormCliente(current => ({ ...current, contacto: event.target.value }))} placeholder="Nombre del contacto" />
              </div>
              <div>
                <label style={s.label}>Teléfono</label>
                <input type="tel" maxLength={40} style={s.input} value={formCliente.telefono} onChange={event => setFormCliente(current => ({ ...current, telefono: event.target.value }))} placeholder="Ej: 614 123 4567" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={s.label}>Correo electrónico</label>
                <input type="email" maxLength={254} style={s.input} value={formCliente.email} onChange={event => setFormCliente(current => ({ ...current, email: event.target.value }))} placeholder="contacto@cliente.com" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={s.label}>Grupos de WhatsApp para reportes</label>
                {(formCliente.wpp_groups || []).map((grupo, index) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <input maxLength={150} style={s.input} value={grupo} onChange={event => setFormCliente(current => ({ ...current, wpp_groups: (current.wpp_groups || []).map((g, i) => i === index ? event.target.value : g) }))} placeholder="Nombre del grupo (ej: viajes GERS)" />
                    <button type="button" aria-label={`Quitar grupo ${grupo || index + 1}`} onClick={() => setFormCliente(current => ({ ...current, wpp_groups: (current.wpp_groups || []).filter((g, i) => i !== index) }))} style={s.button('#ef4444')}>✕</button>
                  </div>
                ))}
                <button type="button" onClick={() => setFormCliente(current => ({ ...current, wpp_groups: [...(current.wpp_groups || []), ''] }))} style={{ ...s.button('#3b82f6'), marginTop: '0.15rem' }}>+ Agregar grupo de WhatsApp</button>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
              <button type="button" disabled={clienteSaving} onClick={cerrarClienteModal} style={s.button('#6b7280')}>Cancelar</button>
              <button type="submit" disabled={clienteSaving} style={{ ...s.button('#00ff41'), minWidth: '140px', opacity: clienteSaving ? 0.6 : 1 }}>{clienteSaving ? 'Guardando...' : clienteEditando ? 'Guardar cambios' : 'Crear cliente'}</button>
            </div>
          </form>
        </div>);
}

export function RemolqueModal({
  cerrarRemolqueModal,
  remolqueEditando,
  s,
  formRemolque,
  setFormRemolque,
  crearRemolque,
}) {
  return (<div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200 }} onClick={cerrarRemolqueModal}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-label={remolqueEditando ? 'Editar remolque' : 'Nuevo remolque'} style={{ background: '#0d0d0d', border: '1px solid #1a3d1a', borderRadius: '16px', width: '520px', maxWidth: '95vw', padding: '1.5rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, color: '#00ff41' }}>{remolqueEditando ? 'Editar remolque' : 'Nuevo remolque'}</h2>
              <button onClick={cerrarRemolqueModal} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gap: '0.85rem' }}>
              <div>
                <label style={s.label}>Número</label>
                <input style={s.input} value={formRemolque.numero} onChange={(e) => setFormRemolque({ ...formRemolque, numero: e.target.value })} placeholder="Ej: 12345" />
              </div>
              <div>
                <label style={s.label}>Categoría</label>
                <select style={s.select} value={formRemolque.categoria} onChange={(e) => setFormRemolque({ ...formRemolque, categoria: e.target.value })}>
                  <option value="Thermo Refrigerado">Thermo Refrigerado</option>
                  <option value="Caja Seca">Caja Seca</option>
                  <option value="Porta Contenedores">Porta Contenedores</option>
                  <option value="Tanque">Tanque</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={cerrarRemolqueModal} style={s.button('#6b7280')}>Cancelar</button>
                <button type="button" onClick={crearRemolque} style={s.button('#00ff41')}>{remolqueEditando ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </div>
          </div>
        </div>);
}

export function MantenimientoModal({
  setShowMantenimientoModal,
  mantenimientoEditando,
  s,
  formMantenimiento,
  setFormMantenimiento,
  todasLasUnidades,
  remolques,
  mantenimientoSaving,
  guardarMantenimiento,
}) {
  return (<div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200 }} onClick={() => setShowMantenimientoModal(false)}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-label={mantenimientoEditando ? 'Editar mantenimiento' : 'Programar mantenimiento'} style={{ background: '#0d0d0d', border: '1px solid #1a3d1a', borderRadius: '16px', width: '620px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', padding: '1.5rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, color: '#00ff41' }}>{mantenimientoEditando ? 'Editar mantenimiento' : 'Programar mantenimiento'}</h2>
              <button onClick={() => setShowMantenimientoModal(false)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={s.label}>Tipo de equipo</label>
                  <select style={s.select} value={formMantenimiento.entidad_tipo} onChange={(e) => setFormMantenimiento({ ...formMantenimiento, entidad_tipo: e.target.value, entidad_id: '', entidad_nombre: '' })}>
                    <option value="unidad">Unidad</option>
                    <option value="remolque">Remolque</option>
                  </select>
                </div>
                <div>
                  <label style={s.label}>Servicio</label>
                  <select style={s.select} value={formMantenimiento.tipo_servicio} onChange={(e) => setFormMantenimiento({ ...formMantenimiento, tipo_servicio: e.target.value })}>
                    <option value="general">Servicio general</option>
                    <option value="aceite">Cambio de aceite</option>
                    <option value="llantas">Llantas</option>
                    <option value="frenos">Frenos</option>
                    <option value="filtros">Filtros</option>
                    <option value="verificacion">Verificación / reglamentario</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={s.label}>Equipo</label>
                {formMantenimiento.entidad_tipo === 'unidad' ? (
                  <select style={s.select} value={formMantenimiento.entidad_id} onChange={(e) => {
                    const unidad = todasLasUnidades.find(u => String(u.id) === String(e.target.value));
                    setFormMantenimiento({ ...formMantenimiento, entidad_id: e.target.value, entidad_nombre: unidad?.name || unidad?.nombre || '' });
                  }}>
                    <option value="">Selecciona una unidad...</option>
                    {todasLasUnidades.map(u => <option key={u.id} value={u.id}>{u.name || u.nombre || u.id}</option>)}
                  </select>
                ) : (
                  <select style={s.select} value={formMantenimiento.entidad_id} onChange={(e) => {
                    const rem = remolques.find(r => String(r.numero) === String(e.target.value));
                    setFormMantenimiento({ ...formMantenimiento, entidad_id: e.target.value, entidad_nombre: rem?.numero || e.target.value });
                  }}>
                    <option value="">Selecciona un remolque...</option>
                    {remolques.map(r => <option key={r.numero} value={r.numero}>{r.numero} ({r.categoria || 'Caja Seca'})</option>)}
                  </select>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={s.label}>Último mantenimiento</label>
                  <input type="datetime-local" style={s.input} value={formMantenimiento.fecha_ultimo} onChange={(e) => setFormMantenimiento({ ...formMantenimiento, fecha_ultimo: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>Próximo vencimiento</label>
                  <input type="datetime-local" style={s.input} value={formMantenimiento.fecha_proxima} onChange={(e) => setFormMantenimiento({ ...formMantenimiento, fecha_proxima: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={s.label}>Intervalo (días)</label>
                  <input type="number" min="1" style={s.input} value={formMantenimiento.intervalo_dias} onChange={(e) => setFormMantenimiento({ ...formMantenimiento, intervalo_dias: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>Km último</label>
                  <input type="number" min="0" style={s.input} value={formMantenimiento.kilometraje_ultimo} onChange={(e) => setFormMantenimiento({ ...formMantenimiento, kilometraje_ultimo: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>Km próximo</label>
                  <input type="number" min="0" style={s.input} value={formMantenimiento.kilometraje_proximo} onChange={(e) => setFormMantenimiento({ ...formMantenimiento, kilometraje_proximo: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={s.label}>Notas</label>
                <input style={s.input} value={formMantenimiento.notas} onChange={(e) => setFormMantenimiento({ ...formMantenimiento, notas: e.target.value })} placeholder="Detalles del servicio..." />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowMantenimientoModal(false)} style={s.button('#6b7280')}>Cancelar</button>
                <button type="button" disabled={mantenimientoSaving} onClick={guardarMantenimiento} style={s.button('#00ff41')}>{mantenimientoSaving ? 'Guardando...' : mantenimientoEditando ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </div>
          </div>
        </div>);
}

export function TurnoModal({
  setShowTurnoModal,
  setTurnoSummary,
  turnoSummary,
  entregarTurno,
  s,
  turnoForm,
  setTurnoForm,
  turnoLoading,
  descargarPdfTurno,
  guardarCierreTurno,
  turnoSaving,
  currentUser,
}) {
  return (<div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200 }} onClick={() => { setShowTurnoModal(false); setTurnoSummary(null); }}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-label="Entregar turno" style={{ background: '#0d0d0d', border: '1px solid #1a3d1a', borderRadius: '16px', width: '920px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', padding: '1.5rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, color: '#00ff41' }}>Entregar turno</h2>
                <p style={{ margin: '0.25rem 0 0', color: '#6a9b6a', fontSize: '0.9rem' }}>Genera un resumen de lo mas importante sucedido en las ultimas horas</p>
              </div>
              <button onClick={() => { setShowTurnoModal(false); setTurnoSummary(null); }} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>

            {!turnoSummary ? (
              <form onSubmit={entregarTurno} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={s.label}>Nombre del turno</label>
                  <input style={s.input} placeholder="Ej: Turno noche" value={turnoForm.turno} onChange={(e) => setTurnoForm({ ...turnoForm, turno: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>Horas a revisar</label>
                  <input style={s.input} type="number" min="1" max="72" value={turnoForm.horas} onChange={(e) => setTurnoForm({ ...turnoForm, horas: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>Observaciones</label>
                  <input style={s.input} placeholder="Notas del turno" value={turnoForm.observaciones} onChange={(e) => setTurnoForm({ ...turnoForm, observaciones: e.target.value })} />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" onClick={() => { setShowTurnoModal(false); setTurnoSummary(null); }} style={s.button('#6b7280')}>Cancelar</button>
                  <button type="submit" disabled={turnoLoading} style={s.button('#1d4ed8')}>{turnoLoading ? 'Generando...' : 'Generar resumen'}</button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ ...s.card, padding: '1rem' }}>
                  <h3 style={{ marginTop: 0, color: '#00ff41' }}>Resumen general</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
                    <div style={{ padding: '0.75rem', background: '#0a0a0a', borderRadius: '8px', border: '1px solid #1a3d1a' }}><div style={{ color: '#6a9b6a', fontSize: '0.75rem' }}>Alertas no leidas</div><div style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700 }}>{turnoSummary.summary.alertasNoLeidas}</div></div>
                    <div style={{ padding: '0.75rem', background: '#0a0a0a', borderRadius: '8px', border: '1px solid #1a3d1a' }}><div style={{ color: '#6a9b6a', fontSize: '0.75rem' }}>Combustible bajo</div><div style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700 }}>{turnoSummary.summary.alertasCombustibleBajo}</div></div>
                    <div style={{ padding: '0.75rem', background: '#0a0a0a', borderRadius: '8px', border: '1px solid #1a3d1a' }}><div style={{ color: '#6a9b6a', fontSize: '0.75rem' }}>Pendientes que quedan</div><div style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700 }}>{turnoSummary.summary.pendientesQueQuedanTotal}</div></div>
                    <div style={{ padding: '0.75rem', background: '#0a0a0a', borderRadius: '8px', border: '1px solid #1a3d1a' }}><div style={{ color: '#6a9b6a', fontSize: '0.75rem' }}>Pendientes resueltos</div><div style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700 }}>{turnoSummary.summary.pendientesResueltosTotal}</div></div>
                    <div style={{ padding: '0.75rem', background: '#0a0a0a', borderRadius: '8px', border: '1px solid #1a3d1a' }}><div style={{ color: '#6a9b6a', fontSize: '0.75rem' }}>Viajes activos</div><div style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700 }}>{turnoSummary.summary.viajesActivos}</div></div>
                    <div style={{ padding: '0.75rem', background: '#0a0a0a', borderRadius: '8px', border: '1px solid #1a3d1a' }}><div style={{ color: '#6a9b6a', fontSize: '0.75rem' }}>Eventos geocerca</div><div style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700 }}>{turnoSummary.summary.eventosGeocerca}</div></div>
                    <div style={{ padding: '0.75rem', background: '#0a0a0a', borderRadius: '8px', border: '1px solid #1a3d1a' }}><div style={{ color: '#6a9b6a', fontSize: '0.75rem' }}>Ubicaciones</div><div style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700 }}>{turnoSummary.summary.unidadesConUbicacion}</div></div>
                  </div>
                </div>
                <div style={{ ...s.card, padding: '1rem' }}>
                  <h3 style={{ marginTop: 0, color: '#00ff41' }}>Reporte generado</h3>
                  <textarea readOnly value={turnoSummary.summary.texto} style={{ width: '100%', minHeight: '420px', resize: 'vertical', background: '#0a0a0a', color: '#e5e7eb', border: '1px solid #1a3d1a', borderRadius: '8px', padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.82rem', whiteSpace: 'pre-wrap' }} />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
                    <button onClick={() => navigator.clipboard.writeText(turnoSummary.summary.texto)} style={s.button('#10b981')}>Copiar</button>
                    <button onClick={() => descargarPdfTurno(turnoSummary, turnoSummary.report)} style={s.button('#f59e0b')}>Descargar PDF</button>
                    <button onClick={() => { setTurnoSummary(null); }} style={s.button('#1d4ed8')}>Nuevo resumen</button>
                    <button onClick={guardarCierreTurno} disabled={turnoSaving} style={s.button('#00ff41')}>{turnoSaving ? 'Guardando...' : 'Guardar reporte y cerrar sesión'}</button>
                    <button onClick={() => { setShowTurnoModal(false); setTurnoSummary(null); }} style={s.button('#6b7280')}>Cerrar</button>
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1', ...s.card, padding: '1rem' }}>
                  <h3 style={{ marginTop: 0, color: '#00ff41' }}>Lo mas relevante</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div>
                      <strong style={{ color: '#e5e7eb' }}>Alertas criticas</strong>
                      <div style={{ marginTop: '0.5rem', color: '#c0c0c0', fontSize: '0.85rem' }}>
                        {turnoSummary.summary.alertasCriticas.length === 0 ? 'Sin alertas criticas en el periodo' : turnoSummary.summary.alertasCriticas.map((a, i) => <div key={i}>- {a.vehicle_name || a.vehicle_id}: {a.mensaje}</div>)}
                      </div>
                    </div>
                    <div>
                      <strong style={{ color: '#e5e7eb' }}>Pendientes resueltos</strong>
                      <div style={{ marginTop: '0.5rem', color: '#c0c0c0', fontSize: '0.85rem' }}>
                        {turnoSummary.summary.pendientesResueltos.length === 0 ? 'Sin pendientes resueltos en el periodo' : turnoSummary.summary.pendientesResueltos.map((p, i) => <div key={i}>- {p.titulo} ({p.prioridad})</div>)}
                      </div>
                    </div>
                    <div>
                      <strong style={{ color: '#e5e7eb' }}>Pendientes que quedan</strong>
                      <div style={{ marginTop: '0.5rem', color: '#c0c0c0', fontSize: '0.85rem' }}>
                        {turnoSummary.summary.pendientesQueQuedan.length === 0 ? 'Sin pendientes por cerrar' : turnoSummary.summary.pendientesQueQuedan.map((p, i) => <div key={i}>- {p.titulo} ({p.prioridad})</div>)}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem', color: '#9ca3af', fontSize: '0.8rem' }}>
                    Guardado por: {turnoSummary.report?.created_by_username || currentUser?.username || 'Sistema'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>);
}
