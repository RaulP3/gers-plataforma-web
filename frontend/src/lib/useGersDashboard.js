'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  estaEnMovimiento,
  CITAS_GPS_STALE_MIN,
  VIAJE_DEFAULT,
  CLIENTE_DEFAULT,
  GEOFENCE_DEFAULT,
  destinosViaje,
  destinoViajeActual,
  mapaCoincidente,
  normalizarViaje,
  parseDestinos,
  payloadViaje,
} from './viajes';

export default function useGersDashboard() {
  const [apiUrl, setApiUrl] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [formUsuario, setFormUsuario] = useState({ username: '', password: '', nombre: '', rol: 'user' });
  const [usuarioMsg, setUsuarioMsg] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  useEffect(() => {
    if (currentUser && currentUser.rol !== 'admin' && ['dashboard', 'operadores', 'reportes'].includes(activeTab)) {
      setActiveTab('monitoreo');
    }
  }, [currentUser, activeTab]);
  const [stats, setStats] = useState({});
  const [kpis, setKpis] = useState(null);
  const [pendientes, setPendientes] = useState([]);
  const [filtroTurno, setFiltroTurno] = useState('');
  const [showPendienteModal, setShowPendienteModal] = useState(false);
  const [pendienteEditando, setPendienteEditando] = useState(null);
  const [formPendiente, setFormPendiente] = useState({ titulo: '', descripcion: '', prioridad: 'media', asignado_a: '', turno: '', notas: '', estado: 'pendiente' });
  const [draggedPendiente, setDraggedPendiente] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [draggedViaje, setDraggedViaje] = useState(null);
  const [dragOverViajeColumn, setDragOverViajeColumn] = useState(null);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [historialPendientes, setHistorialPendientes] = useState([]);
  const [nuevoComentarioPendiente, setNuevoComentarioPendiente] = useState('');
  const [viajes, setViajes] = useState([]);
  const [viajesView, setViajesView] = useState('tablero');
  const [viajesHistorialSearch, setViajesHistorialSearch] = useState('');
  const [viajesProximosSearch, setViajesProximosSearch] = useState('');
  const [alertas, setAlertas] = useState([]);
  const [alertasArchivadas, setAlertasArchivadas] = useState([]);
  const [alertasView, setAlertasView] = useState('activas');
  const [floatingAlerts, setFloatingAlerts] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [reportes, setReportes] = useState([]);
  const [reporteLoading, setReporteLoading] = useState(false);
  const [reporteError, setReporteError] = useState('');
  const [loading, setLoading] = useState(true);

  const [filtroReporte, setFiltroReporte] = useState({ tipo: 'pendientes', fecha_inicio: '', fecha_fin: '', vehicle_id: '' });
  const [formViaje, setFormViaje] = useState(VIAJE_DEFAULT);
  const [pendienteSaving, setPendienteSaving] = useState(false);
  const [viajeSaving, setViajeSaving] = useState(false);
  const [remolques, setRemolques] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [formCliente, setFormCliente] = useState(CLIENTE_DEFAULT);
  const [clienteSaving, setClienteSaving] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState(null);
  const [showClienteGeofenceModal, setShowClienteGeofenceModal] = useState(false);
  const [formClienteGeofence, setFormClienteGeofence] = useState(GEOFENCE_DEFAULT);
  const [clienteGeofenceSaving, setClienteGeofenceSaving] = useState(false);
  const [geofenceLinks, setGeofenceLinks] = useState([]);
  const [showExistingGeofenceModal, setShowExistingGeofenceModal] = useState(false);
  const [existingGeofenceSelections, setExistingGeofenceSelections] = useState([]);
  const [existingGeofenceSearch, setExistingGeofenceSearch] = useState('');
  const [existingGeofenceSaving, setExistingGeofenceSaving] = useState(false);
  const [showRemolqueModal, setShowRemolqueModal] = useState(false);
  const [formRemolque, setFormRemolque] = useState({ numero: '', categoria: 'Caja Seca' });
  const [remolqueEditando, setRemolqueEditando] = useState(null);
  const [historialRemolque, setHistorialRemolque] = useState([]);
  const [selectedRemolque, setSelectedRemolque] = useState(null);
  const [historialRemolqueLoading, setHistorialRemolqueLoading] = useState(false);
  const [historialRemolqueError, setHistorialRemolqueError] = useState('');
  const [remolqueDashVehicleId, setRemolqueDashVehicleId] = useState('');
  const [remolqueDashModo, setRemolqueDashModo] = useState('sencillo');
  const [remolqueDashSegundoId, setRemolqueDashSegundoId] = useState('');
  const [remolqueDashSaving, setRemolqueDashSaving] = useState(false);
  const [seguimiento, setSeguimiento] = useState([]);
  const [seguimientoFilter, setSeguimientoFilter] = useState('');
  const [seguimientoEstatusFilter, setSeguimientoEstatusFilter] = useState('');
  const [seguimientoGrupoFilter, setSeguimientoGrupoFilter] = useState('');
  const [seguimientoUnidadFilter, setSeguimientoUnidadFilter] = useState('');
  const [seguimientoEditando, setSeguimientoEditando] = useState(null);
  const [showSeguimientoForm, setShowSeguimientoForm] = useState(false);
  const [formSeguimiento, setFormSeguimiento] = useState({
    unidad: '', operador: '', remolque: '', ruta: '', origen: '', destino: '',
    cita_carga: '', cita_descarga: '', hora_llegada: '', hora_liberacion: '',
    estatus: 'Disponible', comentarios_cliente: '', comentarios_monitoreo: '', grupo: ''
  });
  const [seguimientoHistorial, setSeguimientoHistorial] = useState([]);
  const [seguimientoHistorialLoading, setSeguimientoHistorialLoading] = useState(false);
  const [seguimientoHistorialError, setSeguimientoHistorialError] = useState('');
  const [selectedSeguimiento, setSelectedSeguimiento] = useState(null);
  const [showSeguimientoUpdateModal, setShowSeguimientoUpdateModal] = useState(false);
  const [seguimientoModalUnidadId, setSeguimientoModalUnidadId] = useState('');
  const [seguimientoModalGrupo, setSeguimientoModalGrupo] = useState('');
  const [seguimientoModalNota, setSeguimientoModalNota] = useState('');
  const [seguimientoModalSaving, setSeguimientoModalSaving] = useState(false);
  const [seguimientoModalError, setSeguimientoModalError] = useState('');
  const [seguimientoFormAvanzado, setSeguimientoFormAvanzado] = useState(false);
  const [showMensajeModal, setShowMensajeModal] = useState(false);
  const [mensajeCliente, setMensajeCliente] = useState('');
  const [mensajeTexto, setMensajeTexto] = useState('');
  const [showTurnoModal, setShowTurnoModal] = useState(false);
  const [turnoForm, setTurnoForm] = useState({ turno: '', horas: 8, observaciones: '' });
  const [turnoSummary, setTurnoSummary] = useState(null);
  const [turnoLoading, setTurnoLoading] = useState(false);
  const [turnoSaving, setTurnoSaving] = useState(false);
  const [operadorDraft, setOperadorDraft] = useState('');
  const [telefonoDraft, setTelefonoDraft] = useState('');
  const [remolqueDraft, setRemolqueDraft] = useState('');
  const [remolqueModo, setRemolqueModo] = useState('sencillo');
  const [remolquesFullDraft, setRemolquesFullDraft] = useState(['', '']);

  const generarMensajeSeguimiento = (grupo) => {
    const filas = seguimiento.filter(row => row.grupo === grupo);
    let msg = `📲 REPORTE DE UNIDADES "${grupo}"\n------------------------------------------\n\n`;
    filas.forEach(row => {
      msg += `Unidad: ${row.unidad || 'N/A'}\n`;
      msg += `Grupo: ${row.grupo || 'N/A'}\n`;
      msg += `Remolque: ${row.remolque || 'N/A'}\n`;
      msg += `Operador: ${row.operador || 'N/A'}\n`;
      msg += `Origen -- Destino: ${row.origen || 'N/A'} -- ${row.destino || 'N/A'}\n`;
      msg += `Cita de carga: ${row.cita_carga || 'N/A'}\n`;
      msg += `Cita de descarga: ${row.cita_descarga || 'N/A'}\n`;
      msg += `Llegada con el cliente: ${row.hora_llegada || 'N/A'}\n`;
      msg += `Hora de liberacion: ${row.hora_liberacion || 'N/A'}\n`;
      msg += `Estatus: ${row.estatus || 'N/A'}\n`;
      msg += `Observaciones: ${(row.comentarios_cliente || row.comentarios_monitoreo || 'Sin observaciones')}\n\n`;
    });
    return msg;
  };

  const abrirGeneradorMensajes = () => {
    setShowMensajeModal(true);
    setMensajeCliente('');
    setMensajeTexto('');
  };

  const actualizarMensaje = (grupo) => {
    setMensajeCliente(grupo);
    setMensajeTexto(generarMensajeSeguimiento(grupo));
  };

  const copiarMensaje = () => {
    navigator.clipboard.writeText(mensajeTexto);
    alert('Mensaje copiado al portapapeles');
  };

  const enviarWhatsApp = () => {
    if (!mensajeTexto.trim()) return;
    const msg = encodeURIComponent(mensajeTexto);
    const popup = window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener,noreferrer');
    if (!popup) alert('El navegador bloqueó la ventana de WhatsApp. Permite ventanas emergentes e intenta de nuevo.');
  };

  const gruposUnicos = [...new Set(seguimiento.map(row => row.grupo).filter(Boolean))];
  const seguimientoEstados = ['Disponible', 'En ruta cargado', 'En ruta vacio', 'En proceso de carga', 'En proceso de descarga', 'En resguardo', 'Programado', 'No disponible'];
  const remolqueCategorias = useMemo(() => {
    const base = ['Thermo Refrigerado', 'Caja Seca', 'Porta Contenedores', 'Tanque'];
    const extras = [...new Set(remolques.map(r => r.categoria || 'Caja Seca').filter(cat => !base.includes(cat)))];
    return [...base, ...extras];
  }, [remolques]);
  const clientesFiltrados = useMemo(() => {
    const search = clienteSearch.trim().toLowerCase();
    return clientes.filter(cliente => !search || [cliente.nombre, cliente.contacto, cliente.telefono, cliente.email]
      .some(value => String(value || '').toLowerCase().includes(search)));
  }, [clientes, clienteSearch]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [comentarioRapido, setComentarioRapido] = useState({ tipo: 'seguimiento', titulo: '', contenido: '' });
  const [destinoInput, setDestinoInput] = useState('');
  const [etaData, setEtaData] = useState(null);
  const [etaError, setEtaError] = useState('');
  const [calculandoEta, setCalculandoEta] = useState(false);
  const [viajeEta, setViajeEta] = useState(null);
  const [viajeEtaError, setViajeEtaError] = useState('');
  const [calculandoViajeEta, setCalculandoViajeEta] = useState(false);
  const [operadores, setOperadores] = useState({});
  const [samsaraDrivers, setSamsaraDrivers] = useState([]);
  const [hiddenDrivers, setHiddenDrivers] = useState([]);
  const [hiddenUnits, setHiddenUnits] = useState([]);
  const [driverPhoneOverrides, setDriverPhoneOverrides] = useState({});
  const [filtroOperador, setFiltroOperador] = useState('');
  const idStr = (value) => String(value ?? '');
  const [geofences, setGeofences] = useState([]);
  const [geofenceEvents, setGeofenceEvents] = useState([]);
  const [selectedGeofenceHistory, setSelectedGeofenceHistory] = useState(null);
  const [showGeofenceHistoryPanel, setShowGeofenceHistoryPanel] = useState(false);
  const [geofenceHistoryLoading, setGeofenceHistoryLoading] = useState(false);
  const [geofenceHistoryError, setGeofenceHistoryError] = useState('');
  const [samsaraAddresses, setSamsaraAddresses] = useState([]);
  const [geofenceCat, setGeofenceCat] = useState('todas');
  const [busquedaGeofence, setBusquedaGeofence] = useState('');
  const geofenceCategories = [
    { key: 'todas', label: 'Todas', icon: '📋' },
    { key: 'samsara', label: 'Samsara', icon: '☁️' },
  //  { key: 'planta', label: 'Plantas GERS', icon: '🏭' },
  //  { key: 'logistica', label: 'Zonas Logísticas', icon: '📦' },
  //  { key: 'puerto', label: 'Puertos', icon: '🚢' },
  //  { key: 'aduana', label: 'Aduanas', icon: '🛃' },
    { key: 'custom', label: 'Mis Geocercas', icon: '📍' },
  ];
  const allGeofences = useMemo(() => {
    const local = geofences.map(g => ({ ...g, source: 'local' }));
    const sam = samsaraAddresses.map(a => ({ ...a, source: 'samsara', activa: 1 }));
    return [...sam, ...local];
  }, [geofences, samsaraAddresses]);
  const selectedCliente = clientes.find(cliente => String(cliente.id) === String(selectedClienteId)) || null;
  const geofenceOwnerId = geofence => geofence.source === 'samsara'
    ? geofenceLinks.find(link => link.source === 'samsara' && String(link.geofence_ref) === String(geofence.id))?.cliente_id
    : geofence.cliente_id;
  const selectedClienteGeofences = selectedCliente
    ? allGeofences.filter(geofence => String(geofenceOwnerId(geofence) || '') === String(selectedCliente.id))
    : [];
  const geofenceNames = useMemo(() => {
    return [...new Set(allGeofences.filter(g => g.activa !== 0).map(g => g.nombre).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [allGeofences]);
  const normalizeGeofenceName = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const findGeofence = (value) => {
    const normalized = normalizeGeofenceName(value);
    return allGeofences.find(g => g.activa !== 0 && normalizeGeofenceName(g.nombre) === normalized) || null;
  };
  const clienteDeGeofence = (nombre) => {
    const gf = findGeofence(nombre);
    if (!gf) return null;
    const ownerId = geofenceOwnerId(gf);
    return clientes.find(c => String(c.id) === String(ownerId)) || null;
  };
  const TOKENS_GENERICOS_DESTINO = new Set(['pension', 'pensiones', 'planta', 'cedis', 'centro', 'distribucion', 'casa', 'almacen', 'patio', 'parador', 'bodega', 'zona', 'area', 'rampa', 'rampas', 'estacionamiento', 'lavado', 'embarques', 'descarga', 'sucursal', 'puerto', 'aduana', 'caseta', 'peaje', 'tramo', 'acceso', 'modulo', 'bahia', 'km']);
  const nucleoDestino = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(w => w.length > 2 && !TOKENS_GENERICOS_DESTINO.has(w));
  const clienteDeDestino = (destino) => {
    const directo = clienteDeGeofence(destino);
    if (directo) return directo;
    for (const nombre of geocercasCoincidentes(destino)) {
      const gf = findGeofence(nombre);
      if (!gf) continue;
      const ownerId = geofenceOwnerId(gf);
      if (ownerId) {
        const cliente = clientes.find(c => String(c.id) === String(ownerId));
        if (cliente) return cliente;
      }
    }
    const palabrasDestino = nucleoDestino(destino);
    let mejor = null;
    let mejorScore = 0;
    for (const g of allGeofences) {
      if (g.activa === 0) continue;
      const ownerId = geofenceOwnerId(g);
      if (!ownerId) continue;
      const palabrasCand = nucleoDestino(g.nombre);
      if (!palabrasCand.length) continue;
      const comunes = palabrasCand.filter(w => palabrasDestino.includes(w)).length;
      const score = comunes / Math.max(1, Math.min(palabrasDestino.length, palabrasCand.length));
      if (comunes >= 2 && score >= 0.6 && score > mejorScore) {
        mejorScore = score;
        mejor = clientes.find(c => String(c.id) === String(ownerId)) || null;
      }
    }
    return mejor;
  };
  const geofencesEnDestino = (destino) => {
    const mapa = new Map();
    const agregar = g => { if (g && g.activa !== 0) mapa.set(String(g.id || g.nombre), g); };
    agregar(findGeofence(destino));
    const cliente = clienteDeDestino(destino);
    if (cliente) {
      allGeofences.forEach(g => { if (g.activa !== 0 && String(geofenceOwnerId(g) || '') === String(cliente.id)) agregar(g); });
    }
    const palabrasDestino = nucleoDestino(destino);
    for (const g of allGeofences) {
      if (g.activa === 0) continue;
      const palabrasCand = nucleoDestino(g.nombre);
      if (!palabrasCand.length) continue;
      const comunes = palabrasCand.filter(w => palabrasDestino.includes(w)).length;
      if (comunes >= 2 && comunes / Math.max(1, Math.min(palabrasDestino.length, palabrasCand.length)) >= 0.6) agregar(g);
    }
    return [...mapa.values()];
  };
  const geofencesCandidatas = (destino) => {
    const mapa = new Map();
    const agregar = g => { if (g && g.activa !== 0) mapa.set(String(g.id || g.nombre), g); };
    geofencesEnDestino(destino).forEach(agregar);
    const viaCoincidentes = findGeofence(geocercasCoincidentes(destino)[0]);
    agregar(viaCoincidentes);
    return [...mapa.values()];
  };
  const geofenceOptions = (currentValue = '') => {
    const current = String(currentValue || '').trim();
    const isLegacyValue = current && !findGeofence(current);
    return (
      <>
        <option value="">Seleccionar geocerca...</option>
        {isLegacyValue && <option value={current}>{current} (histórico)</option>}
        {geofenceNames.map(name => <option key={name} value={name}>{name}</option>)}
      </>
    );
  };
  const geocercasCoincidentes = (texto = '') => {
    const normalize = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    const textoNorm = normalize(texto);
    if (!textoNorm) return [];
    const palabrasTexto = new Set(textoNorm.split(' ').filter(part => part.length > 2));
    const puntuar = (candidate, esNombre) => {
      if (!candidate) return 0;
      if (candidate === textoNorm) return esNombre ? 100 : 90;
      const minLength = Math.min(candidate.length, textoNorm.length);
      if (minLength >= 10 && (textoNorm.includes(candidate) || candidate.includes(textoNorm))) return esNombre ? 80 : 65;
      const palabras = [...new Set(candidate.split(' ').filter(part => part.length > 2))];
      const comunes = palabras.filter(part => palabrasTexto.has(part)).length;
      const proporcion = comunes / Math.max(1, Math.min(palabras.length, palabrasTexto.size));
      if (comunes >= 3 && proporcion >= 0.6) return esNombre ? 60 + comunes : 45 + comunes;
      if (comunes >= 2 && proporcion >= 0.8) return esNombre ? 55 : 40;
      return 0;
    };
    const resultados = allGeofences.map(g => {
      const nombre = normalize(g.nombre);
      const direcciones = [g.direccion, g.formattedAddress].map(normalize).filter(Boolean);
      const score = Math.max(puntuar(nombre, true), ...direcciones.map(value => puntuar(value, false)));
      return { nombre: g.nombre || g.formattedAddress || '', score };
    }).filter(item => item.nombre && item.score > 0).sort((a, b) => b.score - a.score || a.nombre.localeCompare(b.nombre));
    return [...new Set(resultados.map(item => item.nombre))].slice(0, 2);
  };
  const parseCitaDate = (value) => {
    if (!value) return null;
    const normalized = String(value).trim().replace(' ', 'T');
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const findVehicleForUnit = (unitName, vehicleId = '') => {
    const normalizedUnit = String(unitName || '').trim().toLowerCase();
    const unitNumber = normalizedUnit.match(/\d+/g)?.at(-1)?.replace(/^0+/, '') || '';
    return vehiculos.find(vehicle => {
      if (vehicleId && String(vehicle.id) === String(vehicleId)) return true;
      const normalizedVehicle = String(vehicle.name || '').trim().toLowerCase();
      if (normalizedVehicle === normalizedUnit) return true;
      const vehicleNumber = normalizedVehicle.match(/\d+/g)?.at(-1)?.replace(/^0+/, '') || '';
      return unitNumber && vehicleNumber === unitNumber;
    }) || null;
  };
  const citasOperativas = useMemo(() => {
    const normalize = value => String(value || '').trim().toLowerCase();
    const normalizeText = value => normalize(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const trailerSet = value => {
      const set = new Set();
      normalize(value).split(/[+,\s;]+/).forEach(t => {
        const n = (t.match(/\d+/g) || []).join('').replace(/^0+/, '');
        if (n) set.add(n);
      });
      return set;
    };
    const sameTrailerMatch = (a, b) => {
      const A = trailerSet(a), B = trailerSet(b);
      if (!A.size || !B.size) return false;
      for (const x of A) if (B.has(x)) return true;
      return false;
    };
    const normalizeStatus = value => {
      const key = String(value || 'programado').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      return { en_proceso_de_carga: 'proceso_carga', en_proceso_de_descarga: 'proceso_descarga', en_proceso_de_liberacion: 'proceso_liberacion' }[key] || key;
    };
    const viajesConFechas = viajes
      .filter(viaje => (viaje.fecha_inicio || viaje.fecha_fin))
      .map(viaje => {
      const destinos = destinosViaje(viaje);
      return {
        id: `via-${viaje.id}`,
        sourceId: viaje.id,
        vehicle_id: viaje.vehicle_id,
        unidad: viaje.vehicle_name || viaje.vehicle_id,
        tipo: 'Viaje',
        origen: viaje.origen || '',
        destino: destinoViajeActual(viaje) || destinos[0] || viaje.destino || '',
        cita_carga: viaje.fecha_inicio || '',
        cita_descarga: viaje.fecha_fin || '',
        remolque: viaje.remolque || '',
        estatus: normalizeStatus(viaje.estado),
      };
    });
    const viajeItems = viajesConFechas.filter(item => !['completado', 'cancelado'].includes(item.estatus));
    const seguimientoSinViaje = seguimiento.filter(row => row.cita_carga || row.cita_descarga).filter(row => !['completado', 'cancelado'].includes(normalizeStatus(row.estatus))).filter(row => {
      const rowDate = parseCitaDate(row.cita_descarga || row.cita_carga)?.getTime();
      return !viajesConFechas.some(item => {
        if (normalize(item.unidad) !== normalize(row.unidad)) return false;
        const itemDate = parseCitaDate(item.cita_descarga || item.cita_carga)?.getTime();
        const sameDate = rowDate && itemDate && Math.abs(rowDate - itemDate) < 60000;
        if (sameDate) return true;
        const sameDestination = normalizeText(item.destino) && normalizeText(item.destino) === normalizeText(row.destino);
        const sameTrailer = sameTrailerMatch(item.remolque, row.remolque);
        return sameDestination && sameTrailer;
      });
    }).map(row => ({
      id: `seg-${row.id}`,
      sourceId: row.id,
      vehicle_id: findVehicleForUnit(row.unidad)?.id || '',
      unidad: row.unidad,
      tipo: 'Seguimiento',
      origen: row.origen || '',
      destino: row.destino || '',
      cita_carga: row.cita_carga || '',
      cita_descarga: row.cita_descarga || '',
      remolque: row.remolque || '',
      estatus: normalizeStatus(row.estatus),
    }));
    return [...viajeItems, ...seguimientoSinViaje].filter(item => {
      const date = parseCitaDate(item.cita_descarga || item.cita_carga || '');
      if (!date) return false;
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      return date.getTime() >= startOfToday.getTime();
    }).sort((a, b) => {
      const aDate = parseCitaDate(a.cita_descarga || a.cita_carga)?.getTime() || Number.MAX_SAFE_INTEGER;
      const bDate = parseCitaDate(b.cita_descarga || b.cita_carga)?.getTime() || Number.MAX_SAFE_INTEGER;
      return aDate - bDate;
    });
  }, [viajes, seguimiento, vehiculos]);
  const vehiculoDeCita = (item) => item ? findVehicleForUnit(item.unidad, item.vehicle_id) : null;
  const horaLlegadaRealCita = (item) => {
    if (!item) return null;
    if (item.tipo === 'Viaje' && item.sourceId) {
      const viaje = viajes.find(v => Number(v.id) === Number(item.sourceId));
      if (viaje) {
        const paradas = Array.isArray(viaje.paradas) ? viaje.paradas : [];
        const destinoNorm = normalizeGeofenceName(item.destino);
        const candidata = paradas.find(p => normalizeGeofenceName(p.destino) === destinoNorm)
          || paradas.find(p => ['llego', 'completada'].includes(String(p.estado).toLowerCase()) && p.hora_llegada)
          || paradas[0];
        const porParada = parseFecha(candidata?.hora_llegada);
        if (porParada) return porParada;
        if (viaje.tipo_entrega !== 'reparto') {
          const directo = parseFecha(viaje.hora_llegada);
          if (directo) return directo;
        }
      }
    }
    if (item.tipo === 'Seguimiento' && item.sourceId) {
      const row = seguimiento.find(r => Number(r.id) === Number(item.sourceId));
      const rowLlegada = parseFecha(row?.hora_llegada);
      if (rowLlegada) return rowLlegada;
    }
    const vehicle = findVehicleForUnit(item.unidad, item.vehicle_id);
    if (vehicle) {
      const nombres = new Set(geofencesCandidatas(item.destino).map(g => normalizeGeofenceName(g.nombre)).filter(Boolean));
      if (nombres.size) {
        const entrada = (geofenceEvents || []).find(ev => ev.tipo === 'entrada'
          && String(ev.vehicle_id) === String(vehicle.id)
          && nombres.has(normalizeGeofenceName(ev.geofence_nombre)));
        const llegada = parseFecha(entrada?.created_at);
        if (llegada) return llegada;
      }
    }
    return null;
  };
  const estadoVehiculoCita = (item) => {
    const vehicle = vehiculoDeCita(item);
    if (!vehicle?.location) return { label: 'Sin GPS', color: '#6b7280' };
    if (!vehicle.isOnline) return { label: 'Sin señal', color: '#6b7280' };
    if (geofencesCandidatas(item.destino).some(g => pointInsideGeofence(vehicle.location.latitude, vehicle.location.longitude, g))) {
      return { label: 'En destino', color: '#00ff41' };
    }
    return estaEnMovimiento(vehicle.location.speed)
      ? { label: 'Circulando', color: '#10b981' }
      : { label: 'Detenido', color: '#3b82f6' };
  };
  const diaEntregaCita = (item) => {
    const date = parseCitaDate(item.cita_descarga || item.cita_carga || '');
    if (!date) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const labelDiaEntrega = (diaKey) => {
    if (!diaKey) return 'Sin fecha de entrega';
    const [y, m, d] = diaKey.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };
  const generarReporteWppCliente = (cliente, items) => {
    const lineas = [];
    items.forEach(item => {
      const estadoVeh = estadoVehiculoCita(item);
      const appointment = parseCitaDate(item.cita_descarga || item.cita_carga);
      const horaCita = appointment ? appointment.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : 'sin cita';
      const destino = findGeofence(item.destino)?.nombre || geocercasCoincidentes(item.destino)[0] || item.destino || '-';
      const etaInfo = citasEta[item.id];
      const cumplimiento = etaInfo?.label || (citasEtaLoading ? 'Calculando...' : 'Sin ETA');
      const etaLinea = etaInfo?.status === 'arrived'
        ? (etaInfo?.arrival ? ` | Llegó: ${etaInfo.arrival.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} (En destino)` : ' | En destino')
        : (etaInfo?.eta && etaInfo?.arrival
          ? ` | ETA: ${etaInfo.arrival.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} (${cumplimiento})`
          : ` | ${cumplimiento}`);
      lineas.push(`• ${unidadCitaLabel(item) || '-'} -> ${destino} (${horaCita})`);
      lineas.push(`   Estado: ${estadoVeh.label}${etaLinea}${item.remolque ? ` | Remolque: ${item.remolque}` : ''}`);
    });
    return lineas.join('\n');
  };
  const recalcularReporteWpp = (diaKey) => {
    const itemsDelDia = citasOperativas.filter(item => diaEntregaCita(item) === diaKey);
    const porCliente = new Map();
    itemsDelDia.forEach(item => {
      const cliente = clienteDeDestino(item.destino);
      const key = cliente ? String(cliente.id) : 'sin-cliente';
      if (!porCliente.has(key)) porCliente.set(key, { cliente, items: [] });
      porCliente.get(key).items.push(item);
    });
    const textos = {};
    const grupos = {};
    for (const { cliente, items } of porCliente.values()) {
      const key = cliente ? String(cliente.id) : 'sin-cliente';
      textos[key] = generarReporteWppCliente(cliente, items);
      grupos[key] = cliente ? (cliente.wpp_groups || []).slice() : [];
    }
    setWppReporteTextos(textos);
    setWppReporteGrupos(grupos);
    return porCliente;
  };
  const abrirReporteWpp = () => {
    const d = new Date();
    const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setWppReporteDia(hoy);
    setShowWppReporte(true);
    setTimeout(() => recalcularReporteWpp(hoy), 0);
  };
  const copiarReporteWpp = (texto) => {
    navigator.clipboard.writeText(texto);
    alert('Reporte copiado al portapapeles');
  };
  const copiarReporteWppEnvio = (cliente, texto) => {
    const gruposSel = (cliente?.wpp_groups || []).filter(g => (wppReporteGrupos[String(cliente.id)] || []).includes(g));
    const encabezado = gruposSel.length ? `Enviar a: ${gruposSel.join(', ')}\n--------------------\n\n` : '';
    navigator.clipboard.writeText(`${encabezado}${texto}`);
    alert(gruposSel.length ? 'Reporte + destinatarios copiados al portapapeles' : 'Reporte copiado al portapapeles (sin grupos seleccionados)');
  };
  const [marcandoCitaId, setMarcandoCitaId] = useState(null);
  const marcarCitaCompletada = async (item) => {
    const confirmText = `¿Marcar como completada la cita de ${item.unidad} (${item.destino})?`;
    if (!confirm(confirmText)) return;
    setMarcandoCitaId(item.id);
    try {
      if (item.tipo === 'Viaje') {
        const viaje = viajes.find(v => String(v.id) === String(item.sourceId));
        if (!viaje) throw new Error('Viaje no encontrado');
        await apiJson(`${apiUrl}/viajes/${item.sourceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...viaje, estado: 'completado' }),
        });
      } else if (item.tipo === 'Seguimiento') {
        const row = seguimiento.find(s => String(s.id) === String(item.sourceId));
        if (!row) throw new Error('Registro de seguimiento no encontrado');
        await apiJson(`${apiUrl}/seguimiento/${item.sourceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...row, estatus: 'completado' }),
        });
      }
      await loadAll();
      setCitaSeleccionada(prev => prev && prev.id === item.id ? null : prev);
    } catch (err) {
      alert(err.message || 'No se pudo marcar la cita como completada');
    } finally {
      setMarcandoCitaId(null);
    }
  };
  const [formGeofence, setFormGeofence] = useState(GEOFENCE_DEFAULT);
  const [filtroAlertas, setFiltroAlertas] = useState('');
  const [busquedaUnidades, setBusquedaUnidades] = useState('');
  const [filtroUnidades, setFiltroUnidades] = useState('todas');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [routeHistory, setRouteHistory] = useState([]);
  const [routeDates, setRouteDates] = useState([]);
  const [routeVehicleId, setRouteVehicleId] = useState('');
  const [routeDate, setRouteDate] = useState('');
  const [routeLoading, setRouteLoading] = useState(false);
  const [citasEta, setCitasEta] = useState({});
  const [citasEtaLoading, setCitasEtaLoading] = useState(false);
  const [citasEtaRefresh, setCitasEtaRefresh] = useState(0);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
  const [citaLlegada, setCitaLlegada] = useState(null);
  const [showWppReporte, setShowWppReporte] = useState(false);
  const [wppReporteDia, setWppReporteDia] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [wppReporteTextos, setWppReporteTextos] = useState({});
  const [wppReporteGrupos, setWppReporteGrupos] = useState({});
  const [mapas, setMapas] = useState([]);
  const [selectedMapa, setSelectedMapa] = useState(null);
  const [mapaEditando, setMapaEditando] = useState(null);
  const [formMapa, setFormMapa] = useState({ nombre: '', origen: '', destino: '', descripcion: '', url: '', tipo_entrega: 'directo', destinos: ['', ''] });
  const [mapaSaving, setMapaSaving] = useState(false);
  const [mapasError, setMapasError] = useState('');
  const [customRiskZones, setCustomRiskZones] = useState([]);
  const [placingZone, setPlacingZone] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [newZone, setNewZone] = useState({ name: '', description: '', severity: 'high', lat: '', lng: '', radius: 5000 });
  const [unidadesLocales, setUnidadesLocales] = useState([]);
  const [showProgramarViajeModal, setShowProgramarViajeModal] = useState(false);
  const [showViajeModal, setShowViajeModal] = useState(false);
  const [viajeDetalle, setViajeDetalle] = useState(null);
  const [viajeEditando, setViajeEditando] = useState(false);
  const [viajeForm, setViajeForm] = useState({});

  const actualizarViaje = async () => {
    if (!viajeDetalle?.id) return;
    const payload = payloadViaje(viajeForm);
    const destinosIncompletos = payload.tipo_entrega === 'reparto' && ((viajeForm.destinos || []).length < 2 || viajeForm.destinos.some(destino => !String(destino || '').trim()));
    if (destinosIncompletos || !payload.destino) {
      alert(payload.tipo_entrega === 'reparto' ? 'Ingresa al menos dos destinos para el reparto.' : 'Ingresa el destino del viaje.');
      return;
    }
    const ubicaciones = [payload.origen, ...destinosViaje(payload)];
    if (ubicaciones.some(value => !findGeofence(value))) {
      alert('Selecciona el origen y todos los destinos de la lista de geocercas.');
      return;
    }
    try {
      setViajeSaving(true);
      await apiJson(`${apiUrl}/viajes/${viajeDetalle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setViajeDetalle(normalizarViaje(payload));
      setViajeForm(normalizarViaje(payload));
      setViajeEditando(false);
      await refreshViajes();
    } catch (err) {
      alert(err.message || 'No se pudo guardar el viaje');
    } finally {
      setViajeSaving(false);
    }
  };

  const [showUnidadModal, setShowUnidadModal] = useState(false);
  const [editUnidad, setEditUnidad] = useState(null);
  const [formUnidad, setFormUnidad] = useState({ nombre: '', estatus: 'Activa', notas: '', tipo: 'manual', samsara_id: '' });
  const [monitoreoSelectedId, setMonitoreoSelectedId] = useState(null);
  const [monitoreoRouteHistory, setMonitoreoRouteHistory] = useState([]);
  const [monitoreoStops, setMonitoreoStops] = useState([]);
  const [monitoreoEta, setMonitoreoEta] = useState(null);
  const [monitoreoRutaTotal, setMonitoreoRutaTotal] = useState(null);
  const [monitoreoEtaLoading, setMonitoreoEtaLoading] = useState(false);
  const [monitoreoGeofenceMatch, setMonitoreoGeofenceMatch] = useState(null);
  const [viajesActivos, setViajesActivos] = useState([]);
  const loadAllInFlightRef = useRef(null);
  const loadAllQueuedRef = useRef(false);
  const loadAllTimerRef = useRef(null);
  const sseCooldownUntilRef = useRef(0);
  const pendientesVersionRef = useRef(0);
  const monitoreoRequestRef = useRef({ generation: 0, controller: null });
  const monitoreoEtaDestinoRef = useRef('');
  const etaRequestRef = useRef({ generation: 0, controller: null });
  const viajeEtaRequestRef = useRef({ generation: 0, controller: null });
  const remolqueHistoryRequestRef = useRef({ generation: 0, controller: null });
  const pendienteRequestRef = useRef({ generation: 0, controller: null });
  const routeHistoryRequestRef = useRef({ generation: 0, controller: null });
  const routeDatesRequestRef = useRef({ generation: 0, controller: null });
  const reportRequestRef = useRef({ generation: 0, controller: null });
  const viajeWasDraggedRef = useRef(false);
  const citasEtaRequestRef = useRef({ generation: 0, controller: null });
  const floatingAlertTimersRef = useRef(new Set());

  const statusKey = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  const tripStatusByKey = {
    disponible: 'disponible', programado: 'programado', enrutavacio: 'en_ruta_vacio', enrutacargado: 'en_ruta_cargado',
    esperaingreso: 'espera_ingreso', procesocarga: 'proceso_carga', enprocesodecarga: 'proceso_carga',
    procesodescarga: 'proceso_descarga', enprocesodedescarga: 'proceso_descarga', procesoliberacion: 'proceso_liberacion',
    enresguardo: 'en_resguardo', completado: 'completado', cancelado: 'cancelado',
  };
  const seguimientoStatusByKey = {
    disponible: 'Disponible', programado: 'Programado', enrutavacio: 'En ruta vacio', enrutacargado: 'En ruta cargado',
    procesocarga: 'En proceso de carga', enprocesodecarga: 'En proceso de carga', procesodescarga: 'En proceso de descarga',
    enprocesodedescarga: 'En proceso de descarga', enresguardo: 'En resguardo', nodisponible: 'No disponible',
  };
  const normalizarEstadoViaje = (value) => tripStatusByKey[statusKey(value)] || value || 'programado';
  const normalizarEstatusSeguimiento = (value) => seguimientoStatusByKey[statusKey(value)] || value || 'Disponible';
  const normalizarViajes = (rows) => Array.isArray(rows) ? rows.map(row => normalizarViaje({ ...row, estado: normalizarEstadoViaje(row.estado) })) : [];
  const normalizarSeguimiento = (rows) => Array.isArray(rows) ? rows.map(row => ({ ...row, estatus: normalizarEstatusSeguimiento(row.estatus) })) : [];
  const velocidadKmh = (mph) => Math.round((Number(mph) || 0) * 1.60934);
  const whatsappDigits = (value) => String(value || '').replace(/\D/g, '');

  const defaultZonesList = [
    { name: 'Tamaulipas - Zona Norte', severity: 'critical', lat: 25.8811, lng: -97.4981 },
    { name: 'Guerrero - Costa Grande', severity: 'critical', lat: 17.0732, lng: -100.1004 },
    { name: 'Zacatecas - Carreteras', severity: 'high', lat: 23.0629, lng: -103.3429 },
    { name: 'Michoacán - Tierra Caliente', severity: 'critical', lat: 18.8500, lng: -102.1800 },
    { name: 'Nuevo León - Periferia', severity: 'high', lat: 25.6866, lng: -100.3161 },
    { name: 'Jalisco - Zona Metropolitana', severity: 'medium', lat: 20.6597, lng: -103.3496 },
    { name: 'Baja California - Frontera', severity: 'high', lat: 32.5149, lng: -116.9983 },
    { name: 'Sinaloa - Los Mochis', severity: 'critical', lat: 25.7900, lng: -109.0000 },
    { name: 'Sonora - Frontera Sur', severity: 'high', lat: 31.2500, lng: -110.9600 },
    { name: 'Coahuila - Ruta Minera', severity: 'medium', lat: 27.5100, lng: -103.0300 },
    { name: 'Chihuahua - Ciudad Juárez', severity: 'critical', lat: 31.6904, lng: -106.4245 },
    { name: 'Veracruz - Zona Sur', severity: 'high', lat: 18.1500, lng: -94.5000 },
    { name: 'Tamaulipas - Matamoros', severity: 'critical', lat: 25.8699, lng: -97.5111 },
    { name: 'Guerrero - Acapulco', severity: 'critical', lat: 16.8531, lng: -99.8237 },
    { name: 'Oaxaca - Istmo', severity: 'medium', lat: 16.7500, lng: -95.2000 },
  ];

  useEffect(() => {
    setApiUrl(process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:3001/api`);
  }, []);

  useEffect(() => {
    try {
      setHiddenDrivers(JSON.parse(localStorage.getItem('gers_hidden_drivers') || '[]'));
    } catch {
      setHiddenDrivers([]);
    }
    try {
      setHiddenUnits(JSON.parse(localStorage.getItem('gers_hidden_units') || '[]'));
    } catch {
      setHiddenUnits([]);
    }
    try {
      setDriverPhoneOverrides(JSON.parse(localStorage.getItem('gers_driver_phone_overrides') || '{}'));
    } catch {
      setDriverPhoneOverrides({});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('gers_hidden_drivers', JSON.stringify(hiddenDrivers));
  }, [hiddenDrivers]);

  useEffect(() => {
    localStorage.setItem('gers_hidden_units', JSON.stringify(hiddenUnits));
  }, [hiddenUnits]);

  useEffect(() => {
    localStorage.setItem('gers_driver_phone_overrides', JSON.stringify(driverPhoneOverrides));
  }, [driverPhoneOverrides]);

  useEffect(() => () => {
    clearTimeout(loadAllTimerRef.current);
    monitoreoRequestRef.current.controller?.abort();
    etaRequestRef.current.controller?.abort();
    viajeEtaRequestRef.current.controller?.abort();
    remolqueHistoryRequestRef.current.controller?.abort();
    pendienteRequestRef.current.controller?.abort();
    routeHistoryRequestRef.current.controller?.abort();
    routeDatesRequestRef.current.controller?.abort();
    reportRequestRef.current.controller?.abort();
    citasEtaRequestRef.current.controller?.abort();
    floatingAlertTimersRef.current.forEach(timer => clearTimeout(timer));
    floatingAlertTimersRef.current.clear();
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key !== 'Escape') return;
      if (showTurnoModal) { setShowTurnoModal(false); setTurnoSummary(null); }
      else if (showExistingGeofenceModal) cerrarExistingGeofenceModal();
      else if (showClienteGeofenceModal) cerrarClienteGeofenceModal();
      else if (showClienteModal) cerrarClienteModal();
      else if (showRemolqueModal) cerrarRemolqueModal();
      else if (showHistorialModal) setShowHistorialModal(false);
      else if (showPendienteModal) { pendienteRequestRef.current.controller?.abort(); pendienteRequestRef.current.generation += 1; setShowPendienteModal(false); setPendienteEditando(null); setNuevoComentarioPendiente(''); }
      else if (showMensajeModal) setShowMensajeModal(false);
      else if (showSeguimientoUpdateModal) setShowSeguimientoUpdateModal(false);
      else if (showViajeModal) { setShowViajeModal(false); setViajeEditando(false); }
      else if (showProgramarViajeModal) setShowProgramarViajeModal(false);
      else if (selectedVehicle) setSelectedVehicle(null);
      else if (showUnidadModal) setShowUnidadModal(false);
      else if (showZoneModal) setShowZoneModal(false);
      else if (citaSeleccionada) setCitaSeleccionada(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedVehicle, showClienteGeofenceModal, showClienteModal, showExistingGeofenceModal, showHistorialModal, showMensajeModal, showPendienteModal, showProgramarViajeModal, showRemolqueModal, showSeguimientoUpdateModal, showTurnoModal, showUnidadModal, showViajeModal, showZoneModal, citaSeleccionada]);

  useEffect(() => {
    if (!apiUrl) return;
    const initAuth = async () => {
      const storedToken = localStorage.getItem('gers_auth_token');
      if (!storedToken) {
        setAuthLoading(false);
        return;
      }
      try {
        const meRes = await fetch(`${apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (!meRes.ok) throw new Error('Sesión inválida');
        const meData = await meRes.json();
        setAuthToken(storedToken);
        setCurrentUser(meData.user);
      } catch {
        localStorage.removeItem('gers_auth_token');
        setAuthToken('');
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    initAuth();
  }, [apiUrl]);

  useEffect(() => {
    if (apiUrl && currentUser) loadAll();
  }, [apiUrl, currentUser]);

  useEffect(() => {
    if (!apiUrl || !currentUser) return;
    const source = new EventSource(`${apiUrl}/live?token=${encodeURIComponent(authToken)}`);
    const handleReload = () => {
      if (Date.now() < sseCooldownUntilRef.current) return;
      clearTimeout(loadAllTimerRef.current);
      loadAllTimerRef.current = setTimeout(() => loadAll(), 750);
    };
    const noop = () => {};
    const handleCustomerGeofenceAlert = event => {
      try {
        const payload = JSON.parse(event.data || '{}');
        const alert = payload.detail?.alert;
        if (!alert?.id) return;
        setAlertas(current => [alert, ...current.filter(item => item.id !== alert.id)]);
        setFloatingAlerts(current => [alert, ...current.filter(item => item.id !== alert.id)].slice(0, 3));
        const timer = setTimeout(() => {
          setFloatingAlerts(current => current.filter(item => item.id !== alert.id));
          floatingAlertTimersRef.current.delete(timer);
        }, 10000);
        floatingAlertTimersRef.current.add(timer);
      } catch {}
    };
    source.addEventListener('reload', handleReload);
    source.addEventListener('vehicles', handleReload);
    source.addEventListener('client-geofence-alert', handleCustomerGeofenceAlert);
    source.addEventListener('new-alert', handleCustomerGeofenceAlert);
    source.addEventListener('connected', noop);
    return () => {
      source.removeEventListener('reload', handleReload);
      source.removeEventListener('vehicles', handleReload);
      source.removeEventListener('client-geofence-alert', handleCustomerGeofenceAlert);
      source.removeEventListener('new-alert', handleCustomerGeofenceAlert);
      source.removeEventListener('connected', noop);
      source.close();
      clearTimeout(loadAllTimerRef.current);
    };
  }, [apiUrl, authToken, currentUser]);

  const apiRequest = (url, options = {}) => {
    const headers = { ...(options.headers || {}) };
    const isBackendUrl = typeof url === 'string' && apiUrl && url.startsWith(apiUrl);
    if (isBackendUrl && authToken && !headers.Authorization) headers.Authorization = `Bearer ${authToken}`;
    return globalThis.fetch(url, { ...options, headers }).then(async (res) => {
      if (res.status === 401) {
        localStorage.removeItem('gers_auth_token');
        setAuthToken('');
        setCurrentUser(null);
        throw new Error('Sesión inválida o expirada');
      }
      return res;
    });
  };

  const authFetch = apiRequest;
  const fetch = apiRequest;
  const apiJson = async (url, options = {}) => {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || `Error ${res.status}`);
    return data;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo iniciar sesión');
      localStorage.setItem('gers_auth_token', data.token);
      setAuthToken(data.token);
      setCurrentUser(data.user);
    } catch (err) {
      setLoginError(err.message || 'Error al iniciar sesión');
    }
  };

  const handleLogout = async () => {
    try {
      await authFetch(`${apiUrl}/auth/logout`, { method: 'POST' });
    } catch {}
    localStorage.removeItem('gers_auth_token');
    setAuthToken('');
    setCurrentUser(null);
  };

  const guardarUsuario = async (e) => {
    e.preventDefault();
    setUsuarioMsg('');
    try {
      const res = await authFetch(`${apiUrl}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formUsuario),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el usuario');
      setUsuarioMsg(`Usuario ${data.username} creado`);
      setFormUsuario({ username: '', password: '', nombre: '', rol: 'user' });
      if (currentUser?.rol === 'admin') {
        const lista = await authFetch(`${apiUrl}/users`).then(r => r.json()).catch(() => []);
        setUsuarios(Array.isArray(lista) ? lista : []);
      }
    } catch (err) {
      setUsuarioMsg(err.message || 'Error al crear usuario');
    }
  };

  const entregarTurno = async (e) => {
    e.preventDefault();
    setTurnoLoading(true);
    try {
      const res = await fetch(`${apiUrl}/turnos/resumen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(turnoForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo generar el reporte');
      setTurnoSummary({ ...data, saved: false });
    } catch (err) {
      alert(err.message || 'Error al generar el reporte');
    } finally {
      setTurnoLoading(false);
    }
  };

  const guardarCierreTurno = async () => {
    setTurnoSaving(true);
    try {
      const res = await fetch(`${apiUrl}/turnos/entregar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(turnoForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar el reporte');
      setTurnoSummary({ ...data, saved: true });
      descargarPdfTurno(data, data.report);
      setShowTurnoModal(false);
      await handleLogout();
    } catch (err) {
      alert(err.message || 'Error al guardar el reporte');
    } finally {
      setTurnoSaving(false);
    }
  };

  useEffect(() => {
    if (!apiUrl || !currentUser) return;
    const interval = setInterval(() => {
      loadAll();
    }, 300000);
    return () => clearInterval(interval);
  }, [apiUrl, currentUser]);

  useEffect(() => {
    if (!destinoInput.trim() || !selectedVehicle?.location) { setEtaData(null); setEtaError(''); setCalculandoEta(false); return; }
    const vehicle = selectedVehicle;
    const timer = setTimeout(() => calcularETA(destinoInput, vehicle), 1500);
    return () => {
      clearTimeout(timer);
      etaRequestRef.current.controller?.abort();
      etaRequestRef.current.generation += 1;
    };
  }, [destinoInput, selectedVehicle?.id]);

  useEffect(() => {
    if (!selectedVehicle) {
      setOperadorDraft('');
      setTelefonoDraft('');
      setRemolqueDraft('');
      setRemolqueModo('sencillo');
      setRemolquesFullDraft(['', '']);
      return;
    }
    const key = idStr(selectedVehicle.id);
    const savedOperador = operadores[key]?.nombre || '';
    const savedTelefono = operadores[key]?.telefono || '';
    const assigned = remolques.find(r => String(r.vehicle_id_asignado || '') === String(selectedVehicle.id) || String(r.unidad_asignada || '').toLowerCase() === String(selectedVehicle.name || '').toLowerCase());
    const fullAsignado = String(assigned?.tipo_asignacion || '').toLowerCase() === 'full' || assigned?.grupo_full;
    const miembrosFull = fullAsignado
      ? remolques.filter(r => assigned.grupo_full && String(r.grupo_full) === String(assigned.grupo_full))
      : [];
    setOperadorDraft(savedOperador);
    setTelefonoDraft(savedTelefono);
    setRemolqueModo(fullAsignado ? 'full' : 'sencillo');
    setRemolqueDraft(assigned && !fullAsignado ? String(assigned.id) : '');
    setRemolquesFullDraft(fullAsignado ? [String(miembrosFull[0]?.id || ''), String(miembrosFull[1]?.id || '')] : ['', '']);
  }, [selectedVehicle?.id]);

  useEffect(() => {
    if (!showViajeModal || viajeEditando || !viajeDetalle?.id) return;
    const updated = viajes.find(viaje => String(viaje.id) === String(viajeDetalle.id));
    if (updated) setViajeDetalle(updated);
  }, [viajes, showViajeModal, viajeEditando, viajeDetalle?.id]);

  useEffect(() => {
    setDestinoInput('');
    setEtaData(null);
    setEtaError('');
    setCalculandoEta(false);
  }, [selectedVehicle?.id]);

  const primerDestinoForm = formViaje.tipo_entrega === 'reparto' ? formViaje.destinos?.[0] || '' : formViaje.destino;

  useEffect(() => {
    if (!primerDestinoForm.trim() || !formViaje.vehicle_id) { setViajeEta(null); setViajeEtaError(''); setCalculandoViajeEta(false); return; }
    const v = vehiculos.find(vh => String(vh.id) === formViaje.vehicle_id);
    if (!v?.location) { setViajeEta(null); setViajeEtaError('Vehiculo sin ubicacion GPS'); setCalculandoViajeEta(false); return; }
    setViajeEtaError('');
    const timer = setTimeout(() => calcularViajeETA(primerDestinoForm, v), 1500);
    return () => {
      clearTimeout(timer);
      viajeEtaRequestRef.current.controller?.abort();
      viajeEtaRequestRef.current.generation += 1;
    };
  }, [primerDestinoForm, formViaje.vehicle_id]);

  const parseFecha = (str) => {
    if (!str) return null;
    const value = String(str).trim();
    if (value.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(value)) return new Date(value);
    if (value.includes('T')) return new Date(value);
    return new Date(value.replace(' ', 'T') + 'Z');
  };

  const parseFechaProgramada = (str) => {
    if (!str) return null;
    if (str.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(str)) return new Date(str);
    return new Date(String(str).replace(' ', 'T'));
  };

  const formatFechaProgramada = (str) => {
    const fecha = parseFechaProgramada(str);
    return fecha && !Number.isNaN(fecha.getTime())
      ? fecha.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
      : String(str || '');
  };

  const loadAll = () => {
    if (loadAllInFlightRef.current) {
      loadAllQueuedRef.current = true;
      return loadAllInFlightRef.current;
    }
    const requestJson = async (url) => {
      const res = await fetch(url);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || data?.message || `Error ${res.status}`);
      return data;
    };
    const pendientesVersion = pendientesVersionRef.current;
    const run = async () => {
      setLoading(true);
      const [statsRes, pendientesRes, viajesRes, alertasRes, vehiculosRes, operadoresRes, driversRes, geofencesRes, eventsRes, riskZonesRes, samsaraAddrRes, remolquesRes, seguimientoRes, unidadesRes, mapasRes, clientesRes, geofenceLinksRes, kpisRes] = await Promise.allSettled([
        requestJson(`${apiUrl}/reportes/resumen`), requestJson(`${apiUrl}/pendientes`), requestJson(`${apiUrl}/viajes`),
        requestJson(`${apiUrl}/alertas`), requestJson(`${apiUrl}/samsara/vehicles`),
        requestJson(`${apiUrl}/vehicle-operators`), requestJson(`${apiUrl}/samsara/drivers`), requestJson(`${apiUrl}/geofences`),
        requestJson(`${apiUrl}/geofence-events?limit=100`), requestJson(`${apiUrl}/risk-zones`), requestJson(`${apiUrl}/samsara/addresses`),
        requestJson(`${apiUrl}/remolques`), requestJson(`${apiUrl}/seguimiento`), requestJson(`${apiUrl}/unidades`), requestJson(`${apiUrl}/mapas`), requestJson(`${apiUrl}/clientes`), requestJson(`${apiUrl}/clientes/geofence-links`), requestJson(`${apiUrl}/kpis`),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value && !Array.isArray(statsRes.value)) setStats(statsRes.value);
      if (kpisRes.status === 'fulfilled' && kpisRes.value && !Array.isArray(kpisRes.value)) setKpis(kpisRes.value);
      if (pendientesRes.status === 'fulfilled' && Array.isArray(pendientesRes.value) && pendientesVersion === pendientesVersionRef.current) setPendientes(pendientesRes.value);
      if (viajesRes.status === 'fulfilled' && Array.isArray(viajesRes.value)) setViajes(normalizarViajes(viajesRes.value));
      if (alertasRes.status === 'fulfilled' && Array.isArray(alertasRes.value)) setAlertas(alertasRes.value);
      if (driversRes.status === 'fulfilled' && Array.isArray(driversRes.value)) setSamsaraDrivers(driversRes.value);
      if (geofencesRes.status === 'fulfilled' && Array.isArray(geofencesRes.value)) setGeofences(geofencesRes.value);
      if (eventsRes.status === 'fulfilled' && Array.isArray(eventsRes.value)) setGeofenceEvents(eventsRes.value);
      if (riskZonesRes.status === 'fulfilled' && Array.isArray(riskZonesRes.value)) setCustomRiskZones(riskZonesRes.value);
      if (samsaraAddrRes.status === 'fulfilled' && Array.isArray(samsaraAddrRes.value)) setSamsaraAddresses(samsaraAddrRes.value);
      if (remolquesRes.status === 'fulfilled' && Array.isArray(remolquesRes.value)) setRemolques(remolquesRes.value);
      if (seguimientoRes.status === 'fulfilled' && Array.isArray(seguimientoRes.value)) setSeguimiento(normalizarSeguimiento(seguimientoRes.value));
      if (unidadesRes.status === 'fulfilled' && Array.isArray(unidadesRes.value)) setUnidadesLocales(unidadesRes.value);
      if (clientesRes.status === 'fulfilled' && Array.isArray(clientesRes.value)) setClientes(clientesRes.value);
      if (geofenceLinksRes.status === 'fulfilled' && Array.isArray(geofenceLinksRes.value)) setGeofenceLinks(geofenceLinksRes.value);
      if (mapasRes.status === 'fulfilled' && Array.isArray(mapasRes.value)) {
        setMapas(mapasRes.value);
        setSelectedMapa(prev => mapasRes.value.find(mapa => String(mapa.id) === String(prev?.id)) || mapasRes.value[0] || null);
        setMapasError('');
      } else if (mapasRes.status === 'rejected') {
        setMapasError(mapasRes.reason?.message || 'No se pudieron cargar los mapas');
      }

      const viajesActivosRes = await requestJson(`${apiUrl}/viajes/activos`).catch(() => null);
      if (Array.isArray(viajesActivosRes)) setViajesActivos(normalizarViajes(viajesActivosRes));
      if (operadoresRes.status === 'fulfilled' && Array.isArray(operadoresRes.value)) {
        const map = {};
        for (const op of operadoresRes.value) {
          map[idStr(op.vehicle_id)] = { nombre: op.operator_name, telefono: op.telefono || '' };
        }
        setOperadores(map);
      }
      if (vehiculosRes.status === 'fulfilled') {
        const v = vehiculosRes.value;
        const rows = Array.isArray(v) ? v : (Array.isArray(v?.data) ? v.data : Array.isArray(v?.vehicles) ? v.vehicles : null);
        if (rows) setVehiculos(rows);
      }
      if (currentUser?.rol === 'admin') {
        const usersRes = await requestJson(`${apiUrl}/users`).catch(() => null);
        if (Array.isArray(usersRes)) setUsuarios(usersRes);
      }
      sseCooldownUntilRef.current = Date.now() + 3000;
    };
    const promise = run().catch(e => console.error('Error cargando datos:', e)).finally(() => {
      setLoading(false);
      loadAllInFlightRef.current = null;
      if (loadAllQueuedRef.current) {
        loadAllQueuedRef.current = false;
        setTimeout(() => loadAll(), 0);
      }
    });
    loadAllInFlightRef.current = promise;
    return promise;
  };

  const refreshAlertas = async () => {
    const rows = await fetch(`${apiUrl}/alertas`).then(r => r.json()).catch(() => []);
    setAlertas(Array.isArray(rows) ? rows : []);
  };

  const refreshAlertasArchivadas = async () => {
    const rows = await fetch(`${apiUrl}/alertas?archivadas=1`).then(r => r.json()).catch(() => []);
    setAlertasArchivadas(Array.isArray(rows) ? rows : []);
  };

  const refreshRemolques = async () => {
    const rows = await fetch(`${apiUrl}/remolques`).then(r => r.json()).catch(() => []);
    setRemolques(Array.isArray(rows) ? rows : []);
  };

  const refreshClientes = async () => {
    const rows = await apiJson(`${apiUrl}/clientes`);
    setClientes(Array.isArray(rows) ? rows : []);
  };

  const refreshGeofenceLinks = async () => {
    const rows = await apiJson(`${apiUrl}/clientes/geofence-links`);
    setGeofenceLinks(Array.isArray(rows) ? rows : []);
  };

  const refreshSeguimiento = async () => {
    const rows = await fetch(`${apiUrl}/seguimiento`).then(r => r.json()).catch(() => []);
    setSeguimiento(normalizarSeguimiento(rows));
  };

  const refreshGeofences = async () => {
    const [gRows, eRows] = await Promise.all([
      fetch(`${apiUrl}/geofences`).then(r => r.json()).catch(() => []),
      fetch(`${apiUrl}/geofence-events?limit=100`).then(r => r.json()).catch(() => []),
    ]);
    setGeofences(Array.isArray(gRows) ? gRows : []);
    setGeofenceEvents(Array.isArray(eRows) ? eRows : []);
  };

  const refreshRiskZones = async () => {
    const rows = await fetch(`${apiUrl}/risk-zones`).then(r => r.json()).catch(() => []);
    setCustomRiskZones(Array.isArray(rows) ? rows : []);
  };

  const refreshUnidadesLocales = async () => {
    const rows = await fetch(`${apiUrl}/unidades`).then(r => r.json()).catch(() => []);
    setUnidadesLocales(Array.isArray(rows) ? rows : []);
  };

  const mapaUrl = (mapa) => mapa?.url || mapa?.url_google_maps || mapa?.google_maps_url || '';

  const googleUrlSeguro = (value) => {
    try {
      const url = new URL(String(value || '').trim());
      const hostname = url.hostname.toLowerCase();
      if (url.protocol !== 'https:' || (hostname !== 'google.com' && !hostname.endsWith('.google.com'))) return '';
      return url.href;
    } catch {
      return '';
    }
  };

  const googleMyMapsEmbedUrl = (value) => {
    const segura = googleUrlSeguro(value);
    if (!segura) return '';
    const mid = new URL(segura).searchParams.get('mid')?.trim();
    return mid ? `https://www.google.com/maps/d/embed?mid=${encodeURIComponent(mid)}` : '';
  };

  const refreshMapas = async (preferredId) => {
    try {
      const rows = await apiJson(`${apiUrl}/mapas`);
      const lista = Array.isArray(rows) ? rows : [];
      setMapas(lista);
      setSelectedMapa(prev => lista.find(mapa => String(mapa.id) === String(preferredId ?? prev?.id)) || lista[0] || null);
      setMapasError('');
      return lista;
    } catch (err) {
      setMapasError(err.message || 'No se pudieron cargar los mapas');
      return [];
    }
  };

  const guardarMapa = async (e) => {
    e.preventDefault();
    const urlSegura = googleUrlSeguro(formMapa.url);
    if (!formMapa.nombre.trim() || !urlSegura) {
      setMapasError('Ingresa un nombre y una URL HTTPS válida de Google My Maps.');
      return;
    }
    const esReparto = formMapa.tipo_entrega === 'reparto';
    const destinos = esReparto ? parseDestinos(formMapa.destinos) : [];
    if (esReparto && destinos.length < 2) {
      setMapasError('Ingresa al menos dos destinos para el reparto.');
      return;
    }
    if (!findGeofence(formMapa.origen) || [...destinos].some(destino => !findGeofence(destino))) {
      setMapasError('Selecciona el origen y todos los destinos de la lista de geocercas.');
      return;
    }
    const urlNormalizada = googleMyMapsEmbedUrl(urlSegura) || urlSegura;
    const payload = {
      nombre: formMapa.nombre.trim(),
      origen: formMapa.origen.trim(),
      destino: esReparto ? destinos[destinos.length - 1] : formMapa.destino.trim(),
      tipo_entrega: esReparto ? 'reparto' : 'directo',
      destinos: esReparto ? destinos : (formMapa.destino.trim() ? [formMapa.destino.trim()] : []),
      descripcion: formMapa.descripcion.trim(),
      url: urlNormalizada,
    };
    try {
      setMapaSaving(true);
      setMapasError('');
      const guardado = await apiJson(`${apiUrl}/mapas${mapaEditando?.id ? `/${mapaEditando.id}` : ''}`, {
        method: mapaEditando?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const preferredId = guardado?.id || mapaEditando?.id;
      setFormMapa({ nombre: '', origen: '', destino: '', descripcion: '', url: '', tipo_entrega: 'directo', destinos: ['', ''] });
      setMapaEditando(null);
      await refreshMapas(preferredId);
    } catch (err) {
      setMapasError(err.message || 'No se pudo guardar el mapa');
    } finally {
      setMapaSaving(false);
    }
  };

  const editarMapa = (mapa) => {
    setMapaEditando(mapa);
    const destinosParse = parseDestinos(mapa.destinos_json || mapa.destinos);
    const esReparto = mapa.tipo_entrega === 'reparto' || destinosParse.length > 1;
    setFormMapa({
      nombre: mapa.nombre || '',
      origen: mapa.origen || '',
      destino: mapa.destino || destinosParse.at(-1) || '',
      descripcion: mapa.descripcion || '',
      url: mapaUrl(mapa),
      tipo_entrega: esReparto ? 'reparto' : 'directo',
      destinos: esReparto ? [...destinosParse, '', ''].slice(0, Math.max(2, destinosParse.length)) : ['', ''],
    });
    setMapasError('');
  };

  const cancelarEdicionMapa = () => {
    setMapaEditando(null);
    setFormMapa({ nombre: '', origen: '', destino: '', descripcion: '', url: '', tipo_entrega: 'directo', destinos: ['', ''] });
    setMapasError('');
  };

  const eliminarMapa = async (mapa) => {
    if (!confirm(`¿Eliminar el mapa ${mapa.nombre}?`)) return;
    try {
      await apiJson(`${apiUrl}/mapas/${mapa.id}`, { method: 'DELETE' });
      await refreshMapas();
    } catch (err) {
      setMapasError(err.message || 'No se pudo eliminar el mapa');
    }
  };

  const detectarMapasLinks = async (urls) => {
    const data = await apiJson(`${apiUrl}/mapas/detectar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    });
    const creadas = [...new Set((data?.mapas || []).flatMap(m => m.geocercas_creadas || []))];
    if (creadas.length) {
      const geofencesRes = await fetch(`${apiUrl}/geofences`).then(r => r.json()).catch(() => []);
      setGeofences(Array.isArray(geofencesRes) ? geofencesRes : []);
    }
    return { mapas: data?.mapas || [], errores: data?.errores || [] };
  };

  const guardarMapaDetectado = async (mapaDetectado) => {
    const esReparto = mapaDetectado.tipo_entrega === 'reparto';
    const destinos = esReparto ? parseDestinos(mapaDetectado.destinos) : [];
    const urlNormalizada = googleMyMapsEmbedUrl(mapaDetectado.url) || mapaDetectado.url;
    const payload = {
      nombre: (mapaDetectado.nombre || '').trim(),
      origen: (mapaDetectado.origen || '').trim(),
      destino: esReparto ? destinos[destinos.length - 1] : (mapaDetectado.destino || '').trim(),
      tipo_entrega: esReparto ? 'reparto' : 'directo',
      destinos: esReparto ? destinos : ((mapaDetectado.destino || '').trim() ? [(mapaDetectado.destino || '').trim()] : []),
      descripcion: mapaDetectado.descripcion || 'Detectada desde Google My Maps',
      url: urlNormalizada,
    };
    if (!payload.nombre || !payload.origen) throw new Error('Cada ruta detectada necesita nombre y origen.');
    const guardado = await apiJson(`${apiUrl}/mapas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return guardado;
  };

  const refreshPendientes = async () => {
    const rows = await fetch(`${apiUrl}/pendientes`).then(r => r.json()).catch(() => []);
    setPendientes(Array.isArray(rows) ? rows : []);
    return rows;
  };

  const refreshViajes = async () => {
    const [rows, activos] = await Promise.all([
      fetch(`${apiUrl}/viajes`).then(r => r.json()).catch(() => []),
      fetch(`${apiUrl}/viajes/activos`).then(r => r.json()).catch(() => []),
    ]);
    setViajes(normalizarViajes(rows));
    setViajesActivos(normalizarViajes(activos));
    return rows;
  };

  const guardarPendiente = async (e) => {
    e?.preventDefault();
    const editando = !!pendienteEditando?.id;
    const payloadNuevo = {
      titulo: formPendiente.titulo.trim(),
      descripcion: formPendiente.descripcion || '',
      prioridad: formPendiente.prioridad || 'media',
      asignado_a: formPendiente.asignado_a || '',
      turno: formPendiente.turno || '',
      notas: '',
      estado: formPendiente.estado || pendienteEditando?.estado || 'pendiente',
    };
    const payload = editando ? { prioridad: formPendiente.prioridad || 'media' } : payloadNuevo;
    try {
      setPendienteSaving(true);
      await apiJson(`${apiUrl}/pendientes${editando ? `/${pendienteEditando.id}` : ''}`, {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setFormPendiente({ titulo: '', descripcion: '', prioridad: 'media', asignado_a: '', turno: '', notas: '', estado: 'pendiente' });
      setPendienteEditando(null);
      setShowPendienteModal(false);
      void refreshPendientes();
      return true;
    } catch (err) {
      alert(err.message || 'No se pudo guardar el pendiente');
      return false;
    } finally {
      setPendienteSaving(false);
    }
  };

  const eliminarUsuario = async (user) => {
    if (user.id === currentUser?.id) return;
    if (!confirm(`¿Eliminar al usuario ${user.username}? Esta acción cerrará sus sesiones.`)) return;
    setUsuarioMsg('');
    try {
      await apiJson(`${apiUrl}/users/${user.id}`, { method: 'DELETE' });
      setUsuarios(prev => prev.filter(item => item.id !== user.id));
      setUsuarioMsg(`Usuario ${user.username} eliminado`);
    } catch (err) {
      setUsuarioMsg(err.message || 'No se pudo eliminar el usuario');
    }
  };

  const eliminarPendiente = async (id) => {
    if (!confirm('¿Eliminar este pendiente?')) return;
    try {
      const result = await apiJson(`${apiUrl}/pendientes/${id}`, { method: 'DELETE' });
      if (result?.changes === 0) {
        throw new Error('No se encontró el pendiente para eliminar');
      }
      setPendientes(prev => prev.filter(p => String(p.id) !== String(id)));
      setHistorialPendientes(prev => prev.filter(p => String(p.id) !== String(id)));
      void refreshPendientes();
      return true;
    } catch (err) {
      alert(err.message || 'No se pudo eliminar el pendiente');
      return false;
    }
  };

  const cambiarEstadoPendiente = async (id, nuevoEstado) => {
    const p = pendientes.find(x => x.id === id);
    if (!p) return;
    try {
      await apiJson(`${apiUrl}/pendientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...p, estado: nuevoEstado }),
      });
      await refreshPendientes();
    } catch (err) {
      alert(err.message || 'No se pudo cambiar el estado');
    }
  };

  const agregarComentarioPendiente = async (pendienteId, contenido) => {
    if (!contenido.trim()) return;
    const generation = pendienteRequestRef.current.generation;
    try {
      await apiJson(`${apiUrl}/pendientes/${pendienteId}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido }),
      });
      if (pendienteRequestRef.current.generation !== generation || String(pendienteEditando?.id) !== String(pendienteId)) return;
      setNuevoComentarioPendiente('');
      const res = await fetch(`${apiUrl}/pendientes/${pendienteId}/comentarios`);
      const comentarios = await res.json().catch(() => []);
      if (!res.ok) throw new Error('No se pudieron actualizar los comentarios');
      if (pendienteRequestRef.current.generation === generation) {
        setPendienteEditando(prev => String(prev?.id) === String(pendienteId) ? { ...prev, comentarios: Array.isArray(comentarios) ? comentarios : [] } : prev);
      }
    } catch (err) {
      alert(err.message || 'No se pudo agregar el comentario');
    }
  };

  const abrirPendiente = async (pendiente) => {
    pendienteRequestRef.current.controller?.abort();
    const controller = new AbortController();
    const generation = pendienteRequestRef.current.generation + 1;
    pendienteRequestRef.current = { generation, controller };
    setPendienteEditando({ ...pendiente, comentarios: [] });
    setFormPendiente({
      titulo: pendiente.titulo || '', descripcion: pendiente.descripcion || '', prioridad: pendiente.prioridad || 'media',
      asignado_a: pendiente.asignado_a || '', turno: pendiente.turno || '', notas: pendiente.notas || '', estado: pendiente.estado || 'pendiente',
    });
    setNuevoComentarioPendiente('');
    setShowPendienteModal(true);
    try {
      const res = await fetch(`${apiUrl}/pendientes/${pendiente.id}/comentarios`, { signal: controller.signal });
      const comentarios = await res.json().catch(() => []);
      if (!res.ok) throw new Error('No se pudieron cargar los comentarios');
      if (pendienteRequestRef.current.generation === generation) {
        setPendienteEditando(prev => String(prev?.id) === String(pendiente.id) ? { ...prev, comentarios: Array.isArray(comentarios) ? comentarios : [] } : prev);
      }
    } catch (err) {
      if (err.name !== 'AbortError' && pendienteRequestRef.current.generation === generation) {
        alert(err.message || 'No se pudieron cargar los comentarios');
      }
    }
  };

  const cerrarPendiente = () => {
    pendienteRequestRef.current.controller?.abort();
    pendienteRequestRef.current.generation += 1;
    setShowPendienteModal(false);
    setPendienteEditando(null);
    setFormPendiente({ titulo: '', descripcion: '', prioridad: 'media', asignado_a: '', turno: '', notas: '', estado: 'pendiente' });
    setNuevoComentarioPendiente('');
  };

  const archivarCompletados = async () => {
    const completados = pendientes.filter(p => p.estado === 'completado');
    if (completados.length === 0) { alert('No hay pendientes completados para archivar'); return; }
    if (!confirm(`¿Archivar ${completados.length} pendiente(s) completado(s)?`)) return;
    try {
      const data = await apiJson(`${apiUrl}/pendientes/archivar-completados`, { method: 'POST' });
      if (data.archived > 0) {
        pendientesVersionRef.current += 1;
        const idsArchivados = new Set(completados.map(item => String(item.id)));
        setPendientes(prev => prev.filter(item => !idsArchivados.has(String(item.id))));
        alert(`${data.archived} pendiente(s) archivado(s)`);
        await refreshPendientes();
      }
    } catch (err) {
      alert(err.message || 'No se pudieron archivar los pendientes');
    }
  };

  const cargarHistorial = async () => {
    setShowHistorialModal(true);
    try {
      const data = await fetch(`${apiUrl}/pendientes/historial`).then(r => r.json());
      setHistorialPendientes(data);
    } catch {
      setHistorialPendientes([]);
    }
  };

  const handleDragStart = (e, pendiente) => {
    setDraggedPendiente(pendiente);
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedPendiente(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, estado) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(estado);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e, nuevoEstado) => {
    e.preventDefault();
    if (draggedPendiente && draggedPendiente.estado !== nuevoEstado) {
      await cambiarEstadoPendiente(draggedPendiente.id, nuevoEstado);
    }
    setDraggedPendiente(null);
    setDragOverColumn(null);
  };

  const crearViaje = async (e) => {
    e.preventDefault();
    const payload = payloadViaje(formViaje);
    const destinosIncompletos = payload.tipo_entrega === 'reparto' && (formViaje.destinos.length < 2 || formViaje.destinos.some(destino => !String(destino || '').trim()));
    if (destinosIncompletos || !payload.destino) {
      alert(payload.tipo_entrega === 'reparto' ? 'Ingresa al menos dos destinos para el reparto.' : 'Ingresa el destino del viaje.');
      return;
    }
    const ubicaciones = [payload.origen, ...destinosViaje(payload)];
    if (ubicaciones.some(value => !findGeofence(value))) {
      alert('Selecciona el origen y todos los destinos de la lista de geocercas.');
      return;
    }
    let whatsappPopup = null;
    let whatsappUrl = '';
    const tel = whatsappDigits(formViaje.telefono);
    if (tel) {
      const inicio = formViaje.fecha_inicio ? formatFechaProgramada(formViaje.fecha_inicio) : 'Por definir';
      const fin = formViaje.fecha_fin ? formatFechaProgramada(formViaje.fecha_fin) : 'Por definir';
      const directions = new URL('https://www.google.com/maps/dir/');
      directions.searchParams.set('api', '1');
      directions.searchParams.set('origin', formViaje.origen || '');
      directions.searchParams.set('destination', payload.destino);
      if (payload.tipo_entrega === 'reparto' && payload.destinos.length > 1) directions.searchParams.set('waypoints', payload.destinos.slice(0, -1).join('|'));
      const detalleDestinos = payload.tipo_entrega === 'reparto'
        ? `\n\n*Destinos de reparto:*\n${payload.destinos.map((destino, index) => `${index + 1}. ${destino}`).join('\n')}`
        : '';
      const nombreDestino = payload.tipo_entrega === 'reparto' ? `${payload.destinos.length} paradas (final: ${payload.destino})` : payload.destino;
      const mapaCoincidenteEncontrado = mapaCoincidente(mapas, payload);
      const linkMapaGuardado = mapaCoincidenteEncontrado ? googleUrlSeguro(mapaUrl(mapaCoincidenteEncontrado)) || googleMyMapsEmbedUrl(mapaUrl(mapaCoincidenteEncontrado)) : '';
      const lineasLinks = linkMapaGuardado
        ? `*Mapa de la ruta:* ${linkMapaGuardado}`
        : `*Link de ruta:* ${directions.toString()}`;
      const msg = encodeURIComponent(`*Saludos ${formViaje.conductor || 'Operador'}.*\nSe le ha asignado un nuevo viaje, a continuación los detalles:\n\n*Nombre de viaje:* ${formViaje.origen || '?'} --> ${nombreDestino || '?'}${detalleDestinos}\n\n*Unidad:* ${formViaje.vehicle_name || formViaje.vehicle_id}\n*Remolque:* ${formViaje.remolque || 'Sin remolque'}\n*Hora de salida:* ${inicio}\n*Hora de descarga:* ${fin}\n\n*Instrucciones Adicionales:* ${formViaje.notas || 'Ninguna'}\n\n${lineasLinks}\n\n=========================================`);
      whatsappUrl = `https://wa.me/${tel}?text=${msg}`;
      whatsappPopup = window.open('', '_blank');
    }
    try {
      setViajeSaving(true);
      await apiJson(`${apiUrl}/viajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (whatsappUrl && whatsappPopup) whatsappPopup.location.href = whatsappUrl;
      if (whatsappUrl && !whatsappPopup) alert('El viaje se guardó, pero el navegador bloqueó WhatsApp. Permite ventanas emergentes para enviar mensajes.');
      setFormViaje(VIAJE_DEFAULT);
      setViajeEta(null);
      setViajeEtaError('');
      await refreshViajes();
      setShowProgramarViajeModal(false);
    } catch (err) {
      whatsappPopup?.close();
      alert(err.message || 'No se pudo programar el viaje');
    } finally {
      setViajeSaving(false);
    }
  };

  const actualizarEstadoViaje = async (id, estado) => {
    try {
      setViajeSaving(true);
      await apiJson(`${apiUrl}/viajes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: normalizarEstadoViaje(estado) }),
      });
      await refreshViajes();
      await refreshRemolques();
      return true;
    } catch (err) {
      alert(err.message || 'No se pudo cambiar el estado del viaje');
      return false;
    } finally {
      setViajeSaving(false);
    }
  };

  const actualizarParadaViaje = async (parada, estado) => {
    if (!viajeDetalle?.id || !parada?.id) return;
    try {
      const data = await apiJson(`${apiUrl}/viajes/${viajeDetalle.id}/paradas/${parada.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      });
      const applyStops = viaje => String(viaje.id) === String(viajeDetalle.id) ? { ...viaje, paradas: data.paradas || [] } : viaje;
      setViajes(current => current.map(applyStops));
      setViajesActivos(current => current.map(applyStops));
      setViajeDetalle(current => current ? { ...current, paradas: data.paradas || [] } : current);
    } catch (err) {
      alert(err.message || 'No se pudo actualizar la parada');
    }
  };

  const iniciarArrastreViaje = (e, viaje) => {
    viajeWasDraggedRef.current = true;
    setDraggedViaje(viaje);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(viaje.id));
  };

  const terminarArrastreViaje = () => {
    setDraggedViaje(null);
    setDragOverViajeColumn(null);
    setTimeout(() => { viajeWasDraggedRef.current = false; }, 100);
  };

  const soltarViaje = async (e, nuevoEstado) => {
    e.preventDefault();
    const viaje = draggedViaje;
    setDraggedViaje(null);
    setDragOverViajeColumn(null);
    setTimeout(() => { viajeWasDraggedRef.current = false; }, 100);
    if (!viaje || normalizarEstadoViaje(viaje.estado) === nuevoEstado) return;
    const estadoAnterior = viaje.estado || 'programado';
    setViajes(prev => prev.map(item => item.id === viaje.id ? { ...item, estado: nuevoEstado } : item));
    const guardado = await actualizarEstadoViaje(viaje.id, nuevoEstado);
    if (!guardado) {
      setViajes(prev => prev.map(item => item.id === viaje.id ? { ...item, estado: estadoAnterior } : item));
    }
  };

  const eliminarViaje = async (id) => {
    if (!confirm('Eliminar este viaje?')) return false;
    try {
      await apiJson(`${apiUrl}/viajes/${id}`, { method: 'DELETE' });
      await refreshViajes();
      return true;
    } catch (err) {
      alert(err.message || 'No se pudo eliminar el viaje');
      return false;
    }
  };

  const marcarAlertaLeida = async (id) => {
    try {
      await apiJson(`${apiUrl}/alertas/${id}/leer`, { method: 'PUT' });
      await refreshAlertas();
    } catch (err) {
      alert(err.message || 'No se pudo marcar la alerta');
    }
  };

  const archivarAlerta = async (id) => {
    try {
      await apiJson(`${apiUrl}/alertas/${id}/archivar`, { method: 'PUT' });
      await Promise.all([refreshAlertas(), refreshAlertasArchivadas()]);
    } catch (err) {
      alert(err.message || 'No se pudo archivar la alerta');
    }
  };

  const archivarAlertas = async () => {
    if (!confirm('¿Archivar todas las alertas activas? Podrás consultarlas y restaurarlas desde el historial.')) return;
    try {
      await apiJson(`${apiUrl}/alertas/archivar-todas`, { method: 'PUT' });
      await Promise.all([refreshAlertas(), refreshAlertasArchivadas()]);
    } catch (err) {
      alert(err.message || 'No se pudieron archivar las alertas');
    }
  };

  const restaurarAlerta = async (id) => {
    try {
      await apiJson(`${apiUrl}/alertas/${id}/restaurar`, { method: 'PUT' });
      await Promise.all([refreshAlertas(), refreshAlertasArchivadas()]);
    } catch (err) {
      alert(err.message || 'No se pudo restaurar la alerta');
    }
  };

  const crearRemolque = async () => {
    if (!formRemolque.numero.trim()) return;
    const isEditing = !!remolqueEditando;
    try {
      await apiJson(`${apiUrl}/remolques${isEditing ? `/${remolqueEditando.id}` : ''}`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formRemolque),
      });
      setShowRemolqueModal(false);
      setRemolqueEditando(null);
      setFormRemolque({ numero: '', categoria: 'Caja Seca' });
      await refreshRemolques();
    } catch (err) {
      alert(err.message || 'No se pudo guardar el remolque');
    }
  };

  const cerrarRemolqueModal = () => {
    setShowRemolqueModal(false);
    setRemolqueEditando(null);
    setFormRemolque({ numero: '', categoria: 'Caja Seca' });
  };

  const eliminarRemolque = async (id) => {
    if (confirm('Eliminar este remolque?')) {
    try {
      await apiJson(`${apiUrl}/remolques/${id}`, { method: 'DELETE' });
        await refreshRemolques();
      } catch (err) {
        alert(err.message || 'No se pudo eliminar el remolque');
      }
    }
  };

  const setResguardoRemolque = async (id, { resguardo, fecha_cita } = {}) => {
    try {
      await apiJson(`${apiUrl}/remolques/${id}/resguardo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resguardo: resguardo ? 1 : 0, fecha_cita: fecha_cita || null }),
      });
      await refreshRemolques();
      return true;
    } catch (err) {
      alert(err.message || 'No se pudo actualizar el resguardo');
      return false;
    }
  };

  const abrirClienteModal = (cliente = null) => {
    setClienteEditando(cliente);
    setFormCliente(cliente ? {
      nombre: cliente.nombre || '',
      contacto: cliente.contacto || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      wpp_groups: (cliente.wpp_groups || []).map(grupo => typeof grupo === 'string' ? grupo : String(grupo?.nombre || '').trim()).filter(Boolean),
    } : CLIENTE_DEFAULT);
    setShowClienteModal(true);
  };

  const cerrarClienteModal = () => {
    if (clienteSaving) return;
    setShowClienteModal(false);
    setClienteEditando(null);
    setFormCliente(CLIENTE_DEFAULT);
  };

  const guardarCliente = async (event) => {
    event.preventDefault();
    if (!formCliente.nombre.trim()) return;
    try {
      setClienteSaving(true);
      await apiJson(`${apiUrl}/clientes${clienteEditando ? `/${clienteEditando.id}` : ''}`, {
        method: clienteEditando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formCliente),
      });
      setShowClienteModal(false);
      setClienteEditando(null);
      setFormCliente(CLIENTE_DEFAULT);
      await refreshClientes();
    } catch (err) {
      alert(err.message || 'No se pudo guardar el cliente');
    } finally {
      setClienteSaving(false);
    }
  };

  const eliminarCliente = async (cliente) => {
    if (!confirm(`¿Eliminar al cliente "${cliente.nombre}"?`)) return;
    try {
      await apiJson(`${apiUrl}/clientes/${cliente.id}`, { method: 'DELETE' });
      if (String(selectedClienteId) === String(cliente.id)) setSelectedClienteId(null);
      await Promise.all([refreshClientes(), refreshGeofenceLinks(), refreshGeofences()]);
    } catch (err) {
      alert(err.message || 'No se pudo eliminar el cliente');
    }
  };

  const asignarRemolque = async (remolqueId, vehicleId, vehicleName) => {
    try {
      await apiJson(`${apiUrl}/remolques/${remolqueId}/asignar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_id: vehicleId, vehicle_name: vehicleName }),
      });
      await refreshRemolques();
    } catch (err) {
      alert(err.message || 'No se pudo asignar el remolque');
    }
  };

  const asignarFull = async (remolqueIds, vehicleId, vehicleName) => {
    try {
      await apiJson(`${apiUrl}/remolques/full/asignar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remolque_ids: remolqueIds, vehicle_id: vehicleId, vehicle_name: vehicleName }),
      });
      await refreshRemolques();
    } catch (err) {
      alert(err.message || 'No se pudo asignar el Full');
    }
  };

  const desasignarRemolque = async (remolqueId) => {
    try {
      await apiJson(`${apiUrl}/remolques/${remolqueId}/desasignar`, { method: 'POST' });
      await refreshRemolques();
    } catch (err) {
      alert(err.message || 'No se pudo desasignar el remolque');
    }
  };

  const cargarHistorialRemolque = async (remolqueId) => {
    remolqueHistoryRequestRef.current.controller?.abort();
    const controller = new AbortController();
    const generation = remolqueHistoryRequestRef.current.generation + 1;
    remolqueHistoryRequestRef.current = { generation, controller };
    setSelectedRemolque(remolqueId);
    setHistorialRemolque([]);
    setHistorialRemolqueError('');
    setHistorialRemolqueLoading(true);
    try {
      const res = await fetch(`${apiUrl}/remolques/${remolqueId}/historial`, { signal: controller.signal });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar el historial');
      if (!Array.isArray(data)) throw new Error('El historial recibido no es válido');
      if (remolqueHistoryRequestRef.current.generation === generation) setHistorialRemolque(data);
    } catch (err) {
      if (err.name !== 'AbortError' && remolqueHistoryRequestRef.current.generation === generation) {
        setHistorialRemolqueError(err.message || 'No se pudo cargar el historial');
      }
    } finally {
      if (remolqueHistoryRequestRef.current.generation === generation) setHistorialRemolqueLoading(false);
    }
  };

  const abrirRemolqueDashboard = (remolque) => {
    const miembros = obtenerMiembrosFull(remolque);
    const segundo = miembros.find(item => item.id !== remolque.id);
    setRemolqueDashVehicleId(remolque.vehicle_id_asignado || '');
    setRemolqueDashModo(miembros.length > 1 ? 'full' : 'sencillo');
    setRemolqueDashSegundoId(segundo ? String(segundo.id) : '');
    cargarHistorialRemolque(remolque.id);
  };

  const asignarRemolqueDesdeDashboard = async (remolque) => {
    const vehicle = vehiculos.find(item => String(item.id) === String(remolqueDashVehicleId));
    if (!vehicle) {
      alert('Selecciona una unidad');
      return;
    }
    if (remolqueDashModo === 'full' && !remolqueDashSegundoId) {
      alert('Selecciona el segundo tanque del Full');
      return;
    }
    setRemolqueDashSaving(true);
    try {
      if (remolqueDashModo === 'full') {
        await apiJson(`${apiUrl}/remolques/full/asignar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ remolque_ids: [remolque.id, Number(remolqueDashSegundoId)], vehicle_id: String(vehicle.id), vehicle_name: vehicle.name }),
        });
      } else {
        await apiJson(`${apiUrl}/remolques/${remolque.id}/asignar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vehicle_id: String(vehicle.id), vehicle_name: vehicle.name }),
        });
      }
      await refreshRemolques();
      await cargarHistorialRemolque(remolque.id);
    } catch (err) {
      alert(err.message || 'No se pudo asignar el remolque');
    } finally {
      setRemolqueDashSaving(false);
    }
  };

  const numeroRemolque = (numero) => `#${String(numero || '').replace(/^#+/, '')}`;
  const tempColor = (temp) => {
    if (!temp || temp.returnC == null) return '#6a9b6a';
    if (String(temp.state || '').toLowerCase() === 'off') return '#facc15';
    if (temp.setPointC == null) return '#60a5fa';
    return Math.abs(temp.returnC - temp.setPointC) > 2 ? '#f87171' : '#4ade80';
  };

  const obtenerMiembrosFull = (remolque) => {
    if (!remolque || (!remolque.grupo_full && String(remolque.tipo_asignacion || '').toLowerCase() !== 'full')) return [];
    const miembros = remolque.grupo_full
      ? remolques.filter(r => String(r.grupo_full || '') === String(remolque.grupo_full))
      : [remolque];
    return miembros.sort((a, b) => String(a.numero || '').localeCompare(String(b.numero || ''), undefined, { numeric: true }));
  };

  const displayRemolque = (remolque) => {
    const miembros = obtenerMiembrosFull(remolque);
    return miembros.length > 1 ? miembros.map(r => numeroRemolque(r.numero)).join(' + ') : (remolque?.numero || '');
  };

  const trailerNumeros = (value) => {
    const set = new Set();
    String(value || '').trim().toLowerCase().split(/[+,\s;]+/).forEach(t => {
      const n = (t.match(/\d+/g) || []).join('').replace(/^0+/, '');
      if (n) set.add(n);
    });
    return set;
  };
  const remolqueEnResguardoSinAsignar = (remolqueStr) => {
    const nums = trailerNumeros(remolqueStr);
    if (!nums.size) return false;
    return remolques.some(r => Number(r.resguardo) === 1 && !r.vehicle_id_asignado && !r.unidad_asignada && [...trailerNumeros(r.numero)].some(n => nums.has(n)));
  };
  const unidadCitaLabel = (item) => {
    if (!item) return '';
    return remolqueEnResguardoSinAsignar(item.remolque) ? numeroRemolque(item.remolque) : item.unidad || '';
  };

  const obtenerRemolqueAsignadoUnidad = (vehicleId, vehicleName = '') => {
    const unidad = String(vehicleName || vehiculos.find(v => String(v.id) === String(vehicleId))?.name || '').toLowerCase();
    const remolqueAsignado = remolques.find(r => String(r.vehicle_id_asignado || '') === String(vehicleId) || String(r.unidad_asignada || '').toLowerCase() === unidad);
    return displayRemolque(remolqueAsignado);
  };

  const obtenerOpcionesRemolque = (vehicleId) => {
    const opciones = [];
    const gruposIncluidos = new Set();
    const vehicleName = vehiculos.find(v => String(v.id) === String(vehicleId))?.name || '';
    remolques.forEach(r => {
      const miembros = obtenerMiembrosFull(r);
      const grupoMiembros = miembros.length > 1 ? miembros : [r];
      if (grupoMiembros.some(m => Number(m.resguardo) === 1)) return;
      if (miembros.length > 1) {
        const grupo = String(r.grupo_full);
        if (!gruposIncluidos.has(grupo)) {
          gruposIncluidos.add(grupo);
          const display = miembros.map(m => numeroRemolque(m.numero)).join(' + ');
          opciones.push({ key: `full-${grupo}`, value: display, label: `Full: ${display}` });
        }
      } else {
        const asignadoAOtra = r.vehicle_id_asignado && String(r.vehicle_id_asignado) !== String(vehicleId) && !(vehicleName && String(r.unidad_asignada || '').toLowerCase() === vehicleName.toLowerCase());
        opciones.push({ key: r.id, value: r.numero, label: asignadoAOtra ? `${numeroRemolque(r.numero)} (en ${r.unidad_asignada || r.vehicle_id_asignado})` : numeroRemolque(r.numero) });
      }
    });
    return opciones.sort((a, b) => String(a.value).localeCompare(String(b.value), undefined, { numeric: true }));
  };

  const ubicacionRemolque = (r) => {
    const gps = r?.trailer_gps || null;
    const vehicle = r.vehicle_id_asignado || r.unidad_asignada
      ? vehiculos.find(v => String(v.id) === String(r.vehicle_id_asignado) || String(v.name || '').toLowerCase() === String(r.unidad_asignada || '').toLowerCase())
      : null;
    if (gps) {
      const location = gps.latitude ? { latitude: gps.latitude, longitude: gps.longitude, speed: gps.speed, location: gps.location || '', formattedLocation: gps.location || '' } : null;
      const geofence = location ? geofenceAtLocation(location) : null;
      return {
        libre: false,
        gpsPropio: true,
        vehicle,
        unidad: vehicle?.name || r.unidad_asignada || r.vehicle_id_asignado,
        trailer: r,
        location,
        geofence,
        enMovimiento: estaEnMovimiento(location?.speed),
        velocidad: location ? velocidadKmh(location.speed) : 0,
        online: !!gps.isOnline,
        lastSeenMin: gps.minutesAgo != null ? gps.minutesAgo : 999,
      };
    }
    if (!r.vehicle_id_asignado && !r.unidad_asignada) return { libre: true };
    if (!vehicle) return { libre: false, sinUnidad: true, unidad: r.unidad_asignada || r.vehicle_id_asignado };
    const location = vehicle.location || null;
    const geofence = location ? geofenceAtLocation(location) : null;
    const lastSeenMin = vehicle.lastSeen != null ? vehicle.lastSeen : 999;
    return {
      libre: false,
      vehicle,
      unidad: vehicle.name,
      location,
      geofence,
      enMovimiento: estaEnMovimiento(location?.speed),
      velocidad: location ? velocidadKmh(location.speed) : 0,
      online: !!vehicle.isOnline,
      lastSeenMin,
    };
  };

  const aplicarSeguimientoDesdeUnidad = (vehicleId) => {
    const vehicle = vehiculos.find(v => String(v.id) === String(vehicleId));
    const unidad = vehicle?.name || '';
    if (!unidad) return;

    const fechaValor = (value) => value || '';
    const ordenarPorActualizacion = (a, b) => new Date(b.fecha_actualizacion || b.created_at || 0) - new Date(a.fecha_actualizacion || a.created_at || 0);
    const estadosActivos = ['en_ruta_cargado', 'en_ruta_vacio', 'proceso_carga', 'proceso_descarga', 'proceso_liberacion', 'espera_ingreso', 'en_resguardo', 'programado'];

    const seguimientoExistente = seguimiento
      .filter(row => String(row.unidad || '').toLowerCase() === unidad.toLowerCase())
      .sort(ordenarPorActualizacion)[0];
    const viajesUnidad = viajes
      .filter(v => String(v.vehicle_id || '') === String(vehicleId) || String(v.vehicle_name || '').toLowerCase() === unidad.toLowerCase())
      .sort((a, b) => {
        const ae = estadosActivos.includes(String(a.estado || '').toLowerCase()) ? 0 : 1;
        const be = estadosActivos.includes(String(b.estado || '').toLowerCase()) ? 0 : 1;
        if (ae !== be) return ae - be;
        return new Date(b.fecha_inicio || b.created_at || 0) - new Date(a.fecha_inicio || a.created_at || 0);
      });
    const viajeMasReciente = viajesUnidad[0] || null;
    const remolqueAsignado = obtenerRemolqueAsignadoUnidad(vehicleId, unidad);
    const operadorAsignado = operadores[String(vehicleId)]?.nombre || '';
    const viajeOperador = viajeMasReciente?.conductor || '';

    const base = seguimientoExistente || viajeMasReciente || null;
    setFormSeguimiento({
      unidad,
      operador: operadorAsignado || base?.operador || viajeOperador || '',
      remolque: remolqueAsignado || base?.remolque || viajeMasReciente?.remolque || '',
      ruta: viajeMasReciente?.ruta || base?.ruta || [viajeMasReciente?.origen || base?.origen, viajeMasReciente?.destino || base?.destino].filter(Boolean).join(' - '),
      origen: viajeMasReciente?.origen || base?.origen || '',
      destino: viajeMasReciente?.destino || base?.destino || '',
      cita_carga: fechaValor(viajeMasReciente?.fecha_inicio || base?.cita_carga || base?.fecha_inicio || ''),
      cita_descarga: fechaValor(viajeMasReciente?.fecha_fin || base?.cita_descarga || base?.fecha_fin || ''),
      hora_llegada: base?.hora_llegada || '',
      hora_liberacion: base?.hora_liberacion || '',
      estatus: normalizarEstatusSeguimiento(viajeMasReciente?.estado || base?.estatus || 'Programado'),
      comentarios_cliente: base?.comentarios_cliente || '',
      comentarios_monitoreo: base?.comentarios_monitoreo || base?.notas || '',
      grupo: base?.grupo || clienteDeGeofence(viajeMasReciente?.destino || base?.destino || '')?.nombre || '',
    });
  };

  const ordenarViajesUnidad = (rows = []) => {
    const estadoKey = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[\s_-]+/g, '');
    const rank = {
      enrutacargado: 0,
      enrutavacio: 1,
      procesocarga: 2,
      procesodescarga: 3,
      procesoliberacion: 4,
      esperaingreso: 5,
      enresguardo: 6,
      programado: 7,
      disponible: 8,
      completado: 9,
      cancelado: 10,
    };
    return [...rows].sort((a, b) => {
      const ra = rank[estadoKey(a.estado)] ?? 99;
      const rb = rank[estadoKey(b.estado)] ?? 99;
      if (ra !== rb) return ra - rb;
      const da = new Date((a.fecha_inicio || a.fecha_fin || a.created_at || 0)).getTime();
      const db = new Date((b.fecha_inicio || b.fecha_fin || b.created_at || 0)).getTime();
      return da - db;
    });
  };

  const normalizarTexto = (value) => String(value || '').trim().toLowerCase();

  const unidadKey = (v) => (v?.isLocal ? `local:${v.localId}` : `samsara:${v.id}`);

  const obtenerSeguimientoUnidad = (unidad) => {
    return seguimiento
      .filter(row => normalizarTexto(row.unidad) === normalizarTexto(unidad))
      .sort((a, b) => new Date(b.fecha_actualizacion || b.created_at || 0) - new Date(a.fecha_actualizacion || a.created_at || 0))[0] || null;
  };

  const obtenerViajesUnidad = (unidad, vehicleId = '') => {
    return ordenarViajesUnidad(
      viajes.filter(v => normalizarTexto(v.vehicle_name) === normalizarTexto(unidad) || String(v.vehicle_id) === String(vehicleId))
    );
  };

  const fechaInicioViaje = (v = {}) => new Date(v.fecha_inicio || v.fecha_fin || v.created_at || 0).getTime();

  const soloPrimerViajeActivoPorUnidad = (rows = []) => {
    const porUnidad = new Map();
    for (const v of rows) {
      if (['completado', 'cancelado'].includes(String(v.estado || '').toLowerCase())) continue;
      const key = String(v.vehicle_id || '') || normalizarTexto(v.vehicle_name);
      if (!key) continue;
      const actual = porUnidad.get(key);
      if (!actual || fechaInicioViaje(v) < fechaInicioViaje(actual)) porUnidad.set(key, v);
    }
    const visibles = new Set([...porUnidad.values()].map(v => v.id));
    return rows.filter(v => visibles.has(v.id) || ['completado', 'cancelado'].includes(String(v.estado || '').toLowerCase()));
  };

  const viajesProximosOcultos = (rows = []) => {
    const visibles = new Set(soloPrimerViajeActivoPorUnidad(rows).map(v => v.id));
    return rows.filter(v => !['completado', 'cancelado'].includes(String(v.estado || '').toLowerCase()) && !visibles.has(v.id));
  };

  const abrirActualizarSeguimiento = () => {
    setSeguimientoModalError('');
    setSeguimientoModalGrupo('');
    setSeguimientoModalNota('');
    setSeguimientoModalUnidadId('');
    setShowSeguimientoUpdateModal(true);
  };

  const seleccionarUnidadSeguimiento = (unidadId) => {
    setSeguimientoModalUnidadId(unidadId);
    setSeguimientoModalError('');
    const unidad = todasLasUnidades.find(v => String(v.id) === String(unidadId));
    const fila = obtenerSeguimientoUnidad(unidad?.name || unidad?.nombre || '');
    setSeguimientoModalGrupo(fila?.grupo || '');
    setSeguimientoModalNota(fila?.comentarios_monitoreo || fila?.comentarios_cliente || '');
  };

  const construirActualizacionSeguimiento = (unidad, fila, grupo, comentario) => {
    const nombreUnidad = unidad.name || unidad.nombre || '';
    const viajesVigentes = obtenerViajesUnidad(nombreUnidad, unidad.id)
      .filter(viaje => !['completado', 'cancelado'].includes(String(viaje.estado || '').toLowerCase()));
    const viajeActual = viajesVigentes[0] || null;
    const destinos = viajeActual ? destinosViaje(viajeActual) : [];
    const origen = viajeActual?.origen || fila?.origen || '';
    const destino = viajeActual?.destino || destinos.at(-1) || fila?.destino || '';
    const rutaViaje = [origen, ...(destinos.length > 0 ? destinos : [destino])].filter(Boolean).join(' - ');
    return {
      unidad: nombreUnidad,
      operador: operadores[String(unidad.id)]?.nombre || viajeActual?.conductor || fila?.operador || '',
      remolque: viajeActual?.remolque || viajeActual?.seg_remolque || obtenerRemolqueAsignadoUnidad(unidad.id, nombreUnidad) || fila?.remolque || '',
      ruta: viajeActual?.ruta || rutaViaje || fila?.ruta || '',
      origen,
      destino,
      cita_carga: viajeActual?.fecha_inicio || fila?.cita_carga || '',
      cita_descarga: viajeActual?.fecha_fin || fila?.cita_descarga || '',
      hora_llegada: fila?.hora_llegada || '',
      hora_liberacion: fila?.hora_liberacion || '',
      estatus: normalizarEstatusSeguimiento(viajeActual?.estado || fila?.estatus || unidad.estatus || 'Disponible'),
      comentarios_cliente: fila?.comentarios_cliente || '',
      comentarios_monitoreo: comentario,
      grupo,
    };
  };

  const guardarActualizacionSeguimiento = async () => {
    const unidad = todasLasUnidades.find(v => String(v.id) === String(seguimientoModalUnidadId));
    if (!unidad) {
      setSeguimientoModalError('Selecciona una unidad');
      return;
    }

    const nombreUnidad = unidad.name || unidad.nombre || '';
    const fila = obtenerSeguimientoUnidad(nombreUnidad);
    const grupo = seguimientoModalGrupo.trim();
    if (!grupo) {
      setSeguimientoModalError('Escribe el grupo al que se reportará');
      return;
    }
    const notaNueva = seguimientoModalNota.trim();
    if (!notaNueva) {
      setSeguimientoModalError('Escribe una observación');
      return;
    }

    setSeguimientoModalSaving(true);
    setSeguimientoModalError('');
    try {
      const payload = construirActualizacionSeguimiento(unidad, fila, grupo, notaNueva);
      if (fila) {
        await apiJson(`${apiUrl}/seguimiento/${fila.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await apiJson(`${apiUrl}/seguimiento`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setSeguimientoModalNota('');
      await refreshSeguimiento();
    } catch (err) {
      setSeguimientoModalError('No se pudo guardar la actualización');
    }
    setSeguimientoModalSaving(false);
  };

  const limpiarSeguimientoForm = () => {
    setFormSeguimiento({
      unidad: '', operador: '', remolque: '', ruta: '', origen: '', destino: '',
      cita_carga: '', cita_descarga: '', hora_llegada: '', hora_liberacion: '',
      estatus: 'Disponible', comentarios_cliente: '', comentarios_monitoreo: '', grupo: ''
    });
    setSeguimientoEditando(null);
    setShowSeguimientoForm(false);
  };

  const abrirNuevoSeguimiento = () => {
    setSeguimientoEditando(null);
    setSeguimientoFormAvanzado(false);
    setFormSeguimiento({
      unidad: '', operador: '', remolque: '', ruta: '', origen: '', destino: '',
      cita_carga: '', cita_descarga: '', hora_llegada: '', hora_liberacion: '',
      estatus: 'Disponible', comentarios_cliente: '', comentarios_monitoreo: '', grupo: ''
    });
    setShowSeguimientoForm(true);
  };

  const guardarSeguimiento = async (e) => {
    e.preventDefault();
    if (!formSeguimiento.unidad.trim()) return;
    if ((formSeguimiento.origen && !findGeofence(formSeguimiento.origen)) || (formSeguimiento.destino && !findGeofence(formSeguimiento.destino))) {
      alert('Selecciona el origen y el destino de la lista de geocercas.');
      return;
    }
    const payload = {
      unidad: formSeguimiento.unidad.trim(),
      operador: formSeguimiento.operador.trim(),
      remolque: formSeguimiento.remolque.trim(),
      ruta: formSeguimiento.ruta.trim(),
      origen: formSeguimiento.origen.trim(),
      destino: formSeguimiento.destino.trim(),
      cita_carga: formSeguimiento.cita_carga,
      cita_descarga: formSeguimiento.cita_descarga,
      hora_llegada: formSeguimiento.hora_llegada,
      hora_liberacion: formSeguimiento.hora_liberacion,
      estatus: normalizarEstatusSeguimiento(formSeguimiento.estatus),
      comentarios_cliente: formSeguimiento.comentarios_cliente.trim(),
      comentarios_monitoreo: formSeguimiento.comentarios_monitoreo.trim(),
      grupo: formSeguimiento.grupo.trim(),
    };
    const url = seguimientoEditando?.id ? `${apiUrl}/seguimiento/${seguimientoEditando.id}` : `${apiUrl}/seguimiento`;
    const method = seguimientoEditando?.id ? 'PUT' : 'POST';
    try {
      await apiJson(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      limpiarSeguimientoForm();
      setSeguimientoHistorial([]);
      setSelectedSeguimiento(null);
      await refreshSeguimiento();
    } catch (err) {
      alert(err.message || 'No se pudo guardar el seguimiento');
    }
  };

  const actualizarGrupoSeguimiento = async (row, grupo) => {
    const grupoAnterior = row.grupo || '';
    setSeguimiento(prev => prev.map(item => item.id === row.id ? { ...item, grupo } : item));
    try {
      await apiJson(`${apiUrl}/seguimiento/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grupo }),
      });
      await refreshSeguimiento();
    } catch (err) {
      setSeguimiento(prev => prev.map(item => item.id === row.id ? { ...item, grupo: grupoAnterior } : item));
      alert(err.message || 'No se pudo actualizar el grupo');
    }
  };

  const editarSeguimiento = (row) => {
    setSeguimientoEditando(row);
    setShowSeguimientoForm(true);
    setFormSeguimiento({
      unidad: row.unidad || '',
      operador: row.operador || '',
      remolque: row.remolque || '',
      ruta: row.ruta || '',
      origen: row.origen || '',
      destino: row.destino || '',
      cita_carga: row.cita_carga || '',
      cita_descarga: row.cita_descarga || '',
      hora_llegada: row.hora_llegada || '',
      hora_liberacion: row.hora_liberacion || '',
      estatus: normalizarEstatusSeguimiento(row.estatus),
      comentarios_cliente: row.comentarios_cliente || '',
      comentarios_monitoreo: row.comentarios_monitoreo || '',
      grupo: row.grupo || '',
    });
  };

  const cargarHistorialSeguimiento = async (row) => {
    setSelectedSeguimiento(row);
    setSeguimientoHistorialLoading(true);
    setSeguimientoHistorialError('');
    try {
      const res = await fetch(`${apiUrl}/seguimiento/${row.id}/historial`);
      const data = await res.json();
      setSeguimientoHistorial(Array.isArray(data) ? data : []);
    } catch (err) {
      setSeguimientoHistorialError('No se pudo cargar el historial');
      setSeguimientoHistorial([]);
    }
    setSeguimientoHistorialLoading(false);
  };

  const eliminarSeguimiento = async (id) => {
    if (!confirm('Eliminar este registro de seguimiento?')) return;
    try {
      await apiJson(`${apiUrl}/seguimiento/${id}`, { method: 'DELETE' });
      if (selectedSeguimiento?.id === id) {
        setSelectedSeguimiento(null);
        setSeguimientoHistorial([]);
      }
      await refreshSeguimiento();
    } catch (err) {
      alert(err.message || 'No se pudo eliminar el seguimiento');
    }
  };

  const guardarUnidad = async (e) => {
    e.preventDefault();
    if (!formUnidad.nombre.trim()) return;
    try {
      if (editUnidad) {
        await apiJson(`${apiUrl}/unidades/${editUnidad.localId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formUnidad),
        });
      } else {
        await apiJson(`${apiUrl}/unidades`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formUnidad),
        });
      }
      setShowUnidadModal(false);
      setEditUnidad(null);
      setFormUnidad({ nombre: '', estatus: 'Activa', notas: '', tipo: 'manual', samsara_id: '' });
      await refreshUnidadesLocales();
    } catch (err) {
      alert(err.message || 'No se pudo guardar la unidad');
    }
  };

  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const pointInsideGeofence = (latitude, longitude, geofence) => {
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || geofence?.activa === 0) return false;
    const vertices = geofence?.polygon?.vertices;
    if (Array.isArray(vertices) && vertices.length > 2) {
      let inside = false;
      for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const yi = Number(vertices[i].latitude);
        const xi = Number(vertices[i].longitude);
        const yj = Number(vertices[j].latitude);
        const xj = Number(vertices[j].longitude);
        if (![yi, xi, yj, xj].every(Number.isFinite)) continue;
        if (((yi > lat) !== (yj > lat)) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    }
    const centerLat = Number(geofence?.latitud);
    const centerLon = Number(geofence?.longitud);
    const radius = Number(geofence?.radio_metros);
    return Number.isFinite(centerLat) && Number.isFinite(centerLon) && Number.isFinite(radius)
      && haversineKm(lat, lon, centerLat, centerLon) * 1000 <= radius;
  };

  const geofenceAtLocation = (location) => {
    if (!location) return null;
    return allGeofences
      .filter(geofence => pointInsideGeofence(location.latitude, location.longitude, geofence))
      .sort((a, b) => (Number(a.radio_metros) || Number.MAX_SAFE_INTEGER) - (Number(b.radio_metros) || Number.MAX_SAFE_INTEGER))[0] || null;
  };

  const selectMonitoreoVehicle = async (v) => {
    monitoreoRequestRef.current.controller?.abort();
    const controller = new AbortController();
    const generation = monitoreoRequestRef.current.generation + 1;
    monitoreoRequestRef.current = { generation, controller };
    setMonitoreoSelectedId(v.id);
    setMonitoreoEta(null);
    setMonitoreoRutaTotal(null);
    setMonitoreoEtaLoading(false);
    setMonitoreoGeofenceMatch(null);
    setMonitoreoRouteHistory([]);
    setMonitoreoStops([]);
    if (v.isLocal) return;
    const fullVehicle = vehiculos.find(vh => String(vh.id) === String(v.id)) || v;
    const viaje = viajesActivos.find(vj => String(vj.vehicle_id) === String(v.id) || vj.vehicle_name === v.name || vj.vehicle_name === fullVehicle?.name);
    monitoreoEtaDestinoRef.current = destinoViajeActual(viaje);
    const historyPromise = (async () => {
      try {
        const params = new URLSearchParams({ vehicle_id: String(v.id), hours: '24', stops_minutes: '20', include_route: '1' });
        if (viaje?.fecha_inicio) {
          const tripStart = new Date(String(viaje.fecha_inicio).replace(' ', 'T')).getTime();
          if (Number.isFinite(tripStart)) params.set('since_ms', String(tripStart));
        }
        const res = await fetch(`${apiUrl}/route-history/last?${params}`, { signal: controller.signal });
        const history = await res.json().catch(() => null);
        if (!res.ok) throw new Error('No se pudo cargar el recorrido');
        if (monitoreoRequestRef.current.generation === generation) {
          setMonitoreoRouteHistory(Array.isArray(history?.route) ? history.route : []);
          setMonitoreoStops(Array.isArray(history?.stops) ? history.stops : []);
        }
      } catch (e) {
        if (e.name !== 'AbortError' && monitoreoRequestRef.current.generation === generation) {
          setMonitoreoRouteHistory([]);
          setMonitoreoStops([]);
        }
      }
    })();
    const etaPromise = calcularMonitoreoEta(viaje, fullVehicle, generation, controller.signal);
    await Promise.allSettled([historyPromise, etaPromise]);
  };

  const calcularMonitoreoEta = async (viaje, fullVehicle, generation, signal) => {
    const destino = destinoViajeActual(viaje);
    if (!destino || !fullVehicle?.location) return;
    setMonitoreoEtaLoading(true);
    const origin = viaje?.origen || viaje?.seg_origen || '';
    const [etaResult, totalResult] = await Promise.allSettled([
      calcularRuta(destino, fullVehicle.location.latitude, fullVehicle.location.longitude, signal),
      origin ? calcularRuta(destino, null, null, signal, origin) : Promise.resolve(null),
    ]);
    if (monitoreoRequestRef.current.generation !== generation) return;
    const eta = etaResult.status === 'fulfilled' ? etaResult.value : null;
    setMonitoreoEta(eta);
    setMonitoreoRutaTotal(totalResult.status === 'fulfilled' ? totalResult.value : null);
    setMonitoreoEtaLoading(false);
    if (eta?.destLat && eta?.destLon) {
      const match = geofenceAtLocation({ latitude: eta.destLat, longitude: eta.destLon });
      setMonitoreoGeofenceMatch(match || null);
    }
  };

  useEffect(() => {
    if (!monitoreoSelectedId) return;
    const fullVehicle = vehiculos.find(vh => String(vh.id) === String(monitoreoSelectedId));
    if (!fullVehicle || fullVehicle.isLocal) return;
    const viaje = viajesActivos.find(vj => String(vj.vehicle_id) === String(monitoreoSelectedId) || vj.vehicle_name === fullVehicle?.name);
    const destino = destinoViajeActual(viaje);
    if (!viaje || !destino || destino === monitoreoEtaDestinoRef.current) return;
    monitoreoEtaDestinoRef.current = destino;
    calcularMonitoreoEta(viaje, fullVehicle, monitoreoRequestRef.current.generation, null);
  }, [viajesActivos, monitoreoSelectedId, vehiculos]);

  const guardarComentarioRapido = async () => {
    if (!comentarioRapido.contenido.trim() || !selectedVehicle) return;
    const unidad = selectedVehicle.name || '';
    const filaSeguimiento = obtenerSeguimientoUnidad(unidad);
    const viajeActivo = viajesActivos.find(vj => String(vj.vehicle_id) === String(selectedVehicle.id) || vj.vehicle_name === selectedVehicle.name) || null;
    const payloadSeguimiento = {
      unidad,
      operador: operadores[String(selectedVehicle.id)]?.nombre || filaSeguimiento?.operador || viajeActivo?.conductor || '',
      remolque: filaSeguimiento?.remolque || viajeActivo?.remolque || '',
      ruta: filaSeguimiento?.ruta || [viajeActivo?.origen, viajeActivo?.destino].filter(Boolean).join(' - ') || '',
      origen: filaSeguimiento?.origen || viajeActivo?.origen || '',
      destino: filaSeguimiento?.destino || viajeActivo?.destino || '',
      cita_carga: filaSeguimiento?.cita_carga || viajeActivo?.fecha_inicio || '',
      cita_descarga: filaSeguimiento?.cita_descarga || viajeActivo?.fecha_fin || '',
      hora_llegada: filaSeguimiento?.hora_llegada || '',
      hora_liberacion: filaSeguimiento?.hora_liberacion || '',
      estatus: normalizarEstatusSeguimiento(filaSeguimiento?.estatus || viajeActivo?.estado || 'Disponible'),
      comentarios_cliente: filaSeguimiento?.comentarios_cliente || '',
      comentarios_monitoreo: comentarioRapido.contenido.trim(),
      grupo: filaSeguimiento?.grupo || '',
    };

    try {
      if (filaSeguimiento?.id) {
        await apiJson(`${apiUrl}/seguimiento/${filaSeguimiento.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadSeguimiento),
        });
      } else {
        await apiJson(`${apiUrl}/seguimiento`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadSeguimiento),
        });
      }

      await apiJson(`${apiUrl}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: String(selectedVehicle.id),
          vehicle_name: selectedVehicle.name,
          tipo: comentarioRapido.tipo,
          titulo: comentarioRapido.titulo || `Seguimiento ${selectedVehicle.name}`,
          contenido: comentarioRapido.contenido
        }),
      });
      setComentarioRapido({ tipo: 'seguimiento', titulo: '', contenido: '' });
      setDestinoInput('');
      setEtaData(null);
      await refreshSeguimiento();
    } catch (err) {
      alert(err.message || 'No se pudo guardar el comentario');
    }
  };

  const guardarOperador = async (vehicleId, vehicleName, nombre, telefono) => {
    try {
      const driver = samsaraDrivers.find(d => d.name === nombre);
      const res = await apiJson(`${apiUrl}/vehicle-operators/${vehicleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_name: vehicleName, operator_name: nombre, telefono, driver_id_samsara: driver ? driver.id : '' }),
      });
      setOperadores(prev => ({ ...prev, [idStr(vehicleId)]: { nombre, telefono } }));
      fetch(`${apiUrl}/vehicle-operators`)
        .then(r => r.json())
        .then((ops) => {
          const map = {};
          for (const op of (ops || [])) map[idStr(op.vehicle_id)] = { nombre: op.operator_name, telefono: op.telefono || '' };
          setOperadores(map);
        })
        .catch(() => {});
      if (res?.samsara_sync) {
        mostrarNotificacionSync(res.samsara_sync.ok, res.samsara_sync.message || '');
      }
    } catch (err) {
      alert(err.message || 'No se pudo asignar el operador');
    }
  };

  const seleccionarOperador = async (vehicleId, vehicleName, nombre, telefono) => {
    setOperadorDraft(nombre);
    setTelefonoDraft(telefono);
    if (!nombre.trim()) return;
    await guardarOperador(vehicleId, vehicleName, nombre, telefono);
  };

  const mostrarNotificacionSync = (ok, mensaje) => {
    const id = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const alerta = { id, tipo: ok ? 'operador_samsara_ok' : 'operador_samsara_err', mensaje, severidad: ok ? 'baja' : 'media', sync: true };
    setFloatingAlerts(current => [alerta, ...current.filter(item => item.id !== alerta.id)].slice(0, 3));
    const timer = setTimeout(() => {
      setFloatingAlerts(current => current.filter(item => item.id !== alerta.id));
      floatingAlertTimersRef.current.delete(timer);
    }, 8000);
    floatingAlertTimersRef.current.add(timer);
  };

  const guardarRemolqueSeleccionado = async () => {
    if (!selectedVehicle) return;
    const actual = remolques.find(r => String(r.vehicle_id_asignado || '') === String(selectedVehicle.id) || String(r.unidad_asignada || '').toLowerCase() === String(selectedVehicle.name || '').toLowerCase());
    if (remolqueModo === 'full') {
      if (!remolquesFullDraft[0] && !remolquesFullDraft[1]) {
        if (actual) await desasignarRemolque(actual.id);
        return;
      }
      if (!remolquesFullDraft[0] || !remolquesFullDraft[1]) {
        alert('Selecciona los dos tanques del Full');
        return;
      }
      if (remolquesFullDraft[0] === remolquesFullDraft[1]) {
        alert('Selecciona dos tanques distintos');
        return;
      }
      await asignarFull(remolquesFullDraft, String(selectedVehicle.id), selectedVehicle.name);
      return;
    }
    if (!remolqueDraft) {
      if (actual) await desasignarRemolque(actual.id);
      return;
    }
    const remolque = remolques.find(r => String(r.id) === String(remolqueDraft) || String(r.numero) === String(remolqueDraft).trim());
    if (!remolque) {
      alert('Selecciona un remolque existente');
      return;
    }
    await asignarRemolque(remolque.id, String(selectedVehicle.id), selectedVehicle.name);
  };

  const prepararGeofencePayload = async (form, extra = {}) => {
      const tieneLatitud = String(form.latitud).trim() !== '';
      const tieneLongitud = String(form.longitud).trim() !== '';
      let latitud = tieneLatitud ? Number(form.latitud) : NaN;
      let longitud = tieneLongitud ? Number(form.longitud) : NaN;
      let direccion = form.direccion || '';
      if ((!Number.isFinite(latitud) || !Number.isFinite(longitud)) && direccion.trim()) {
        const geo = await apiJson(`${apiUrl}/geocode-address`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: direccion }),
        });
        latitud = Number(geo.latitud);
        longitud = Number(geo.longitud);
        direccion = geo.direccion || direccion;
      }
      if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) throw new Error('Ingresa coordenadas válidas o una dirección para geocodificar');
      if (latitud < -90 || latitud > 90) throw new Error('La latitud debe estar entre -90 y 90');
      if (longitud < -180 || longitud > 180) throw new Error('La longitud debe estar entre -180 y 180');
      return {
        nombre: form.nombre,
        direccion,
        latitud,
        longitud,
        radio_metros: Number(form.radio_metros) || 500,
        descripcion: form.descripcion,
        color: form.color,
        ...extra,
      };
  };

  const crearGeofence = async (e) => {
    e.preventDefault();
    try {
      const payload = await prepararGeofencePayload(formGeofence);
      await apiJson(`${apiUrl}/geofences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setFormGeofence(GEOFENCE_DEFAULT);
      await refreshGeofences();
    } catch (err) {
      alert(err.message || 'No se pudo crear la geocerca');
    }
  };

  const abrirClienteGeofenceModal = () => {
    if (!selectedCliente) return;
    setFormClienteGeofence(GEOFENCE_DEFAULT);
    setShowClienteGeofenceModal(true);
  };

  const cerrarClienteGeofenceModal = () => {
    if (clienteGeofenceSaving) return;
    setShowClienteGeofenceModal(false);
    setFormClienteGeofence(GEOFENCE_DEFAULT);
  };

  const crearClienteGeofence = async (event) => {
    event.preventDefault();
    if (!selectedCliente) return;
    try {
      setClienteGeofenceSaving(true);
      const payload = await prepararGeofencePayload(formClienteGeofence, { cliente_id: selectedCliente.id });
      await apiJson(`${apiUrl}/geofences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setShowClienteGeofenceModal(false);
      setFormClienteGeofence(GEOFENCE_DEFAULT);
      await refreshGeofences();
    } catch (err) {
      alert(err.message || 'No se pudo crear la geocerca del cliente');
    } finally {
      setClienteGeofenceSaving(false);
    }
  };

  const abrirExistingGeofenceModal = () => {
    if (!selectedCliente) return;
    setExistingGeofenceSelections([]);
    setExistingGeofenceSearch('');
    setShowExistingGeofenceModal(true);
  };

  const cerrarExistingGeofenceModal = () => {
    if (existingGeofenceSaving) return;
    setShowExistingGeofenceModal(false);
    setExistingGeofenceSelections([]);
    setExistingGeofenceSearch('');
  };

  const vincularExistingGeofence = async (event) => {
    event.preventDefault();
    if (!selectedCliente || existingGeofenceSelections.length === 0) return;
    try {
      setExistingGeofenceSaving(true);
      for (const value of existingGeofenceSelections) {
        const separator = value.indexOf('|');
        const source = value.slice(0, separator);
        const geofenceId = value.slice(separator + 1);
        await apiJson(`${apiUrl}/clientes/${selectedCliente.id}/geofences/link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source, geofence_id: geofenceId }),
        });
      }
      setShowExistingGeofenceModal(false);
      setExistingGeofenceSelections([]);
      setExistingGeofenceSearch('');
      await Promise.all([refreshGeofences(), refreshGeofenceLinks()]);
    } catch (err) {
      alert(err.message || 'No se pudo asociar la geocerca');
    } finally {
      setExistingGeofenceSaving(false);
    }
  };

  const desvincularClienteGeofence = async geofence => {
    if (!selectedCliente || !confirm(`¿Desvincular "${geofence.nombre}" de ${selectedCliente.nombre}?`)) return;
    const source = geofence.source === 'samsara' ? 'samsara' : 'local';
    try {
      await apiJson(`${apiUrl}/clientes/${selectedCliente.id}/geofences/${source}/${encodeURIComponent(geofence.id)}`, { method: 'DELETE' });
      await Promise.all([refreshGeofences(), refreshGeofenceLinks()]);
    } catch (err) {
      alert(err.message || 'No se pudo desvincular la geocerca');
    }
  };

  const eliminarGeofence = async (id) => {
    if (confirm('Eliminar esta geocerca?')) {
    try {
      await apiJson(`${apiUrl}/geofences/${id}`, { method: 'DELETE' });
        await refreshGeofences();
      } catch (err) {
        alert(err.message || 'No se pudo eliminar la geocerca');
      }
    }
  };

  const toggleGeofence = async (id, activa) => {
    try {
      await apiJson(`${apiUrl}/geofences/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activa: activa ? 0 : 1 }),
      });
      await refreshGeofences();
    } catch (err) {
      alert(err.message || 'No se pudo actualizar la geocerca');
    }
  };

  const renombrarGeofence = async (id, nombre) => {
    const nuevoNombre = String(nombre || '').trim();
    if (!nuevoNombre) return;
    try {
      await apiJson(`${apiUrl}/geofences/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevoNombre }),
      });
      await refreshGeofences();
    } catch (err) {
      alert(err.message || 'No se pudo renombrar la geocerca');
    }
  };

  const toggleGeofencesBulk = async (ids, activa) => {
    if (!ids.length) return;
    try {
      await apiJson(`${apiUrl}/geofences/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, activa }),
      });
      await refreshGeofences();
    } catch (err) {
      alert(err.message || 'No se pudieron actualizar las geocercas');
    }
  };

  const toggleGeofencesByCategory = async (categoria, activa) => {
    const ids = geofences.filter(g => g.categoria === categoria).map(g => g.id);
    if (ids.length > 0) await toggleGeofencesBulk(ids, activa);
  };

  const ejecutarCheckGeofences = async () => {
    try {
      await apiJson(`${apiUrl}/check-geofences`, { method: 'POST' });
      await refreshGeofences();
    } catch (err) {
      alert(err.message || 'No se pudo ejecutar la revisión de geocercas');
    }
  };

  const verHistorialGeocerca = async (geofence) => {
    setSelectedGeofenceHistory(geofence);
    setShowGeofenceHistoryPanel(true);
    setGeofenceHistoryLoading(true);
    setGeofenceHistoryError('');
    try {
      const res = await fetch(`${apiUrl}/geofence-events?geofence_id=${geofence.id}&limit=50`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar el historial');
      setGeofenceEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setGeofenceEvents([]);
      setGeofenceHistoryError(err.message || 'No se pudo cargar el historial');
    } finally {
      setGeofenceHistoryLoading(false);
    }
  };

  const verHistorialGeneralGeocercas = async () => {
    setSelectedGeofenceHistory(null);
    setShowGeofenceHistoryPanel(true);
    setGeofenceHistoryLoading(true);
    setGeofenceHistoryError('');
    try {
      const res = await fetch(`${apiUrl}/geofence-events?limit=100`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar el historial');
      setGeofenceEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setGeofenceEvents([]);
      setGeofenceHistoryError(err.message || 'No se pudo cargar el historial');
    } finally {
      setGeofenceHistoryLoading(false);
    }
  };

  const ejecutarCheckFuel = async () => {
    try {
      await apiJson(`${apiUrl}/check-fuel`, { method: 'POST' });
      await refreshAlertas();
    } catch (err) {
      alert(err.message || 'No se pudo revisar combustible');
    }
  };

  const calcularRuta = async (destino, latOrigen, lonOrigen, signal, origen = '') => {
    const hasCoordinates = latOrigen !== null && latOrigen !== undefined && latOrigen !== '' && lonOrigen !== null && lonOrigen !== undefined && lonOrigen !== '' && Number.isFinite(Number(latOrigen)) && Number.isFinite(Number(lonOrigen));
    if (!destino.trim() || (!hasCoordinates && !origen.trim())) return null;
    try {
      const destinationGeofence = findGeofence(destino);
      const originGeofence = findGeofence(origen);
      const payload = hasCoordinates
        ? { destino: destino.trim(), lat_origen: Number(latOrigen), lon_origen: Number(lonOrigen) }
        : { destino: destino.trim(), origen: origen.trim() };
      if (destinationGeofence) {
        payload.lat_destino = Number(destinationGeofence.latitud);
        payload.lon_destino = Number(destinationGeofence.longitud);
      }
      if (!hasCoordinates && originGeofence) {
        payload.lat_origen = Number(originGeofence.latitud);
        payload.lon_origen = Number(originGeofence.longitud);
      }
      const data = await apiJson(`${apiUrl}/calculate-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
      });
      const route = data.route || data.routes?.[0] || data;
      const destination = data.destination || data.destino || {};
      const routeDuration = Number(route.duration ?? route.durationSeconds ?? route.duracion_segundos);
      const routeDistance = Number(route.distance ?? route.distanceMeters ?? route.distancia_metros);
      const destLat = Number(data.destLat ?? destination.lat ?? destination.latitude ?? destination.latitud);
      const destLon = Number(data.destLon ?? destination.lon ?? destination.lng ?? destination.longitude ?? destination.longitud);
      if (!Number.isFinite(routeDuration) || !Number.isFinite(routeDistance)) throw new Error('El servidor no devolvió una ruta válida');

      const factorTracto = 1.35;
      const duracionTruck = routeDuration * factorTracto;
      const horas = Math.floor(duracionTruck / 3600);
      const minutos = Math.round((duracionTruck % 3600) / 60);
      const distanciaKm = (routeDistance / 1000).toFixed(1);
      const llegada = new Date(Date.now() + duracionTruck * 1000);
      const displayName = data.destinoNombre || data.display_name || destination.display_name || destination.nombre || destino;
      return {
        duracion: `${horas > 0 ? horas + 'h ' : ''}${minutos}min`,
        distancia: `${distanciaKm} km`,
        distanciaMetros: routeDistance,
        duracionSegundos: duracionTruck,
        horaLlegada: llegada.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        fechaLlegada: llegada.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
        horaLlegadaISO: llegada.toISOString().slice(0, 16),
        destinoNombre: String(displayName).split(',').slice(0, 3).join(','),
        destLat: Number.isFinite(destLat) ? destLat : null,
        destLon: Number.isFinite(destLon) ? destLon : null,
      };
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      console.error('Error calculando ruta:', e);
      throw new Error(e.message || 'No se pudo calcular la ruta desde el servidor');
    }
  };

  useEffect(() => {
    if (activeTab !== 'citas') return;
    citasEtaRequestRef.current.controller?.abort();
    const controller = new AbortController();
    const generation = citasEtaRequestRef.current.generation + 1;
    citasEtaRequestRef.current = { generation, controller };
    const finalized = new Set(['completado', 'cancelado']);
    const initial = {};
    const candidates = [];

    for (const item of citasOperativas) {
      if (finalized.has(item.estatus)) {
        initial[item.id] = { status: item.estatus, label: item.estatus === 'completado' ? 'Completada' : 'Cancelada' };
        continue;
      }
      const vehicle = findVehicleForUnit(item.unidad, item.vehicle_id);
      const geofenceDestino = findGeofence(item.destino);
      const geofenceName = geofenceDestino?.nombre || geocercasCoincidentes(item.destino)[0];
      if (vehicle?.location && geofencesCandidatas(item.destino).some(g => pointInsideGeofence(vehicle.location.latitude, vehicle.location.longitude, g))) {
        const llegadaReal = horaLlegadaRealCita(item);
        initial[item.id] = {
          status: 'arrived',
          label: 'En destino',
          eta: { duracion: 'Llegada', distancia: '0 km' },
          arrival: llegadaReal || new Date(),
          realArrival: !!llegadaReal,
        };
        continue;
      }
      if (!vehicle?.location) {
        initial[item.id] = { status: 'unavailable', label: 'Sin GPS' };
        continue;
      }
      if (!geofenceName) {
        initial[item.id] = { status: 'unavailable', label: 'Destino sin geocerca' };
        continue;
      }
      if (vehicle.lastSeen != null && vehicle.lastSeen >= CITAS_GPS_STALE_MIN) {
        initial[item.id] = { status: 'unavailable', label: `Sin GPS reciente (${vehicle.lastSeen} min)` };
        continue;
      }
      candidates.push({ item, vehicle, geofenceName });
    }

    setCitasEta(initial);
    setCitasEtaLoading(candidates.length > 0);
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < candidates.length && !controller.signal.aborted) {
        const current = candidates[nextIndex++];
        try {
          const eta = await calcularRuta(current.geofenceName, current.vehicle.location.latitude, current.vehicle.location.longitude, controller.signal);
          if (!eta || controller.signal.aborted) continue;
          const arrival = new Date(Date.now() + eta.duracionSegundos * 1000);
          const appointment = parseCitaDate(current.item.cita_descarga || current.item.cita_carga);
          const tripStart = parseCitaDate(current.item.cita_carga);
          const differenceMinutes = appointment ? Math.round((arrival.getTime() - appointment.getTime()) / 60000) : null;
          let status = 'on_time';
          let label = 'A tiempo';
          if (current.item.estatus === 'programado' && tripStart && Date.now() < tripStart.getTime()) {
            status = 'scheduled';
            label = 'Programada';
          } else if (differenceMinutes !== null && differenceMinutes > 10) {
            status = 'delayed';
            label = `Retraso ${(differenceMinutes / 60).toFixed(1)} h`;
          } else if (differenceMinutes !== null && differenceMinutes < -10) {
            status = 'early';
            label = `Adelanto ${(Math.abs(differenceMinutes) / 60).toFixed(1)} h`;
          }
          if (citasEtaRequestRef.current.generation === generation) {
            setCitasEta(prev => ({ ...prev, [current.item.id]: { status, label, eta, arrival, differenceMinutes } }));
          }
        } catch (error) {
          if (error.name !== 'AbortError' && citasEtaRequestRef.current.generation === generation) {
            setCitasEta(prev => ({ ...prev, [current.item.id]: { status: 'unavailable', label: 'ETA no disponible' } }));
          }
        }
      }
    };

    Promise.all(Array.from({ length: Math.min(3, candidates.length) }, () => worker())).finally(() => {
      if (citasEtaRequestRef.current.generation === generation) setCitasEtaLoading(false);
    });
    return () => controller.abort();
  }, [activeTab, citasEtaRefresh]);

  useEffect(() => {
    if (!citaSeleccionada) { setCitaLlegada(null); return; }
    const conocida = horaLlegadaRealCita(citaSeleccionada);
    if (conocida) { setCitaLlegada(conocida); return; }
    const vehicle = vehiculoDeCita(citaSeleccionada);
    const geofenceDestino = findGeofence(citaSeleccionada.destino);
    const geofenceName = geofenceDestino?.nombre || geocercasCoincidentes(citaSeleccionada.destino)[0];
    if (!vehicle?.id || !geofenceName) { setCitaLlegada(null); return; }
    let activo = true;
    const controller = new AbortController();
    fetch(`${apiUrl}/geofence-events?vehicle_id=${encodeURIComponent(vehicle.id)}&limit=200`, { signal: controller.signal })
      .then(r => r.json())
      .then(rows => {
        if (!activo) return;
        const eventos = Array.isArray(rows) ? rows : [];
        const entrada = eventos.find(ev => ev.tipo === 'entrada' && normalizeGeofenceName(ev.geofence_nombre) === normalizeGeofenceName(geofenceName));
        setCitaLlegada(entrada ? parseFecha(entrada.created_at) : null);
      })
      .catch(() => { if (activo) setCitaLlegada(null); });
    return () => { activo = false; controller.abort(); };
  }, [citaSeleccionada?.id, citaSeleccionada?.destino, citaSeleccionada?.unidad, apiUrl]);


  const calcularETA = async (destino, vehicle) => {
    if (!destino.trim() || !vehicle?.location) return;
    etaRequestRef.current.controller?.abort();
    const controller = new AbortController();
    const generation = etaRequestRef.current.generation + 1;
    etaRequestRef.current = { generation, controller };
    setCalculandoEta(true);
    setEtaError('');
    try {
      const eta = await calcularRuta(destino, vehicle.location.latitude, vehicle.location.longitude, controller.signal);
      if (etaRequestRef.current.generation !== generation) return;
      if (eta) {
        setEtaData(eta);
        setComentarioRapido(prev => ({ ...prev, titulo: `ETA ${eta.fechaLlegada || eta.horaLlegada} | ${eta.distancia}` }));
      } else {
        setEtaData(null);
        setEtaError('No se pudo calcular la ruta. Verifica el destino e intenta de nuevo.');
      }
    } catch (err) {
      if (err.name !== 'AbortError' && etaRequestRef.current.generation === generation) {
        setEtaData(null);
        setEtaError(err.message || 'No se pudo calcular la ruta. Verifica el destino e intenta de nuevo.');
      }
    } finally {
      if (etaRequestRef.current.generation === generation) setCalculandoEta(false);
    }
  };

  const calcularViajeETA = async (destino, vehicle) => {
    if (!destino.trim() || !vehicle?.location) { setViajeEta(null); setViajeEtaError(vehicle?.location ? '' : 'Vehiculo sin ubicacion GPS'); return; }
    viajeEtaRequestRef.current.controller?.abort();
    const controller = new AbortController();
    const generation = viajeEtaRequestRef.current.generation + 1;
    viajeEtaRequestRef.current = { generation, controller };
    setCalculandoViajeEta(true);
    setViajeEtaError('');
    try {
      const eta = await calcularRuta(destino, vehicle.location.latitude, vehicle.location.longitude, controller.signal);
      if (viajeEtaRequestRef.current.generation !== generation) return;
      setViajeEta(eta);
      if (!eta) setViajeEtaError('No se pudo calcular la ruta. Intenta con una ciudad o direccion mas especifica.');
    } catch (err) {
      if (err.name !== 'AbortError' && viajeEtaRequestRef.current.generation === generation) {
        setViajeEta(null);
        setViajeEtaError(err.message || 'No se pudo calcular la ruta. Intenta con una ciudad o direccion mas especifica.');
      }
    } finally {
      if (viajeEtaRequestRef.current.generation === generation) setCalculandoViajeEta(false);
    }
  };

  const cargarHistorialRuta = async () => {
    if (!routeVehicleId || !routeDate) return;
    routeHistoryRequestRef.current.controller?.abort();
    const controller = new AbortController();
    const generation = routeHistoryRequestRef.current.generation + 1;
    routeHistoryRequestRef.current = { generation, controller };
    setRouteLoading(true);
    try {
      const res = await fetch(`${apiUrl}/route-history?vehicle_id=${routeVehicleId}&fecha_inicio=${routeDate}&fecha_fin=${routeDate}&limit=5000`, { signal: controller.signal });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar el historial');
      if (routeHistoryRequestRef.current.generation === generation) setRouteHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      if (e.name !== 'AbortError' && routeHistoryRequestRef.current.generation === generation) {
        setRouteHistory([]);
        alert(e.message || 'No se pudo cargar el historial');
      }
    } finally {
      if (routeHistoryRequestRef.current.generation === generation) setRouteLoading(false);
    }
  };

  const cargarFechasRuta = async (vid) => {
    routeHistoryRequestRef.current.controller?.abort();
    routeHistoryRequestRef.current.generation += 1;
    routeDatesRequestRef.current.controller?.abort();
    const controller = new AbortController();
    const generation = routeDatesRequestRef.current.generation + 1;
    routeDatesRequestRef.current = { generation, controller };
    setRouteVehicleId(vid);
    setRouteHistory([]);
    setRouteDate('');
    setRouteLoading(false);
    if (!vid) { setRouteDates([]); return; }
    try {
      const res = await fetch(`${apiUrl}/route-history/dates?vehicle_id=${vid}`, { signal: controller.signal });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudieron cargar las fechas');
      if (routeDatesRequestRef.current.generation === generation) setRouteDates(Array.isArray(data) ? data : []);
    } catch (e) {
      if (e.name !== 'AbortError' && routeDatesRequestRef.current.generation === generation) setRouteDates([]);
    }
  };

  const cambiarFechaRuta = (fecha) => {
    routeHistoryRequestRef.current.controller?.abort();
    routeHistoryRequestRef.current.generation += 1;
    setRouteLoading(false);
    setRouteHistory([]);
    setRouteDate(fecha);
  };

  const solicitarReporte = async (filtros) => {
    reportRequestRef.current.controller?.abort();
    const controller = new AbortController();
    const generation = reportRequestRef.current.generation + 1;
    reportRequestRef.current = { generation, controller };
    const params = new URLSearchParams();
    if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
    if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);
    if (filtros.vehicle_id) {
      if (filtros.tipo === 'seguimiento') {
        const vehicle = vehiculos.find(item => String(item.id) === String(filtros.vehicle_id));
        if (vehicle?.name) params.append('unidad', vehicle.name);
      } else {
        params.append('vehicle_id', filtros.vehicle_id);
      }
    }
    const tipoNotas = filtros.tipo === 'incidencias' ? 'incidencia' : filtros.tipo;
    const endpoint = filtros.tipo === 'pendientes-completados'
      ? 'reportes/pendientes-completados'
      : filtros.tipo === 'bitacora' || filtros.tipo === 'incidencias'
        ? 'reportes/notas'
        : `reportes/${filtros.tipo}`;
    if (filtros.tipo === 'bitacora' || filtros.tipo === 'incidencias') params.set('tipo', tipoNotas);
    setReporteLoading(true);
    setReporteError('');
    try {
      const query = params.toString();
      const res = await fetch(`${apiUrl}/${endpoint}${query ? `?${query}` : ''}`, { signal: controller.signal });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || data?.message || 'No se pudo generar el reporte');
      if (!Array.isArray(data)) throw new Error('El reporte recibido no es válido');
      if (reportRequestRef.current.generation === generation) {
        const rows = filtros.tipo === 'seguimiento'
          ? [...data].sort((a, b) => String(a.unidad || '').localeCompare(String(b.unidad || ''), 'es', { numeric: true, sensitivity: 'base' }))
          : data;
        setReportes(rows);
      }
    } catch (err) {
      if (err.name !== 'AbortError' && reportRequestRef.current.generation === generation) {
        setReportes([]);
        setReporteError(err.message || 'No se pudo generar el reporte');
      }
    } finally {
      if (reportRequestRef.current.generation === generation) setReporteLoading(false);
    }
  };

  const cargarReporte = () => solicitarReporte(filtroReporte);

  const actualizarFiltroReporte = (cambio) => {
    reportRequestRef.current.controller?.abort();
    reportRequestRef.current.generation += 1;
    setReporteLoading(false);
    setReporteError('');
    setReportes([]);
    setFiltroReporte(prev => ({ ...prev, ...cambio }));
  };

  const abrirReporteDirecto = async (tipo) => {
    const filtros = { tipo, fecha_inicio: '', fecha_fin: '', vehicle_id: '' };
    setFiltroReporte(filtros);
    setReportes([]);
    setReporteError('');
    setActiveTab('reportes');
    await solicitarReporte(filtros);
  };

  const generarPDF = () => {
    if (!reportes.length) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    const tipoLabel = { pendientes: 'Pendientes', 'pendientes-completados': 'Pendientes completados', viajes: 'Viajes', seguimiento: 'Seguimiento operativo', bitacora: 'Bitácora', incidencias: 'Incidencias' };
    doc.setFontSize(18);
    doc.text(`Reporte: ${tipoLabel[filtroReporte.tipo] || filtroReporte.tipo}`, 14, 20);
    doc.setFontSize(10);
    const filtros = [];
    if (filtroReporte.fecha_inicio) filtros.push(`Desde: ${filtroReporte.fecha_inicio}`);
    if (filtroReporte.fecha_fin) filtros.push(`Hasta: ${filtroReporte.fecha_fin}`);
    if (filtroReporte.vehicle_id) {
      const v = vehiculos.find(vh => String(vh.id) === filtroReporte.vehicle_id);
      filtros.push(`Unidad: ${v?.name || filtroReporte.vehicle_id}`);
    }
    doc.text(filtros.join('  |  ') || 'Sin filtros de fecha', 14, 28);
    doc.text(`Registros: ${reportes.length}  |  Generado: ${new Date().toLocaleString('es-MX')}`, 14, 34);
    const headers = Object.keys(reportes[0]).filter(k => k !== 'id');
    const rows = reportes.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? String(row[h]) : '-'));
    doc.autoTable({
      startY: 40,
      head: [headers.map(h => h.replace(/_/g, ' ').toUpperCase())],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [0, 255, 65], textColor: [0, 0, 0], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 240, 240] },
    });
    descargarArchivoPdf(doc, `Reporte_${filtroReporte.tipo}_${filtroReporte.fecha_inicio || 'todo'}_${filtroReporte.fecha_fin || 'todo'}.pdf`);
  };

  const descargarArchivoPdf = (doc, fileName) => {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const descargarPdfTurno = (summary, report) => {
    if (!summary) return;
    const doc = new jsPDF({ orientation: 'portrait' });
    const fecha = new Date().toLocaleString('es-MX');
    doc.setFontSize(18);
    doc.text('Reporte de Entrega de Turno', 14, 18);
    doc.setFontSize(10);
    doc.text(`Generado: ${fecha}`, 14, 26);
    if (report?.turno || turnoForm.turno) doc.text(`Turno: ${report?.turno || turnoForm.turno}`, 14, 32);
    if (report?.horas || turnoForm.horas) doc.text(`Horas revisadas: ${report?.horas || turnoForm.horas}`, 14, 38);
    let y = 48;
    doc.setFontSize(12);
    doc.text('Resumen', 14, y);
    y += 6;
    doc.setFontSize(9);
    const lines = String(summary.summary?.texto || '').split('\n');
    lines.forEach(line => {
      if (y > 270) {
        doc.addPage();
        y = 18;
      }
      doc.text(line.slice(0, 190), 14, y);
      y += 5;
    });
    const fileName = `Turno_${(report?.turno || turnoForm.turno || 'reporte').replace(/[^a-z0-9_-]+/gi, '_')}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.pdf`;
    descargarArchivoPdf(doc, fileName);
  };

  const handleZonePlaced = (lat, lng) => {
    setPlacingZone(false);
    setNewZone(prev => ({ ...prev, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
    setShowZoneModal(true);
  };

  const crearZonaRiesgo = async (e) => {
    e.preventDefault();
    try {
      await apiJson(`${apiUrl}/risk-zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newZone, lat: parseFloat(newZone.lat), lng: parseFloat(newZone.lng), radius: parseInt(newZone.radius) }),
      });
      setShowZoneModal(false);
      setNewZone({ name: '', description: '', severity: 'high', lat: '', lng: '', radius: 5000 });
      await refreshRiskZones();
    } catch (err) {
      alert(err.message || 'No se pudo crear la zona de riesgo');
    }
  };

  const eliminarZonaRiesgo = async (id) => {
    if (!confirm('¿Eliminar esta zona de riesgo?')) return;
    try {
      await apiJson(`${apiUrl}/risk-zones/${id}`, { method: 'DELETE' });
      await refreshRiskZones();
    } catch (err) {
      alert(err.message || 'No se pudo eliminar la zona de riesgo');
    }
  };

  const vehiculosOnline = vehiculos.filter(v => v.isOnline);
  const vehiculosOffline = vehiculos.filter(v => !v.isOnline);
  const alertasNoLeidas = alertas.filter(a => !a.leida);
  const alertasVisibles = (alertasView === 'archivadas' ? alertasArchivadas : alertas).filter(a => !filtroAlertas || a.tipo === filtroAlertas);
  const vehiculosEnMovimiento = useMemo(() => vehiculos.filter(v => estaEnMovimiento(v.location?.speed)), [vehiculos]);

  const todasLasUnidades = useMemo(() => {
    const samsaraMapped = vehiculos.map(v => ({
      ...v,
      isLocal: false,
      nombre: v.name,
      estatus: v.isOnline ? (estaEnMovimiento(v.location?.speed) ? 'En Movimiento' : 'Detenida') : 'Sin Señal',
    }));
    const localMapped = unidadesLocales.map(u => ({
      id: `local-${u.id}`,
      name: u.nombre,
      isOnline: false,
      isLocal: true,
      localId: u.id,
      nombre: u.nombre,
      estatus: u.estatus,
      notas: u.notas,
      tipo: u.tipo,
      samsara_id: u.samsara_id,
      location: null,
      fuelLevelPercent: null,
      lastSeen: null,
    }));
    return [...samsaraMapped, ...localMapped];
  }, [vehiculos, unidadesLocales]);

  const seguimientoCompleto = useMemo(() => {
    const filas = [];
    const manualPorUnidad = new Map();
    seguimiento.forEach(row => {
      const key = String(row.unidad || '').toLowerCase().trim();
      if (!key) return;
      if (!manualPorUnidad.has(key)) manualPorUnidad.set(key, []);
      manualPorUnidad.get(key).push(row);
    });
    todasLasUnidades.forEach(unidad => {
      const nombre = unidad.nombre || unidad.name || '';
      if (!nombre) return;
      const manuales = manualPorUnidad.get(String(nombre).toLowerCase().trim()) || [];
      const manual = [...manuales].sort((a, b) => new Date(b.fecha_actualizacion || b.created_at || 0) - new Date(a.fecha_actualizacion || a.created_at || 0))[0] || null;
      const viajesUnidad = obtenerViajesUnidad(nombre, unidad.id)
        .filter(v => !['completado', 'cancelado'].includes(String(v.estado || '').toLowerCase()));
      const viajeActual = viajesUnidad[0] || null;
      const viajeSiguiente = viajesUnidad[1] || null;
      const estatus = viajeActual ? normalizarEstatusSeguimiento(viajeActual.estado) : 'Disponible';
      filas.push({
        ...(manual || {}),
        _origenSeguimiento: manual?.id,
        _unidadObj: unidad,
        unidad: nombre,
        grupo: manual?.grupo || '',
        remolque: viajeActual?.remolque || viajeActual?.seg_remolque || manual?.remolque || '',
        operador: viajeActual?.conductor || manual?.operador || operadores[String(unidad.id)]?.nombre || '',
        origen: viajeActual?.origen || manual?.origen || '',
        destino: viajeActual?.destino || manual?.destino || '',
        cita_carga: viajeActual?.fecha_inicio || manual?.cita_carga || '',
        cita_descarga: viajeActual?.fecha_fin || manual?.cita_descarga || '',
        hora_llegada: manual?.hora_llegada || '',
        hora_liberacion: manual?.hora_liberacion || '',
        estatus,
        comentarios_cliente: manual?.comentarios_cliente || '',
        comentarios_monitoreo: manual?.comentarios_monitoreo || '',
        fecha_actualizacion: manual?.fecha_actualizacion || viajeActual?.updated_at || viajeActual?.created_at || '',
        _viajeActual: viajeActual,
        _viajeSiguiente: viajeSiguiente,
        _auto: !manual,
      });
    });
    const unidadesConocidas = new Set(todasLasUnidades.map(u => String(u.nombre || u.name || '').toLowerCase().trim()));
    seguimiento.forEach(row => {
      const key = String(row.unidad || '').toLowerCase().trim();
      if (!key || unidadesConocidas.has(key)) return;
      const viajesUnidad = obtenerViajesUnidad(row.unidad)
        .filter(v => !['completado', 'cancelado'].includes(String(v.estado || '').toLowerCase()));
      const viajeActual = viajesUnidad[0] || null;
      filas.push({
        ...row,
        _unidadObj: null,
        _viajeActual: viajeActual,
        _viajeSiguiente: viajesUnidad[1] || null,
        _auto: false,
      });
    });
    return filas.sort((a, b) => String(a.unidad || '').localeCompare(String(b.unidad || ''), 'es', { numeric: true, sensitivity: 'base' }));
  }, [todasLasUnidades, seguimiento, viajes, operadores]);

  const seguimientoFiltrado = useMemo(() => {
    return seguimientoCompleto.filter(row => {
      const busqueda = seguimientoFilter.trim().toLowerCase();
      const matchesBusqueda = !busqueda || [row.unidad, row.operador, row.remolque, row.ruta, row.origen, row.destino, row.comentarios_cliente, row.comentarios_monitoreo, row.grupo, row.estatus]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(busqueda));
      const matchesEstatus = !seguimientoEstatusFilter || String(row.estatus || '').toLowerCase() === seguimientoEstatusFilter.toLowerCase();
      const matchesGrupo = !seguimientoGrupoFilter || String(row.grupo || '').toLowerCase() === seguimientoGrupoFilter.toLowerCase();
      const unidadFilter = seguimientoUnidadFilter.trim().toLowerCase();
      const matchesUnidad = !unidadFilter || String(row.unidad || '').toLowerCase().includes(unidadFilter);
      return matchesBusqueda && matchesEstatus && matchesGrupo && matchesUnidad;
    });
  }, [seguimientoCompleto, seguimientoFilter, seguimientoEstatusFilter, seguimientoGrupoFilter, seguimientoUnidadFilter]);
  const seguimientoResumen = useMemo(() => {
    const total = seguimientoCompleto.length;
    const activos = seguimientoCompleto.filter(row => ['programado', 'en ruta cargado', 'en ruta vacio', 'en proceso de carga', 'en proceso de descarga'].includes(String(row.estatus || '').toLowerCase())).length;
    const disponibles = seguimientoCompleto.filter(row => String(row.estatus || '').toLowerCase() === 'disponible').length;
    return { total, activos, disponibles };
  }, [seguimientoCompleto]);


  const esAdmin = currentUser?.rol === 'admin';
  const tabsOcultosParaUser = ['dashboard', 'operadores', 'reportes', 'usuarios'];
  const menuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'monitoreo', label: 'Monitoreo', icon: '🗺️' },
    { key: 'seguimiento', label: 'Seguimiento', icon: '📊' },
    { key: 'operaciones', label: 'Pendientes', icon: '📋' },
    { key: 'viajes', label: 'Viajes', icon: '🚚' },
    { key: 'citas', label: 'Citas', icon: '📅' },
    { key: 'geocercas', label: 'Geocercas', icon: '⭕' },
    { key: 'unidades', label: 'Unidades', icon: '🚛', badge: todasLasUnidades.length },
    { key: 'alertas', label: 'Alertas', icon: '🔔', badge: alertasNoLeidas.length },
    { key: 'operadores', label: 'Operadores', icon: '👤' },
    { key: 'clientes', label: 'Clientes', icon: '🏢', badge: clientes.length },
    { key: 'remolques', label: 'Remolques', icon: '🚛' },
    { key: 'mapas', label: 'Mapas', icon: '🗺️' },
    { key: 'rutas', label: 'Historial Rutas', icon: '🛤️' },
    { key: 'reportes', label: 'Reportes', icon: '📈' },
    ...(esAdmin ? [{ key: 'usuarios', label: 'Usuarios', icon: '🔐' }] : []),
  ].filter(item => esAdmin || !tabsOcultosParaUser.includes(item.key));

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
    input: { padding: '0.6rem 0.8rem', border: '1px solid #1a3d1a', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', width: '100%', transition: 'border-color 0.2s', background: '#ffffff', color: '#000000' },
    button: (color = '#00ff41') => ({ background: 'transparent', color: color, border: `1px solid ${color}`, padding: '0.55rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', transition: 'all 0.2s' }),
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '0.75rem 0.75rem', borderBottom: '1px solid #1a3d1a', color: '#00ff41', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' },
    td: { padding: '0.75rem', borderBottom: '1px solid #0d1f0d', fontSize: '0.875rem', color: '#c0c0c0' },
    badge: (color) => ({ background: color + '15', color: color, padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', border: `1px solid ${color}33` }),
    select: { padding: '0.55rem 0.8rem', border: '1px solid #1a3d1a', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', background: '#ffffff', cursor: 'pointer', color: '#000000' },
    label: { display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', fontWeight: '500', color: '#6a9b6a' },
  };

  const estadoColors = {
    disponible: '#6b7280', programado: '#8b5cf6',
    en_ruta_vacio: '#22c55e', en_ruta_cargado: '#00ff41',
    espera_ingreso: '#f59e0b', proceso_carga: '#f97316', proceso_descarga: '#ec4899', proceso_liberacion: '#a855f7',
    en_resguardo: '#f97316', completado: '#10b981', cancelado: '#ef4444',
  };

  const thStyle = { padding: '0.5rem 0.6rem', color: '#4a8a4a', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '2px solid #1a3d1a', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#0d1a0d', position: 'sticky', top: 0, zIndex: 2 };
  const tdStyle = { padding: '0.3rem 0.5rem', borderBottom: '1px solid #141414', whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' };
  const inputStyle = { width: '100%', background: 'transparent', border: '1px solid transparent', borderRadius: '4px', color: '#ffffff', fontSize: '0.75rem', padding: '3px 6px', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s, background 0.15s' };


  return {
    apiUrl,
    setApiUrl,
    authToken,
    setAuthToken,
    currentUser,
    setCurrentUser,
    authLoading,
    setAuthLoading,
    loginForm,
    setLoginForm,
    loginError,
    setLoginError,
    usuarios,
    setUsuarios,
    formUsuario,
    setFormUsuario,
    usuarioMsg,
    setUsuarioMsg,
    activeTab,
    setActiveTab,
    stats,
    setStats,
    kpis,
    setKpis,
    pendientes,
    setPendientes,
    filtroTurno,
    setFiltroTurno,
    showPendienteModal,
    setShowPendienteModal,
    pendienteEditando,
    setPendienteEditando,
    formPendiente,
    setFormPendiente,
    draggedPendiente,
    setDraggedPendiente,
    dragOverColumn,
    setDragOverColumn,
    draggedViaje,
    setDraggedViaje,
    dragOverViajeColumn,
    setDragOverViajeColumn,
    showHistorialModal,
    setShowHistorialModal,
    historialPendientes,
    setHistorialPendientes,
    nuevoComentarioPendiente,
    setNuevoComentarioPendiente,
    viajes,
    setViajes,
    viajesView,
    setViajesView,
    viajesHistorialSearch,
    setViajesHistorialSearch,
    viajesProximosSearch,
    setViajesProximosSearch,
    alertas,
    setAlertas,
    alertasArchivadas,
    setAlertasArchivadas,
    alertasView,
    setAlertasView,
    floatingAlerts,
    setFloatingAlerts,
    vehiculos,
    setVehiculos,
    reportes,
    setReportes,
    reporteLoading,
    setReporteLoading,
    reporteError,
    setReporteError,
    loading,
    setLoading,
    filtroReporte,
    setFiltroReporte,
    formViaje,
    setFormViaje,
    pendienteSaving,
    setPendienteSaving,
    viajeSaving,
    setViajeSaving,
    remolques,
    setRemolques,
    clientes,
    setClientes,
    clienteSearch,
    setClienteSearch,
    showClienteModal,
    setShowClienteModal,
    clienteEditando,
    setClienteEditando,
    formCliente,
    setFormCliente,
    clienteSaving,
    setClienteSaving,
    selectedClienteId,
    setSelectedClienteId,
    showClienteGeofenceModal,
    setShowClienteGeofenceModal,
    formClienteGeofence,
    setFormClienteGeofence,
    clienteGeofenceSaving,
    setClienteGeofenceSaving,
    geofenceLinks,
    setGeofenceLinks,
    showExistingGeofenceModal,
    setShowExistingGeofenceModal,
    existingGeofenceSelections,
    setExistingGeofenceSelections,
    existingGeofenceSearch,
    setExistingGeofenceSearch,
    existingGeofenceSaving,
    setExistingGeofenceSaving,
    showRemolqueModal,
    setShowRemolqueModal,
    formRemolque,
    setFormRemolque,
    remolqueEditando,
    setRemolqueEditando,
    historialRemolque,
    setHistorialRemolque,
    selectedRemolque,
    setSelectedRemolque,
    historialRemolqueLoading,
    setHistorialRemolqueLoading,
    historialRemolqueError,
    setHistorialRemolqueError,
    remolqueDashVehicleId,
    setRemolqueDashVehicleId,
    remolqueDashModo,
    setRemolqueDashModo,
    remolqueDashSegundoId,
    setRemolqueDashSegundoId,
    remolqueDashSaving,
    setRemolqueDashSaving,
    seguimiento,
    setSeguimiento,
    seguimientoFilter,
    setSeguimientoFilter,
    seguimientoEstatusFilter,
    setSeguimientoEstatusFilter,
    seguimientoGrupoFilter,
    setSeguimientoGrupoFilter,
    seguimientoUnidadFilter,
    setSeguimientoUnidadFilter,
    seguimientoEditando,
    setSeguimientoEditando,
    showSeguimientoForm,
    setShowSeguimientoForm,
    formSeguimiento,
    setFormSeguimiento,
    seguimientoHistorial,
    setSeguimientoHistorial,
    seguimientoHistorialLoading,
    setSeguimientoHistorialLoading,
    seguimientoHistorialError,
    setSeguimientoHistorialError,
    selectedSeguimiento,
    setSelectedSeguimiento,
    showSeguimientoUpdateModal,
    setShowSeguimientoUpdateModal,
    seguimientoModalUnidadId,
    setSeguimientoModalUnidadId,
    seguimientoModalGrupo,
    setSeguimientoModalGrupo,
    seguimientoModalNota,
    setSeguimientoModalNota,
    seguimientoModalSaving,
    setSeguimientoModalSaving,
    seguimientoModalError,
    setSeguimientoModalError,
    seguimientoFormAvanzado,
    setSeguimientoFormAvanzado,
    showMensajeModal,
    setShowMensajeModal,
    mensajeCliente,
    setMensajeCliente,
    mensajeTexto,
    setMensajeTexto,
    showTurnoModal,
    setShowTurnoModal,
    turnoForm,
    setTurnoForm,
    turnoSummary,
    setTurnoSummary,
    turnoLoading,
    setTurnoLoading,
    turnoSaving,
    setTurnoSaving,
    operadorDraft,
    setOperadorDraft,
    telefonoDraft,
    setTelefonoDraft,
    remolqueDraft,
    setRemolqueDraft,
    remolqueModo,
    setRemolqueModo,
    remolquesFullDraft,
    setRemolquesFullDraft,
    generarMensajeSeguimiento,
    abrirGeneradorMensajes,
    actualizarMensaje,
    copiarMensaje,
    enviarWhatsApp,
    gruposUnicos,
    seguimientoEstados,
    remolqueCategorias,
    clientesFiltrados,
    selectedVehicle,
    setSelectedVehicle,
    comentarioRapido,
    setComentarioRapido,
    destinoInput,
    setDestinoInput,
    etaData,
    setEtaData,
    etaError,
    setEtaError,
    calculandoEta,
    setCalculandoEta,
    viajeEta,
    setViajeEta,
    viajeEtaError,
    setViajeEtaError,
    calculandoViajeEta,
    setCalculandoViajeEta,
    operadores,
    setOperadores,
    samsaraDrivers,
    setSamsaraDrivers,
    hiddenDrivers,
    setHiddenDrivers,
    hiddenUnits,
    setHiddenUnits,
    driverPhoneOverrides,
    setDriverPhoneOverrides,
    filtroOperador,
    setFiltroOperador,
    idStr,
    geofences,
    setGeofences,
    geofenceEvents,
    setGeofenceEvents,
    selectedGeofenceHistory,
    setSelectedGeofenceHistory,
    showGeofenceHistoryPanel,
    setShowGeofenceHistoryPanel,
    geofenceHistoryLoading,
    setGeofenceHistoryLoading,
    geofenceHistoryError,
    setGeofenceHistoryError,
    samsaraAddresses,
    setSamsaraAddresses,
    geofenceCat,
    setGeofenceCat,
    busquedaGeofence,
    setBusquedaGeofence,
    geofenceCategories,
    allGeofences,
    selectedCliente,
    geofenceOwnerId,
    selectedClienteGeofences,
    geofenceNames,
    normalizeGeofenceName,
    findGeofence,
    clienteDeGeofence,
    TOKENS_GENERICOS_DESTINO,
    nucleoDestino,
    clienteDeDestino,
    geofencesEnDestino,
    geofenceOptions,
    geocercasCoincidentes,
    parseCitaDate,
    findVehicleForUnit,
    citasOperativas,
    vehiculoDeCita,
    horaLlegadaRealCita,
    estadoVehiculoCita,
    unidadCitaLabel,
    diaEntregaCita,
    labelDiaEntrega,
    generarReporteWppCliente,
    recalcularReporteWpp,
    abrirReporteWpp,
    copiarReporteWpp,
    copiarReporteWppEnvio,
    marcandoCitaId,
    setMarcandoCitaId,
    marcarCitaCompletada,
    formGeofence,
    setFormGeofence,
    filtroAlertas,
    setFiltroAlertas,
    busquedaUnidades,
    setBusquedaUnidades,
    filtroUnidades,
    setFiltroUnidades,
    sidebarCollapsed,
    setSidebarCollapsed,
    routeHistory,
    setRouteHistory,
    routeDates,
    setRouteDates,
    routeVehicleId,
    setRouteVehicleId,
    routeDate,
    setRouteDate,
    routeLoading,
    setRouteLoading,
    citasEta,
    setCitasEta,
    citasEtaLoading,
    setCitasEtaLoading,
    citasEtaRefresh,
    setCitasEtaRefresh,
    citaSeleccionada,
    setCitaSeleccionada,
    citaLlegada,
    setCitaLlegada,
    showWppReporte,
    setShowWppReporte,
    wppReporteDia,
    setWppReporteDia,
    wppReporteTextos,
    setWppReporteTextos,
    wppReporteGrupos,
    setWppReporteGrupos,
    mapas,
    setMapas,
    selectedMapa,
    setSelectedMapa,
    mapaEditando,
    setMapaEditando,
    formMapa,
    setFormMapa,
    mapaSaving,
    setMapaSaving,
    mapasError,
    setMapasError,
    customRiskZones,
    setCustomRiskZones,
    placingZone,
    setPlacingZone,
    showZoneModal,
    setShowZoneModal,
    newZone,
    setNewZone,
    unidadesLocales,
    setUnidadesLocales,
    showProgramarViajeModal,
    setShowProgramarViajeModal,
    showViajeModal,
    setShowViajeModal,
    viajeDetalle,
    setViajeDetalle,
    viajeEditando,
    setViajeEditando,
    viajeForm,
    setViajeForm,
    actualizarViaje,
    showUnidadModal,
    setShowUnidadModal,
    editUnidad,
    setEditUnidad,
    formUnidad,
    setFormUnidad,
    monitoreoSelectedId,
    setMonitoreoSelectedId,
    monitoreoRouteHistory,
    setMonitoreoRouteHistory,
    monitoreoStops,
    setMonitoreoStops,
    monitoreoEta,
    setMonitoreoEta,
    monitoreoRutaTotal,
    setMonitoreoRutaTotal,
    monitoreoEtaLoading,
    setMonitoreoEtaLoading,
    monitoreoGeofenceMatch,
    setMonitoreoGeofenceMatch,
    viajesActivos,
    setViajesActivos,
    loadAllInFlightRef,
    loadAllQueuedRef,
    loadAllTimerRef,
    sseCooldownUntilRef,
    pendientesVersionRef,
    monitoreoRequestRef,
    monitoreoEtaDestinoRef,
    etaRequestRef,
    viajeEtaRequestRef,
    remolqueHistoryRequestRef,
    pendienteRequestRef,
    routeHistoryRequestRef,
    routeDatesRequestRef,
    reportRequestRef,
    viajeWasDraggedRef,
    citasEtaRequestRef,
    floatingAlertTimersRef,
    statusKey,
    tripStatusByKey,
    seguimientoStatusByKey,
    normalizarEstadoViaje,
    normalizarEstatusSeguimiento,
    normalizarViajes,
    normalizarSeguimiento,
    velocidadKmh,
    whatsappDigits,
    defaultZonesList,
    apiRequest,
    authFetch,
    fetch,
    apiJson,
    handleLogin,
    handleLogout,
    guardarUsuario,
    entregarTurno,
    guardarCierreTurno,
    primerDestinoForm,
    parseFecha,
    parseFechaProgramada,
    formatFechaProgramada,
    loadAll,
    refreshAlertas,
    refreshAlertasArchivadas,
    refreshRemolques,
    refreshClientes,
    refreshGeofenceLinks,
    refreshSeguimiento,
    refreshGeofences,
    refreshRiskZones,
    refreshUnidadesLocales,
    mapaUrl,
    googleUrlSeguro,
    googleMyMapsEmbedUrl,
    refreshMapas,
    guardarMapa,
    editarMapa,
    cancelarEdicionMapa,
    eliminarMapa,
    detectarMapasLinks,
    guardarMapaDetectado,
    refreshPendientes,
    refreshViajes,
    guardarPendiente,
    eliminarUsuario,
    eliminarPendiente,
    cambiarEstadoPendiente,
    agregarComentarioPendiente,
    abrirPendiente,
    cerrarPendiente,
    archivarCompletados,
    cargarHistorial,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    crearViaje,
    actualizarEstadoViaje,
    actualizarParadaViaje,
    iniciarArrastreViaje,
    terminarArrastreViaje,
    soltarViaje,
    eliminarViaje,
    marcarAlertaLeida,
    archivarAlerta,
    archivarAlertas,
    restaurarAlerta,
    crearRemolque,
    cerrarRemolqueModal,
    eliminarRemolque,
    setResguardoRemolque,
    abrirClienteModal,
    cerrarClienteModal,
    guardarCliente,
    eliminarCliente,
    asignarRemolque,
    asignarFull,
    desasignarRemolque,
    cargarHistorialRemolque,
    abrirRemolqueDashboard,
    asignarRemolqueDesdeDashboard,
    numeroRemolque,
    tempColor,
    obtenerMiembrosFull,
    displayRemolque,
    obtenerRemolqueAsignadoUnidad,
    obtenerOpcionesRemolque,
    ubicacionRemolque,
    aplicarSeguimientoDesdeUnidad,
    ordenarViajesUnidad,
    normalizarTexto,
    unidadKey,
    obtenerSeguimientoUnidad,
    obtenerViajesUnidad,
    fechaInicioViaje,
    soloPrimerViajeActivoPorUnidad,
    viajesProximosOcultos,
    abrirActualizarSeguimiento,
    seleccionarUnidadSeguimiento,
    construirActualizacionSeguimiento,
    guardarActualizacionSeguimiento,
    limpiarSeguimientoForm,
    abrirNuevoSeguimiento,
    guardarSeguimiento,
    actualizarGrupoSeguimiento,
    editarSeguimiento,
    cargarHistorialSeguimiento,
    eliminarSeguimiento,
    guardarUnidad,
    haversineKm,
    pointInsideGeofence,
    geofenceAtLocation,
    selectMonitoreoVehicle,
    calcularMonitoreoEta,
    guardarComentarioRapido,
    guardarOperador,
    seleccionarOperador,
    mostrarNotificacionSync,
    guardarRemolqueSeleccionado,
    prepararGeofencePayload,
    crearGeofence,
    abrirClienteGeofenceModal,
    cerrarClienteGeofenceModal,
    crearClienteGeofence,
    abrirExistingGeofenceModal,
    cerrarExistingGeofenceModal,
    vincularExistingGeofence,
    desvincularClienteGeofence,
    eliminarGeofence,
    toggleGeofence,
    renombrarGeofence,
    toggleGeofencesBulk,
    toggleGeofencesByCategory,
    ejecutarCheckGeofences,
    verHistorialGeocerca,
    verHistorialGeneralGeocercas,
    ejecutarCheckFuel,
    calcularRuta,
    calcularETA,
    calcularViajeETA,
    cargarHistorialRuta,
    cargarFechasRuta,
    cambiarFechaRuta,
    solicitarReporte,
    cargarReporte,
    actualizarFiltroReporte,
    abrirReporteDirecto,
    generarPDF,
    descargarArchivoPdf,
    descargarPdfTurno,
    handleZonePlaced,
    crearZonaRiesgo,
    eliminarZonaRiesgo,
    vehiculosOnline,
    vehiculosOffline,
    alertasNoLeidas,
    alertasVisibles,
    vehiculosEnMovimiento,
    todasLasUnidades,
    seguimientoCompleto,
    seguimientoFiltrado,
    seguimientoResumen,
    esAdmin,
    tabsOcultosParaUser,
    menuItems,
    s,
    estadoColors,
    thStyle,
    tdStyle,
    inputStyle,
  };
}
