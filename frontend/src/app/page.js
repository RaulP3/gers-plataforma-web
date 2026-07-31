'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const MapaUnidades = dynamic(() => import('../components/MapaUnidades'), { ssr: false });
const RouteMap = dynamic(() => import('../components/RouteMap'), { ssr: false });

export default function Home() {
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
  const [stats, setStats] = useState({});
  const [pendientes, setPendientes] = useState([]);
  const [filtroTurno, setFiltroTurno] = useState('');
  const [showPendienteModal, setShowPendienteModal] = useState(false);
  const [pendienteEditando, setPendienteEditando] = useState(null);
  const [formPendiente, setFormPendiente] = useState({ titulo: '', descripcion: '', prioridad: 'media', asignado_a: '', turno: '', notas: '' });
  const [draggedPendiente, setDraggedPendiente] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [historialPendientes, setHistorialPendientes] = useState([]);
  const [nuevoComentarioPendiente, setNuevoComentarioPendiente] = useState('');
  const [viajes, setViajes] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [reportes, setReportes] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filtroReporte, setFiltroReporte] = useState({ tipo: 'pendientes', fecha_inicio: '', fecha_fin: '', vehicle_id: '' });
  const [formViaje, setFormViaje] = useState({ vehicle_id: '', vehicle_name: '', origen: '', destino: '', conductor: '', telefono: '', fecha_inicio: '', fecha_fin: '', notas: '', remolque: '' });
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [nuevoComentario, setNuevoComentario] = useState({ vehicle_id: '', vehicle_name: '', tipo: 'seguimiento', titulo: '', contenido: '', estatus: '', remolque: '', grupo: '', origen: '', destino: '' });
  const [remolques, setRemolques] = useState([]);
  const [showRemolqueModal, setShowRemolqueModal] = useState(false);
  const [formRemolque, setFormRemolque] = useState({ numero: '', categoria: 'Caja Seca' });
  const [remolqueEditando, setRemolqueEditando] = useState(null);
  const [historialRemolque, setHistorialRemolque] = useState([]);
  const [selectedRemolque, setSelectedRemolque] = useState(null);
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
  const [seguimientoModalNota, setSeguimientoModalNota] = useState('');
  const [seguimientoModalSaving, setSeguimientoModalSaving] = useState(false);
  const [seguimientoModalError, setSeguimientoModalError] = useState('');
  const [showMensajeModal, setShowMensajeModal] = useState(false);
  const [mensajeCliente, setMensajeCliente] = useState('');
  const [mensajeTexto, setMensajeTexto] = useState('');
  const [showTurnoModal, setShowTurnoModal] = useState(false);
  const [turnoForm, setTurnoForm] = useState({ turno: '', horas: 8, observaciones: '' });
  const [turnoSummary, setTurnoSummary] = useState(null);
  const [turnoLoading, setTurnoLoading] = useState(false);
  const [turnoSaving, setTurnoSaving] = useState(false);

  const generarMensajeSeguimiento = (grupo) => {
    const filas = seguimiento.filter(row => row.grupo === grupo);
    let msg = `📲 REPORTE DE UNIDADES "${grupo}"\n------------------------------------------\n\n`;
    filas.forEach(row => {
      msg += `Unidad: ${row.unidad || 'N/A'}\n`;
      msg += `Grupo: ${row.grupo || 'N/A'}\n`;
      msg += `Remolque: ${row.remolque || 'N/A'}\n`;
      msg += `Operador: ${row.operador || 'N/A'}\n`;
      msg += `Origen -- Destino: ${row.origen || 'N/A'} -- ${row.destino || 'N/A'}\n`;
      msg += `Cita de carga(Hora inicial): ${row.cita_carga || 'N/A'}\n`;
      msg += `Cita de descarga(Hora final): ${row.cita_descarga || 'N/A'}\n`;
      msg += `Llegada con el cliente(primer contacto con geocerca): ${row.hora_llegada || 'N/A'}\n`;
      msg += `Hora de liberacion(ultima salida de la geocerca): ${row.hora_liberacion || 'N/A'}\n`;
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
    const msg = encodeURIComponent(mensajeTexto);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const gruposUnicos = [...new Set(seguimiento.map(row => row.grupo).filter(Boolean))];
  const seguimientoEstados = ['Disponible', 'En ruta cargado', 'En ruta vacio', 'En proceso de carga', 'En proceso de descarga', 'En resguardo', 'Programado', 'No disponible'];
  const seguimientoFiltrado = useMemo(() => {
    return seguimiento.filter(row => {
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
  }, [seguimiento, seguimientoFilter, seguimientoEstatusFilter, seguimientoGrupoFilter, seguimientoUnidadFilter]);
  const seguimientoResumen = useMemo(() => {
    const total = seguimiento.length;
    const activos = seguimiento.filter(row => ['programado', 'en ruta cargado', 'en ruta vacio', 'en proceso de carga', 'en proceso de descarga'].includes(String(row.estatus || '').toLowerCase())).length;
    const disponibles = seguimiento.filter(row => String(row.estatus || '').toLowerCase() === 'disponible').length;
    return { total, activos, disponibles };
  }, [seguimiento]);
  const notasBitacora = comentarios.filter(c => ['bitacora', 'seguimiento', 'mantenimiento'].includes((c.tipo || '').toLowerCase()));
  const notasIncidencias = comentarios.filter(c => ['incidencia', 'incidente'].includes((c.tipo || '').toLowerCase()));
  const [notasTab, setNotasTab] = useState('bitacora');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [comentarioRapido, setComentarioRapido] = useState({ tipo: 'seguimiento', titulo: '', contenido: '' });
  const [destinoInput, setDestinoInput] = useState('');
  const [etaData, setEtaData] = useState(null);
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
    { key: 'planta', label: 'Plantas GERS', icon: '🏭' },
    { key: 'logistica', label: 'Zonas Logísticas', icon: '📦' },
    { key: 'puerto', label: 'Puertos', icon: '🚢' },
    { key: 'aduana', label: 'Aduanas', icon: '🛃' },
    { key: 'custom', label: 'Mis Geocercas', icon: '📍' },
  ];
  const allGeofences = useMemo(() => {
    const local = geofences.map(g => ({ ...g, source: 'local' }));
    const sam = samsaraAddresses.map(a => ({ ...a, source: 'samsara', activa: 1 }));
    return [...sam, ...local];
  }, [geofences, samsaraAddresses]);
  const [formGeofence, setFormGeofence] = useState({ nombre: '', latitud: '', longitud: '', radio_metros: '500', descripcion: '', color: '#3b82f6' });
  const [filtroAlertas, setFiltroAlertas] = useState('');
  const [busquedaUnidades, setBusquedaUnidades] = useState('');
  const [filtroUnidades, setFiltroUnidades] = useState('todas');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [routeHistory, setRouteHistory] = useState([]);
  const [routeDates, setRouteDates] = useState([]);
  const [routeVehicleId, setRouteVehicleId] = useState('');
  const [routeDate, setRouteDate] = useState('');
  const [routeLoading, setRouteLoading] = useState(false);
  const [dashTab, setDashTab] = useState('unidades');
  const [dashSearch, setDashSearch] = useState('');
  const [customRiskZones, setCustomRiskZones] = useState([]);
  const [placingZone, setPlacingZone] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [newZone, setNewZone] = useState({ name: '', description: '', severity: 'high', lat: '', lng: '', radius: 5000 });
  const [unidadesLocales, setUnidadesLocales] = useState([]);
  const [showViajeModal, setShowViajeModal] = useState(false);
  const [viajeDetalle, setViajeDetalle] = useState(null);
  const [viajeEditando, setViajeEditando] = useState(false);
  const [viajeForm, setViajeForm] = useState({});

  const actualizarViaje = async () => {
    if (!viajeDetalle?.id) return;
    await fetch(`${apiUrl}/viajes/${viajeDetalle.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(viajeForm),
    });
    setViajeDetalle(viajeForm);
    setViajeEditando(false);
    loadAll();
  };

  const [showUnidadModal, setShowUnidadModal] = useState(false);
  const [editUnidad, setEditUnidad] = useState(null);
  const [formUnidad, setFormUnidad] = useState({ nombre: '', estatus: 'Activa', notas: '', tipo: 'manual', samsara_id: '' });
  const [monitoreoSelectedId, setMonitoreoSelectedId] = useState(null);
  const [monitoreoRouteHistory, setMonitoreoRouteHistory] = useState([]);
  const [monitoreoEta, setMonitoreoEta] = useState(null);
  const [monitoreoGeofenceMatch, setMonitoreoGeofenceMatch] = useState(null);
  const [viajesActivos, setViajesActivos] = useState([]);

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
    const source = new EventSource(`${apiUrl}/live`);
    const handleReload = () => loadAll();
    const noop = () => {};
    source.addEventListener('reload', handleReload);
    source.addEventListener('vehicles', handleReload);
    source.addEventListener('connected', noop);
    return () => {
      source.removeEventListener('reload', handleReload);
      source.removeEventListener('vehicles', handleReload);
      source.removeEventListener('connected', noop);
      source.close();
    };
  }, [apiUrl, currentUser]);

  const apiRequest = (url, options = {}) => {
    const headers = { ...(options.headers || {}) };
    const isBackendUrl = typeof url === 'string' && apiUrl && url.startsWith(apiUrl);
    if (isBackendUrl && authToken && !headers.Authorization) headers.Authorization = `Bearer ${authToken}`;
    return globalThis.fetch(url, { ...options, headers });
  };

  const authFetch = apiRequest;
  const fetch = apiRequest;

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
      authFetch(`${apiUrl}/samsara/vehicles`).then(r => r.json()).then(v => {
        setVehiculos(Array.isArray(v) ? v : (v.data || v.vehicles || []));
      }).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [apiUrl, currentUser, authToken]);

  useEffect(() => {
    if (!destinoInput.trim() || !selectedVehicle?.location) { setEtaData(null); return; }
    const vehicle = selectedVehicle;
    const timer = setTimeout(() => calcularETA(destinoInput, vehicle), 1500);
    return () => clearTimeout(timer);
  }, [destinoInput, selectedVehicle?.id]);

  useEffect(() => {
    if (!selectedVehicle) { setDestinoInput(''); setEtaData(null); }
  }, [selectedVehicle]);

  useEffect(() => {
    if (!formViaje.destino.trim() || !formViaje.vehicle_id) { setViajeEta(null); setViajeEtaError(''); return; }
    const v = vehiculos.find(vh => String(vh.id) === formViaje.vehicle_id);
    if (!v?.location) { setViajeEta(null); setViajeEtaError('Vehiculo sin ubicacion GPS'); return; }
    setViajeEtaError('');
    const timer = setTimeout(() => calcularViajeETA(formViaje.destino, v), 1500);
    return () => clearTimeout(timer);
  }, [formViaje.destino, formViaje.vehicle_id]);

  const parseFecha = (str) => {
    if (!str) return null;
    if (str.endsWith('Z') || str.includes('+')) return new Date(str);
    return new Date(str + 'Z');
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, pendientesRes, viajesRes, alertasRes, vehiculosRes, comentariosRes, operadoresRes, driversRes, geofencesRes, eventsRes, riskZonesRes, samsaraAddrRes, remolquesRes, seguimientoRes, unidadesRes] = await Promise.allSettled([
        fetch(`${apiUrl}/reportes/resumen`).then(r => r.json()),
        fetch(`${apiUrl}/pendientes`).then(r => r.json()),
        fetch(`${apiUrl}/viajes`).then(r => r.json()),
        fetch(`${apiUrl}/alertas`).then(r => r.json()),
        fetch(`${apiUrl}/samsara/vehicles`).then(r => r.json()),
        fetch(`${apiUrl}/comentarios`).then(r => r.json()),
        fetch(`${apiUrl}/vehicle-operators`).then(r => r.json()),
        fetch(`${apiUrl}/samsara/drivers`).then(r => r.json()),
        fetch(`${apiUrl}/geofences`).then(r => r.json()),
        fetch(`${apiUrl}/geofence-events?limit=100`).then(r => r.json()),
        fetch(`${apiUrl}/risk-zones`).then(r => r.json()),
        fetch(`${apiUrl}/samsara/addresses`).then(r => r.json()),
        fetch(`${apiUrl}/remolques`).then(r => r.json()),
        fetch(`${apiUrl}/seguimiento`).then(r => r.json()),
        fetch(`${apiUrl}/unidades`).then(r => r.json()),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (pendientesRes.status === 'fulfilled') setPendientes(pendientesRes.value);
      if (viajesRes.status === 'fulfilled') setViajes(viajesRes.value);
      if (alertasRes.status === 'fulfilled') setAlertas(alertasRes.value);
      if (comentariosRes.status === 'fulfilled') setComentarios(comentariosRes.value);
      if (driversRes.status === 'fulfilled') setSamsaraDrivers(driversRes.value || []);
      if (geofencesRes.status === 'fulfilled') setGeofences(geofencesRes.value || []);
      if (eventsRes.status === 'fulfilled') setGeofenceEvents(eventsRes.value || []);
      if (riskZonesRes.status === 'fulfilled') setCustomRiskZones(riskZonesRes.value || []);
      if (samsaraAddrRes.status === 'fulfilled') setSamsaraAddresses(samsaraAddrRes.value || []);
      if (remolquesRes.status === 'fulfilled') setRemolques(remolquesRes.value || []);
      if (seguimientoRes.status === 'fulfilled') setSeguimiento(seguimientoRes.value || []);
      if (unidadesRes.status === 'fulfilled') setUnidadesLocales(unidadesRes.value || []);

      const viajesActivosRes = await fetch(`${apiUrl}/viajes/activos`).then(r => r.json()).catch(() => []);
      setViajesActivos(Array.isArray(viajesActivosRes) ? viajesActivosRes : []);
      if (operadoresRes.status === 'fulfilled') {
        const map = {};
        for (const op of (operadoresRes.value || [])) {
          map[op.vehicle_id] = { nombre: op.operator_name, telefono: op.telefono || '' };
        }
        setOperadores(map);
      }
      if (vehiculosRes.status === 'fulfilled') {
        const v = vehiculosRes.value;
        setVehiculos(Array.isArray(v) ? v : (v.data || v.vehicles || []));
      }
      if (currentUser?.rol === 'admin') {
        const usersRes = await fetch(`${apiUrl}/users`).then(r => r.json()).catch(() => []);
        setUsuarios(Array.isArray(usersRes) ? usersRes : []);
      }
    } catch (e) {
      console.error('Error cargando datos:', e);
    }
    setLoading(false);
  };

  const guardarPendiente = async (e) => {
    e.preventDefault();
    if (!pendienteEditando?.id && !formPendiente.titulo.trim()) return;
    const url = pendienteEditando?.id
      ? `${apiUrl}/pendientes/${pendienteEditando.id}`
      : `${apiUrl}/pendientes`;
    const method = pendienteEditando?.id ? 'PUT' : 'POST';
    const payload = pendienteEditando?.id
      ? { ...pendienteEditando, prioridad: formPendiente.prioridad || pendienteEditando.prioridad || 'media' }
      : { ...formPendiente, estado: 'pendiente' };
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setFormPendiente({ titulo: '', descripcion: '', prioridad: 'media', asignado_a: '', turno: '', notas: '' });
    setPendienteEditando(null);
    setShowPendienteModal(false);
    loadAll();
  };

  const eliminarPendiente = async (id) => {
    if (!confirm('¿Eliminar este pendiente?')) return;
    await fetch(`${apiUrl}/pendientes/${id}`, { method: 'DELETE' });
    loadAll();
  };

  const cambiarEstadoPendiente = async (id, nuevoEstado) => {
    const p = pendientes.find(x => x.id === id);
    if (!p) return;
    await fetch(`${apiUrl}/pendientes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...p, estado: nuevoEstado }),
    });
    loadAll();
  };

  const agregarComentarioPendiente = async (pendienteId, contenido) => {
    if (!contenido.trim()) return;
    await fetch(`${apiUrl}/pendientes/${pendienteId}/comentarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contenido }),
    });
    setNuevoComentarioPendiente('');
    const comentarios = await fetch(`${apiUrl}/pendientes/${pendienteId}/comentarios`).then(r => r.json());
    setPendienteEditando({ ...pendienteEditando, comentarios });
  };

  const archivarCompletados = async () => {
    const completados = pendientes.filter(p => p.estado === 'completado');
    if (completados.length === 0) { alert('No hay pendientes completados para archivar'); return; }
    if (!confirm(`¿Archivar ${completados.length} pendiente(s) completado(s)?`)) return;
    const res = await fetch(`${apiUrl}/pendientes/archivar-completados`, { method: 'POST' });
    const data = await res.json();
    if (data.archived > 0) { alert(`${data.archived} pendiente(s) archivado(s)`); loadAll(); }
  };

  const cargarHistorial = async () => {
    setShowHistorialModal(true);
    const res = await fetch(`${apiUrl}/pendientes/historial`);
    const data = await res.json();
    setHistorialPendientes(data);
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
    const res = await fetch(`${apiUrl}/viajes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formViaje),
    });
    if (formViaje.conductor && formViaje.vehicle_id) {
      await fetch(`${apiUrl}/vehicle-operators/${formViaje.vehicle_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_name: formViaje.vehicle_name, operator_name: formViaje.conductor, telefono: formViaje.telefono || '' }),
      });
      setOperadores(prev => ({ ...prev, [formViaje.vehicle_id]: { nombre: formViaje.conductor, telefono: formViaje.telefono || '' } }));
    }
    if (formViaje.telefono) {
      const tel = formViaje.telefono.replace(/[^0-9+]/g, '');
      const inicio = formViaje.fecha_inicio ? new Date(formViaje.fecha_inicio + (formViaje.fecha_inicio.includes('Z') ? '' : 'Z')).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'Por definir';
      const fin = formViaje.fecha_fin ? new Date(formViaje.fecha_fin + (formViaje.fecha_fin.includes('Z') ? '' : 'Z')).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'Por definir';
      const msg = encodeURIComponent(`*Saludos ${formViaje.conductor || 'Operador'}.*\nSe le ha asignado un nuevo viaje, a continuación los detalles:\n\n*Nombre de viaje:* ${formViaje.origen || '?'} --> ${formViaje.destino || '?'}\n\n*Unidad:* ${formViaje.vehicle_name || formViaje.vehicle_id}\n*Remolque:* ${formViaje.remolque || 'Sin remolque'}\n*Hora de salida:* ${inicio}\n*Hora de descarga:* ${fin}\n\n*Instrucciones Adicionales:* ${formViaje.notas || 'Ninguna'}\n\n*Link de ruta:* https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(formViaje.origen || '')}&destination=${encodeURIComponent(formViaje.destino || '')}\n\n=========================================`);
      window.open(`https://wa.me/${tel}?text=${msg}`, '_blank');
    }
    setFormViaje({ vehicle_id: '', vehicle_name: '', origen: '', destino: '', conductor: '', telefono: '', fecha_inicio: '', fecha_fin: '', notas: '' });
    loadAll();
  };

  const actualizarEstadoViaje = async (id, estado) => {
    await fetch(`${apiUrl}/viajes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    loadAll();
  };

  const eliminarViaje = async (id) => {
    if (confirm('Eliminar este viaje?')) {
      await fetch(`${apiUrl}/viajes/${id}`, { method: 'DELETE' });
      loadAll();
    }
  };

  const marcarAlertaLeida = async (id) => {
    await fetch(`${apiUrl}/alertas/${id}/leer`, { method: 'PUT' });
    loadAll();
  };

  const eliminarAlerta = async (id) => {
    await fetch(`${apiUrl}/alertas/${id}`, { method: 'DELETE' });
    loadAll();
  };

  const limpiarAlertas = async () => {
    if (!confirm('¿Limpiar todas las alertas? Esta acción no se puede deshacer.')) return;
    await fetch(`${apiUrl}/alertas`, { method: 'DELETE' });
    loadAll();
  };

  const crearRemolque = async () => {
    if (!formRemolque.numero.trim()) return;
    const isEditing = !!remolqueEditando;
    const res = await fetch(`${apiUrl}/remolques${isEditing ? `/${remolqueEditando.id}` : ''}`, {
      method: isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formRemolque),
    });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }
    setShowRemolqueModal(false);
    setRemolqueEditando(null);
    setFormRemolque({ numero: '', categoria: 'Caja Seca' });
    loadAll();
  };

  const cerrarRemolqueModal = () => {
    setShowRemolqueModal(false);
    setRemolqueEditando(null);
    setFormRemolque({ numero: '', categoria: 'Caja Seca' });
  };

  const eliminarRemolque = async (id) => {
    if (confirm('Eliminar este remolque?')) {
      await fetch(`${apiUrl}/remolques/${id}`, { method: 'DELETE' });
      loadAll();
    }
  };

  const asignarRemolque = async (remolqueId, vehicleId, vehicleName) => {
    await fetch(`${apiUrl}/remolques/${remolqueId}/asignar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicle_id: vehicleId, vehicle_name: vehicleName }),
    });
    loadAll();
  };

  const desasignarRemolque = async (remolqueId) => {
    await fetch(`${apiUrl}/remolques/${remolqueId}/desasignar`, { method: 'POST' });
    loadAll();
  };

  const cargarHistorialRemolque = async (remolqueId) => {
    setSelectedRemolque(remolqueId);
    const res = await fetch(`${apiUrl}/remolques/${remolqueId}/historial`);
    setHistorialRemolque(await res.json());
  };

  const resetNotaForm = (tab = notasTab) => {
    setNuevoComentario({
      vehicle_id: '',
      vehicle_name: '',
      tipo: tab === 'incidencias' ? 'incidencia' : 'bitacora',
      titulo: '',
      contenido: '',
      estatus: tab === 'incidencias' ? 'alta' : '',
      remolque: '',
      grupo: '',
      origen: '',
      destino: '',
    });
  };

  const obtenerRemolqueAsignadoUnidad = (vehicleId, vehicleName = '') => {
    const unidad = String(vehicleName || vehiculos.find(v => String(v.id) === String(vehicleId))?.name || '').toLowerCase();
    const remolqueAsignado = remolques.find(r => String(r.vehicle_id_asignado || '') === String(vehicleId) || String(r.unidad_asignada || '').toLowerCase() === unidad);
    return remolqueAsignado?.numero || '';
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
    const remolqueAsignado = remolques.find(r => String(r.vehicle_id_asignado || '') === String(vehicleId) || String(r.unidad_asignada || '').toLowerCase() === unidad.toLowerCase());
    const operadorAsignado = operadores[String(vehicleId)]?.nombre || '';
    const viajeOperador = viajeMasReciente?.conductor || '';

    const base = seguimientoExistente || viajeMasReciente || null;
    setFormSeguimiento({
      unidad,
      operador: operadorAsignado || base?.operador || viajeOperador || '',
      remolque: remolqueAsignado?.numero || base?.remolque || viajeMasReciente?.remolque || '',
      ruta: viajeMasReciente?.ruta || base?.ruta || [viajeMasReciente?.origen || base?.origen, viajeMasReciente?.destino || base?.destino].filter(Boolean).join(' - '),
      origen: viajeMasReciente?.origen || base?.origen || '',
      destino: viajeMasReciente?.destino || base?.destino || '',
      cita_carga: fechaValor(viajeMasReciente?.fecha_inicio || base?.cita_carga || base?.fecha_inicio || ''),
      cita_descarga: fechaValor(viajeMasReciente?.fecha_fin || base?.cita_descarga || base?.fecha_fin || ''),
      hora_llegada: base?.hora_llegada || '',
      hora_liberacion: base?.hora_liberacion || '',
      estatus: viajeMasReciente?.estado || base?.estatus || 'Programado',
      comentarios_cliente: base?.comentarios_cliente || '',
      comentarios_monitoreo: base?.comentarios_monitoreo || base?.notas || '',
      grupo: base?.grupo || '',
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

  const abrirActualizarSeguimiento = () => {
    setSeguimientoModalError('');
    setSeguimientoModalNota('');
    setSeguimientoModalUnidadId('');
    setShowSeguimientoUpdateModal(true);
  };

  const seleccionarUnidadSeguimiento = (unidadId) => {
    setSeguimientoModalUnidadId(unidadId);
    setSeguimientoModalError('');
    const unidad = todasLasUnidades.find(v => String(v.id) === String(unidadId));
    const fila = obtenerSeguimientoUnidad(unidad?.name || unidad?.nombre || '');
    setSeguimientoModalNota(fila?.comentarios_monitoreo || fila?.comentarios_cliente || '');
  };

  const guardarActualizacionSeguimiento = async () => {
    const unidad = todasLasUnidades.find(v => String(v.id) === String(seguimientoModalUnidadId));
    if (!unidad) {
      setSeguimientoModalError('Selecciona una unidad');
      return;
    }

    const nombreUnidad = unidad.name || unidad.nombre || '';
    const fila = obtenerSeguimientoUnidad(nombreUnidad);
    const notaNueva = seguimientoModalNota.trim();
    if (!notaNueva) {
      setSeguimientoModalError('Escribe una observación');
      return;
    }

    setSeguimientoModalSaving(true);
    setSeguimientoModalError('');
    try {
      if (fila) {
        await fetch(`${apiUrl}/seguimiento/${fila.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...fila, comentarios_monitoreo: notaNueva }),
        });
      } else {
        await fetch(`${apiUrl}/seguimiento`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unidad: nombreUnidad,
            operador: operadores[String(unidad.id)]?.nombre || '',
            remolque: '',
            ruta: '',
            origen: '',
            destino: '',
            cita_carga: '',
            cita_descarga: '',
            hora_llegada: '',
            hora_liberacion: '',
            estatus: unidad.estatus || 'Disponible',
            comentarios_cliente: '',
            comentarios_monitoreo: notaNueva,
            grupo: '',
          }),
        });
      }
      setSeguimientoModalNota('');
      loadAll();
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

  const guardarSeguimiento = async (e) => {
    e.preventDefault();
    if (!formSeguimiento.unidad.trim()) return;
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
      estatus: formSeguimiento.estatus,
      comentarios_cliente: formSeguimiento.comentarios_cliente.trim(),
      comentarios_monitoreo: formSeguimiento.comentarios_monitoreo.trim(),
      grupo: formSeguimiento.grupo.trim(),
    };
    const url = seguimientoEditando?.id ? `${apiUrl}/seguimiento/${seguimientoEditando.id}` : `${apiUrl}/seguimiento`;
    const method = seguimientoEditando?.id ? 'PUT' : 'POST';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    limpiarSeguimientoForm();
    setSeguimientoHistorial([]);
    setSelectedSeguimiento(null);
    loadAll();
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
      estatus: row.estatus || 'Disponible',
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
    await fetch(`${apiUrl}/seguimiento/${id}`, { method: 'DELETE' });
    if (selectedSeguimiento?.id === id) {
      setSelectedSeguimiento(null);
      setSeguimientoHistorial([]);
    }
    loadAll();
  };

  const crearComentario = async (e) => {
    e.preventDefault();
    await fetch(`${apiUrl}/comentarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoComentario),
    });
    resetNotaForm();
    loadAll();
  };

  const eliminarComentario = async (id) => {
    if (confirm('Eliminar este comentario?')) {
      await fetch(`${apiUrl}/comentarios/${id}`, { method: 'DELETE' });
      loadAll();
    }
  };

  const guardarUnidad = async (e) => {
    e.preventDefault();
    if (!formUnidad.nombre.trim()) return;
    if (editUnidad) {
      await fetch(`${apiUrl}/unidades/${editUnidad.localId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formUnidad),
      });
    } else {
      await fetch(`${apiUrl}/unidades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formUnidad),
      });
    }
    setShowUnidadModal(false);
    setEditUnidad(null);
    setFormUnidad({ nombre: '', estatus: 'Activa', notas: '', tipo: 'manual', samsara_id: '' });
    loadAll();
  };

  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const selectMonitoreoVehicle = async (v) => {
    setMonitoreoSelectedId(v.id);
    setMonitoreoEta(null);
    setMonitoreoGeofenceMatch(null);
    if (v.isLocal) { setMonitoreoRouteHistory([]); return; }
    try {
      const route = await fetch(`${apiUrl}/route-history/last?vehicle_id=${v.id}&hours=24`).then(r => r.json());
      setMonitoreoRouteHistory(Array.isArray(route) ? route : []);
    } catch (e) { setMonitoreoRouteHistory([]); }
    const fullVehicle = vehiculos.find(vh => String(vh.id) === String(v.id)) || v;
    const viaje = viajesActivos.find(vj => String(vj.vehicle_id) === String(v.id) || vj.vehicle_name === v.name || vj.vehicle_name === fullVehicle?.name);
    if (viaje && fullVehicle?.location) {
      const destino = viaje.destino || viaje.seg_destino || '';
      if (destino) {
        try {
          const eta = await calcularRuta(destino, fullVehicle.location.latitude, fullVehicle.location.longitude);
          setMonitoreoEta(eta);
          if (eta?.destLat && eta?.destLon) {
            const match = allGeofences.find(g => g.activa && haversineKm(eta.destLat, eta.destLon, g.latitud, g.longitud) * 1000 <= g.radio_metros);
            setMonitoreoGeofenceMatch(match || null);
          }
        } catch (e) { setMonitoreoEta(null); }
      }
    }
  };

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
      estatus: filaSeguimiento?.estatus || viajeActivo?.estado || 'Disponible',
      comentarios_cliente: filaSeguimiento?.comentarios_cliente || '',
      comentarios_monitoreo: comentarioRapido.contenido.trim(),
      grupo: filaSeguimiento?.grupo || '',
    };

    if (filaSeguimiento?.id) {
      await fetch(`${apiUrl}/seguimiento/${filaSeguimiento.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadSeguimiento),
      });
    } else {
      await fetch(`${apiUrl}/seguimiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadSeguimiento),
      });
    }

    await fetch(`${apiUrl}/comentarios`, {
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
    loadAll();
  };

  const guardarOperador = async (vehicleId, vehicleName, nombre, telefono) => {
    await fetch(`${apiUrl}/vehicle-operators/${vehicleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicle_name: vehicleName, operator_name: nombre, telefono }),
    });
    setOperadores(prev => ({ ...prev, [vehicleId]: { nombre, telefono } }));
  };

  const crearGeofence = async (e) => {
    e.preventDefault();
    await fetch(`${apiUrl}/geofences`, {
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
      await fetch(`${apiUrl}/geofences/${id}`, { method: 'DELETE' });
      loadAll();
    }
  };

  const toggleGeofence = async (id, activa) => {
    await fetch(`${apiUrl}/geofences/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activa: activa ? 0 : 1 }),
    });
    loadAll();
  };

  const toggleGeofencesBulk = async (ids, activa) => {
    if (!ids.length) return;
    await fetch(`${apiUrl}/geofences/toggle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, activa }),
    });
    loadAll();
  };

  const toggleGeofencesByCategory = async (categoria, activa) => {
    const ids = geofences.filter(g => g.categoria === categoria).map(g => g.id);
    if (ids.length > 0) await toggleGeofencesBulk(ids, activa);
  };

  const ejecutarCheckGeofences = async () => {
    await fetch(`${apiUrl}/check-geofences`, { method: 'POST' });
    loadAll();
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
    await fetch(`${apiUrl}/check-fuel`, { method: 'POST' });
    loadAll();
  };

  const calcularRuta = async (destino, latOrigen, lonOrigen) => {
    if (!destino.trim() || !latOrigen || !lonOrigen) return null;
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destino)}&limit=1&accept-language=es`, {
        headers: { 'User-Agent': 'GERS-Plataforma/1.0' }
      });
      const geoData = await geoRes.json();
      if (!geoData.length) return null;
      const destLat = parseFloat(geoData[0].lat);
      const destLon = parseFloat(geoData[0].lon);
      const routeRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${lonOrigen},${latOrigen};${destLon},${destLat}?overview=false`);
      const routeData = await routeRes.json();
      if (routeData.code === 'Ok' && routeData.routes.length) {
        const route = routeData.routes[0];
        const factorTracto = 1.35;
        const duracionTruck = route.duration * factorTracto;
        const horas = Math.floor(duracionTruck / 3600);
        const minutos = Math.round((duracionTruck % 3600) / 60);
        const distanciaKm = (route.distance / 1000).toFixed(1);
        const llegada = new Date(Date.now() + duracionTruck * 1000);
        return {
          duracion: `${horas > 0 ? horas + 'h ' : ''}${minutos}min`,
          distancia: `${distanciaKm} km`,
          distanciaMetros: route.distance,
          duracionSegundos: duracionTruck,
          horaLlegada: llegada.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
          fechaLlegada: llegada.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
          horaLlegadaISO: llegada.toISOString().slice(0, 16),
          destinoNombre: geoData[0].display_name.split(',').slice(0, 3).join(','),
          destLat, destLon
        };
      }
    } catch (e) {
      console.error('Error calculando ruta:', e);
    }
    return null;
  };

  const calcularETA = async (destino, vehicle) => {
    if (!destino.trim() || !vehicle?.location) return;
    setCalculandoEta(true);
    const eta = await calcularRuta(destino, vehicle.location.latitude, vehicle.location.longitude);
    if (eta) {
      setEtaData(eta);
      setComentarioRapido(prev => ({ ...prev, titulo: `ETA ${eta.fechaLlegada || eta.horaLlegada} | ${eta.distancia}` }));
    } else {
      setEtaData(null);
    }
    setCalculandoEta(false);
  };

  const calcularViajeETA = async (destino, vehicle) => {
    if (!destino.trim() || !vehicle?.location) { setViajeEta(null); setViajeEtaError(vehicle?.location ? '' : 'Vehiculo sin ubicacion GPS'); return; }
    setCalculandoViajeEta(true);
    setViajeEtaError('');
    const eta = await calcularRuta(destino, vehicle.location.latitude, vehicle.location.longitude);
    setViajeEta(eta);
    if (!eta) setViajeEtaError('No se pudo calcular la ruta. Intenta con una ciudad o direccion mas especifica.');
    setCalculandoViajeEta(false);
  };

  const cargarHistorialRuta = async () => {
    if (!routeVehicleId || !routeDate) return;
    setRouteLoading(true);
    try {
      const res = await fetch(`${apiUrl}/route-history?vehicle_id=${routeVehicleId}&fecha_inicio=${routeDate}&fecha_fin=${routeDate}&limit=5000`);
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
      const res = await fetch(`${apiUrl}/route-history/dates?vehicle_id=${vid}`);
      const data = await res.json();
      setRouteDates(data);
    } catch (e) { console.error(e); }
  };

  const cargarReporte = async () => {
    const params = new URLSearchParams();
    if (filtroReporte.fecha_inicio) params.append('fecha_inicio', filtroReporte.fecha_inicio);
    if (filtroReporte.fecha_fin) params.append('fecha_fin', filtroReporte.fecha_fin);
    if (filtroReporte.vehicle_id) params.append('vehicle_id', filtroReporte.vehicle_id);
    const endpoint = filtroReporte.tipo === 'pendientes-completados'
      ? 'reportes/pendientes-completados'
      : filtroReporte.tipo === 'bitacora' || filtroReporte.tipo === 'incidencias'
        ? `reportes/notas?tipo=${encodeURIComponent(filtroReporte.tipo)}&${params}`
        : `reportes/${filtroReporte.tipo}?${params}`;
    const res = await fetch(`${apiUrl}/${endpoint}`);
    const data = await res.json();
    setReportes(data);
  };

  const abrirReporteDirecto = async (tipo) => {
    setFiltroReporte({ tipo, fecha_inicio: '', fecha_fin: '', vehicle_id: '' });
    setActiveTab('reportes');
    const endpoint = tipo === 'pendientes-completados'
      ? `${apiUrl}/reportes/pendientes-completados`
      : tipo === 'bitacora' || tipo === 'incidencias'
        ? `${apiUrl}/reportes/notas?tipo=${encodeURIComponent(tipo)}`
        : `${apiUrl}/reportes/${tipo}`;
    const data = await fetch(endpoint).then(r => r.json()).catch(() => []);
    setReportes(Array.isArray(data) ? data : []);
  };

  const generarPDF = () => {
    if (!reportes.length) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    const tipoLabel = { pendientes: 'Pendientes', 'pendientes-completados': 'Pendientes completados', viajes: 'Viajes', seguimiento: 'Seguimiento / Comentarios', bitacora: 'Bitácora', incidencias: 'Incidencias' };
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
    await fetch(`${apiUrl}/risk-zones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newZone, lat: parseFloat(newZone.lat), lng: parseFloat(newZone.lng), radius: parseInt(newZone.radius) }),
    });
    setShowZoneModal(false);
    setNewZone({ name: '', description: '', severity: 'high', lat: '', lng: '', radius: 5000 });
    loadAll();
  };

  const eliminarZonaRiesgo = async (id) => {
    if (!confirm('¿Eliminar esta zona de riesgo?')) return;
    await fetch(`${apiUrl}/risk-zones/${id}`, { method: 'DELETE' });
    loadAll();
  };

  const vehiculosOnline = vehiculos.filter(v => v.isOnline);
  const vehiculosOffline = vehiculos.filter(v => !v.isOnline);
  const alertasNoLeidas = alertas.filter(a => !a.leida);
  const vehiculosEnMovimiento = useMemo(() => vehiculos.filter(v => v.location?.speed > 1), [vehiculos]);

  const todasLasUnidades = useMemo(() => {
    const samsaraMapped = vehiculos.map(v => ({
      ...v,
      isLocal: false,
      nombre: v.name,
      estatus: v.isOnline ? (v.location?.speed > 1 ? 'En Movimiento' : 'Detenida') : 'Sin Señal',
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

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0a0a0a', color: '#00ff41' }}>
        <div>Cargando autenticación...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'radial-gradient(circle at top, #102010, #0a0a0a 60%)', color: '#e5e7eb', padding: '1.5rem' }}>
        <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: '420px', background: '#111111', border: '1px solid #1a3d1a', borderRadius: '16px', padding: '2rem', boxShadow: '0 0 30px rgba(0,255,65,0.08)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#00ff41', marginBottom: '0.5rem' }}>GERS</div>
          <div style={{ opacity: 0.75, marginBottom: '1.5rem' }}>Acceso al sistema</div>
          <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', color: '#6a9b6a' }}>Usuario</label>
          <input value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} style={{ width: '100%', marginBottom: '1rem', padding: '0.75rem', borderRadius: '10px', border: '1px solid #1a3d1a', background: '#0d0d0d', color: '#fff' }} />
          <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', color: '#6a9b6a' }}>Contraseña</label>
          <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} style={{ width: '100%', marginBottom: '1rem', padding: '0.75rem', borderRadius: '10px', border: '1px solid #1a3d1a', background: '#0d0d0d', color: '#fff' }} />
          {loginError && <div style={{ color: '#f87171', marginBottom: '1rem', fontSize: '0.9rem' }}>{loginError}</div>}
          <button type="submit" style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid #00ff41', background: '#00ff41', color: '#0a0a0a', fontWeight: 700, cursor: 'pointer' }}>Entrar</button>
          <div style={{ marginTop: '1rem', fontSize: '0.78rem', opacity: 0.55 }}>Usuario inicial: admin / admin123</div>
        </form>
      </div>
    );
  }

  const menuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'monitoreo', label: 'Monitoreo', icon: '🗺️' },
    { key: 'seguimiento', label: 'Seguimiento', icon: '📊' },
    { key: 'notas', label: 'Notas', icon: '📝' },
    { key: 'operaciones', label: 'Pendientes', icon: '📋' },
    { key: 'viajes', label: 'Viajes', icon: '🚚' },
    { key: 'citas', label: 'Citas', icon: '📅' },
    { key: 'geocercas', label: 'Geocercas', icon: '⭕' },
    { key: 'unidades', label: 'Unidades', icon: '🚛', badge: todasLasUnidades.length },
    { key: 'alertas', label: 'Alertas', icon: '🔔', badge: alertasNoLeidas.length },
    { key: 'operadores', label: 'Operadores', icon: '👤' },
    { key: 'remolques', label: 'Remolques', icon: '🚛' },
    { key: 'rutas', label: 'Historial Rutas', icon: '🛤️' },
    { key: 'reportes', label: 'Reportes', icon: '📈' },
    ...(currentUser?.rol === 'admin' ? [{ key: 'usuarios', label: 'Usuarios', icon: '🔐' }] : []),
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
        {!sidebarCollapsed && currentUser && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #1a3d1a' }}>
            <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: '0.75rem' }}>{currentUser.nombre || currentUser.username}</div>
            <button onClick={handleLogout} style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #00ff41', background: 'transparent', color: '#00ff41', cursor: 'pointer' }}>Salir</button>
          </div>
        )}
      </aside>

      <main style={{ ...s.main, overflow: activeTab === 'dashboard' ? 'hidden' : 'auto' }}>
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 3rem)', margin: '-1.5rem -2rem', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '0.75rem 1.5rem', background: '#111111', borderBottom: '1px solid #1a3d1a', flexShrink: 0 }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e0e0e0', marginRight: '0.5rem' }}>GERS</span>
              {[
                { label: 'Unidades', value: vehiculos.length, icon: '🚛', color: '#3b82f6' },
                { label: 'Activas', value: vehiculosOnline.filter(v => v.location?.speed > 1).length, dot: '#4ade80' },
                { label: 'Detenidas', value: vehiculosOnline.filter(v => v.location?.speed <= 1).length, dot: '#60a5fa' },
                { label: 'Sin Señal', value: vehiculosOffline.length, dot: '#facc15' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  {item.icon && <span>{item.icon}</span>}
                  {item.dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.dot, flexShrink: 0 }} />}
                  <span style={{ fontWeight: 700, fontSize: '16px', color: '#e0e0e0' }}>{item.value}</span>
                  <span style={{ color: '#6a9b6a', fontSize: '11px' }}>{item.label}</span>
                </div>
              ))}
              <div style={{ width: 1, height: 30, background: '#1a3d1a' }} />
              {[
                { label: 'Alertas', value: alertasNoLeidas.length, color: '#ef4444' },
                { label: 'Diesel Bajo', value: vehiculos.filter(v => v.fuelLevelPercent !== null && v.fuelLevelPercent < 0.25).length, color: '#f59e0b' },
                { label: 'Viajes', value: viajes.filter(v => !['completado', 'cancelado'].includes(String(v.estado || '').toLowerCase())).length, color: '#6366f1' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: '16px', color: '#e0e0e0' }}>{item.value}</span>
                  <span style={{ color: '#6a9b6a', fontSize: '11px' }}>{item.label}</span>
                </div>
              ))}
              <div style={{ flex: 1 }} />
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: '16px', color: '#e0e0e0' }}>{customRiskZones.length}</span>
                <span style={{ color: '#6a9b6a', fontSize: '11px' }}>Zonas</span>
              </span>
              <button onClick={() => { setPlacingZone(true); }} style={{ padding: '6px 14px', background: placingZone ? '#ef4444' : 'transparent', color: placingZone ? '#fff' : '#f87171', border: `1px solid #f87171`, borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                {placingZone ? '✕ Cancelar' : '➕ Zona'}
              </button>
              <button onClick={loadAll} style={{ padding: '6px 14px', background: '#00ff41', color: '#0d0d0d', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Actualizar</button>
              <button onClick={() => { setTurnoSummary(null); setShowTurnoModal(true); }} style={{ padding: '6px 14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Entregar turno</button>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              <div style={{ width: '320px', background: '#111111', borderRight: '1px solid #1a3d1a', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #1a3d1a' }}>
                  {[
                    { key: 'unidades', label: 'Unidades', icon: '🚛' },
                    { key: 'alertas', label: 'Alertas', icon: '🔔' },
                    { key: 'viajes', label: 'Viajes', icon: '🚚' },
                    { key: 'zonas', label: 'Zonas', icon: '⚠️' },
                  ].map(tab => (
                    <button key={tab.key} onClick={() => setDashTab(tab.key)} style={{
                      flex: 1, padding: '10px', background: 'none', border: 'none', color: dashTab === tab.key ? '#00ff41' : '#6a9b6a',
                      cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                      borderBottom: dashTab === tab.key ? '2px solid #00ff41' : '2px solid transparent', transition: 'all 0.2s'
                    }}>
                      <span>{tab.icon}</span> {tab.label}
                    </button>
                  ))}
                </div>

                {dashTab === 'unidades' && (
                  <>
                    <div style={{ padding: '12px', position: 'relative' }}>
                      <input value={dashSearch} onChange={e => setDashSearch(e.target.value)} placeholder="Buscar unidad..."
                        style={{ width: '100%', padding: '10px 12px 10px 36px', background: '#1a1a1a', border: '1px solid #1a3d1a', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px', outline: 'none' }} />
                      <span style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', color: '#6a9b6a', fontSize: '13px' }}>🔍</span>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
                      {vehiculos.filter(v => !dashSearch || v.name.toLowerCase().includes(dashSearch.toLowerCase()) || (operadores[String(v.id)]?.nombre || '').toLowerCase().includes(dashSearch.toLowerCase())).map(v => {
                        const isMoving = v.location?.speed > 1;
                        const statusColor = v.isOnline ? (isMoving ? '#4ade80' : '#60a5fa') : '#facc15';
                        const statusLabel = v.isOnline ? (isMoving ? 'Movimiento' : 'Detenida') : 'Sin señal';

  return (
                          <div key={v.id} onClick={() => setSelectedVehicle(v)} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '12px', marginBottom: '8px', cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '10px' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#00ff41'; e.currentTarget.style.transform = 'translateX(2px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'none'; }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, background: `${statusColor}15`, color: statusColor }}>🚛</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '13px', color: '#e0e0e0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.name}</div>
                              <div style={{ fontSize: '11px', color: '#6a9b6a', display: 'flex', gap: '8px', marginTop: 2 }}>
                                <span>👤 {operadores[String(v.id)]?.nombre || 'Sin op.'}</span>
                                {v.location && <span>🏎 {Math.round(v.location.speed || 0)} km/h</span>}
                              </div>
                            </div>
                            <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', flexShrink: 0, background: `${statusColor}15`, color: statusColor }}>{statusLabel}</span>
                          </div>
                        );
                    })}
                    </div>
                  </>
                )}

                {dashTab === 'zonas' && (
                  <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <button onClick={() => { setPlacingZone(true); }} style={{ width: '100%', padding: '10px', background: placingZone ? '#7f1d1d' : 'transparent', color: '#f87171', border: '1px dashed #f87171', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                        {placingZone ? '✕ Cancelar' : '➕ Agregar zona (clic en mapa)'}
                      </button>
                    </div>
                    <div style={{ fontSize: '11px', color: '#6a9b6a', marginBottom: '8px' }}>Zonas de riesgo de México (predefinidas): {defaultZonesList.length}</div>
                    {defaultZonesList.map((z, i) => {
                      const zColor = { critical: '#f87171', high: '#fb923c', medium: '#facc15' }[z.severity] || '#fb923c';
                      const zLabel = { critical: 'Crítica', high: 'Alta', medium: 'Media' }[z.severity];
                      return (
                        <div key={i} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px', marginBottom: '6px', borderLeft: `3px solid ${zColor}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, fontSize: '12px', color: '#e0e0e0' }}>{z.name}</span>
                            <span style={{ padding: '2px 6px', borderRadius: 10, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: `${zColor}15`, color: zColor }}>{zLabel}</span>
                          </div>
                        </div>
                      );
                    })}
                    {customRiskZones.length > 0 && (
                      <>
                        <div style={{ fontSize: '11px', color: '#6a9b6a', marginTop: '12px', marginBottom: '8px' }}>Zonas propias: {customRiskZones.length}</div>
                        {customRiskZones.map(z => {
                          const zColor = { critical: '#f87171', high: '#fb923c', medium: '#facc15' }[z.severity] || '#fb923c';
                           const zLabel = { critical: 'Crítica', high: 'Alta', medium: 'Media' }[z.severity];
                          return (
                            <div key={z.id} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px', marginBottom: '6px', borderLeft: `3px solid ${zColor}` }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, fontSize: '12px', color: '#e0e0e0' }}>{z.name}</span>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <span style={{ padding: '2px 6px', borderRadius: 10, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: `${zColor}15`, color: zColor }}>{zLabel}</span>
                                  <button onClick={() => eliminarZonaRiesgo(z.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '11px', opacity: 0.7 }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.7}>✕</button>
                                </div>
                              </div>
                              <div style={{ fontSize: '10px', color: '#4a8a4a', marginTop: 2 }}>{z.description || 'Sin descripción'}</div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}

                {dashTab === 'alertas' && (
                  <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                    {alertasNoLeidas.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6a9b6a' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '8px', opacity: 0.3 }}>🔔</div>
                        <p style={{ fontSize: '13px' }}>No hay alertas sin leer</p>
                      </div>
                    ) : alertasNoLeidas.slice(0, 50).map(a => {
                      const borderColor = a.tipo === 'geocerca' ? '#8b5cf6' : a.tipo === 'combustible_bajo' ? '#f59e0b' : '#3b82f6';
                      return (
                        <div key={a.id} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '12px', marginBottom: '8px', borderLeft: `3px solid ${borderColor}` }}>
                          <div style={{ fontSize: '12px', fontWeight: 500, color: '#e0e0e0' }}>
                            <span style={{ marginRight: '6px' }}>{a.tipo === 'geocerca' ? '⭕' : a.tipo === 'combustible_bajo' ? '⛽' : '⚠️'}</span>
                            {a.vehicle_name || a.vehicle_id}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6a9b6a', marginTop: 4 }}>{a.mensaje}</div>
                          <div style={{ fontSize: '10px', color: '#4a8a4a', marginTop: 4 }}>{parseFecha(a.timestamp)?.toLocaleTimeString()}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {dashTab === 'viajes' && (
                  <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                    {ordenarViajesUnidad(viajes).filter(v => !['completado', 'cancelado'].includes(String(v.estado || '').toLowerCase())).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6a9b6a' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '8px', opacity: 0.3 }}>🚚</div>
                        <p style={{ fontSize: '13px' }}>No hay viajes activos</p>
                      </div>
                    ) : ordenarViajesUnidad(viajes).filter(v => !['completado', 'cancelado'].includes(String(v.estado || '').toLowerCase())).map((v, idx) => {
                      const viajeColor = estadoColors[String(v.estado || '').toLowerCase()] || '#6a9b6a';
                      const viajeLabel = String(v.estado || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                      const seqLabel = idx === 0 ? 'Actual' : idx === 1 ? 'Siguiente' : `#${idx + 1}`;
                      return (
                        <div key={v.id} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '12px', marginBottom: '8px', borderLeft: `3px solid ${viajeColor}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, fontSize: '13px', color: '#e0e0e0' }}>{seqLabel} · {v.vehicle_name || v.vehicle_id}</span>
                            <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: `${viajeColor}15`, color: viajeColor }}>{viajeLabel}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#6a9b6a' }}>📍 {v.origen || '?'} → {v.destino || '?'}</div>
                          <div style={{ fontSize: '11px', color: '#4a8a4a', marginTop: 2 }}>👤 {v.conductor || 'Sin asignar'}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ flex: 1, position: 'relative' }}>
                {placingZone && <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', color: '#e0e0e0', zIndex: 1000, border: '1px solid #f87171', pointerEvents: 'none' }}>
                  🎯 Haz clic en el mapa para colocar la zona de riesgo
                </div>}
                <MapaUnidades vehiculos={vehiculos} geofences={geofences} customRiskZones={customRiskZones} placingZone={placingZone} onZonePlaced={handleZonePlaced} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'unidades' && (() => {
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
              (filtroUnidades === 'movimiento' && v.location?.speed > 1) ||
              (filtroUnidades === 'detenida' && v.isOnline && (v.location?.speed || 0) <= 1) ||
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
                  <div key={card.label} onClick={() => setFiltroUnidades(card.filter)}
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
                        <tr key={v.id} onClick={() => !v.isLocal && setSelectedVehicle(v)} style={{ cursor: v.isLocal ? 'default' : 'pointer' }}
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
                              <span style={s.badge(v.isOnline ? (v.location?.speed > 1 ? '#10b981' : '#3b82f6') : '#ef4444')}>
                                {v.isOnline ? (v.location?.speed > 1 ? 'Movimiento' : 'Detenida') : 'Sin señal'}
                              </span>
                            )}
                          </td>
                          <td style={{ ...s.td, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                            {v.isLocal ? (v.notas || <span style={{ color: '#4a8a4a' }}>Sin notas</span>) : (v.location?.location || <span style={{ color: '#4a8a4a' }}>Sin ubicación</span>)}
                          </td>
                          <td style={s.td}>
                            {v.isLocal ? <span style={{ color: '#6a9b6a' }}>-</span> : (v.location ? <span>{Math.round(v.location.speed || 0)} mph</span> : <span style={{ color: '#4a8a4a' }}>-</span>)}
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
                                <button onClick={async (e) => { e.stopPropagation(); if (confirm('Eliminar esta unidad?')) { await fetch(`${apiUrl}/unidades/${v.localId}`, { method: 'DELETE' }); loadAll(); } }}
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
        })()}

        {activeTab === 'monitoreo' && (() => {
          const selVehicle = monitoreoSelectedId ? vehiculos.find(v => String(v.id) === String(monitoreoSelectedId)) : null;
          const selViaje = monitoreoSelectedId ? viajesActivos.find(vj => String(vj.vehicle_id) === String(monitoreoSelectedId) || vj.vehicle_name === selVehicle?.name) : null;
          const selSeg = selViaje ? { destino: selViaje.destino || selViaje.seg_destino || '', remolque: selViaje.seg_remolque || '', origen: selViaje.origen || selViaje.seg_origen || '', estatus: selViaje.estado || selViaje.seg_estatus || '' } : {};
          const routeLen = monitoreoRouteHistory.length;
          const startPt = routeLen > 0 ? monitoreoRouteHistory[0] : null;
          const endPt = routeLen > 0 ? monitoreoRouteHistory[routeLen - 1] : null;
          let avancePct = 0;
          let avanceLabel = 'Sin datos';
          if (routeLen > 1 && monitoreoEta?.distanciaMetros) {
            let distanciaRecorridaM = 0;
            for (let i = 1; i < routeLen; i++) {
              distanciaRecorridaM += haversineKm(
                monitoreoRouteHistory[i - 1].latitude, monitoreoRouteHistory[i - 1].longitude,
                monitoreoRouteHistory[i].latitude, monitoreoRouteHistory[i].longitude
              ) * 1000;
            }
            avancePct = Math.min(99, Math.round((distanciaRecorridaM / monitoreoEta.distanciaMetros) * 100));
            const recorridosKm = (distanciaRecorridaM / 1000).toFixed(1);
            const totalKm = (monitoreoEta.distanciaMetros / 1000).toFixed(1);
            avanceLabel = `${avancePct}% · ${recorridosKm} / ${totalKm} km`;
          } else if (routeLen > 1) {
            let distanciaRecorridaM = 0;
            for (let i = 1; i < routeLen; i++) {
              distanciaRecorridaM += haversineKm(
                monitoreoRouteHistory[i - 1].latitude, monitoreoRouteHistory[i - 1].longitude,
                monitoreoRouteHistory[i].latitude, monitoreoRouteHistory[i].longitude
              ) * 1000;
            }
            avanceLabel = `${(distanciaRecorridaM / 1000).toFixed(1)} km · ${routeLen} puntos`;
          }
          let etaText = '-';
          let horaLlegada = '-';
          if (monitoreoEta) {
            etaText = monitoreoEta.duracion;
            horaLlegada = monitoreoEta.horaLlegada;
          } else if (selVehicle?.location && selSeg.destino) {
            const lastSeenMin = selVehicle.lastSeen != null ? selVehicle.lastSeen : 999;
            if (lastSeenMin < 15) {
              etaText = 'Calculando...';
              horaLlegada = '...';
            } else {
              etaText = 'Detenida';
              horaLlegada = 'N/A';
            }
          }
          const formatDate = (dt) => {
            if (!dt) return '-';
            try {
              const d = new Date(dt.endsWith('Z') ? dt : dt + 'Z');
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
                  {monitoreoSelectedId && <span style={{ color: '#00ff41' }}> · Ruta: {routeLen} puntos</span>}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {monitoreoSelectedId && <button onClick={() => { setMonitoreoSelectedId(null); setMonitoreoRouteHistory([]); setMonitoreoEta(null); }} style={{ ...s.button('#ef4444'), background: '#ef444420', border: '1px solid #ef4444', color: '#ef4444' }}>Limpiar Ruta</button>}
                <button onClick={loadAll} style={s.button()}>Actualizar</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ ...s.card, padding: 0, overflow: 'hidden', height: monitoreoSelectedId ? '45vh' : 'calc(100vh - 180px)', transition: 'height 0.3s ease' }}>
                  <MapaUnidades vehiculos={vehiculos} geofences={allGeofences} routeHistory={monitoreoRouteHistory} selectedVehicleId={monitoreoSelectedId} />
                </div>
                {monitoreoSelectedId && selVehicle && (
                  <div style={{ ...s.card, padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.3rem' }}>🚛</span>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1rem', color: '#00ff41' }}>{selVehicle.name}</h3>
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
                        <div style={{ fontSize: '0.8rem', color: '#e0e0e0', fontWeight: 600 }}>{selSeg.origen || (startPt?.location || '-')}</div>
                        {startPt && <div style={{ fontSize: '0.65rem', color: '#4a8a4a', marginTop: '0.15rem' }}>{formatDate(startPt.recorded_at)}</div>}
                      </div>
                      <div style={{ padding: '0.5rem', background: '#0d1a0d', borderRadius: '8px', border: '1px solid #1a3d1a' }}>
                        <div style={{ fontSize: '0.65rem', color: '#4a8a4a', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Destino</div>
                        <div style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: 600 }}>{selSeg.destino || '-'}</div>
                        {monitoreoGeofenceMatch && (
                          <div style={{ fontSize: '0.65rem', color: monitoreoGeofenceMatch.color || '#10b981', marginTop: '0.2rem', fontWeight: 600 }}>
                            📍 {monitoreoGeofenceMatch.nombre}
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '0.5rem', background: '#0d1a0d', borderRadius: '8px', border: '1px solid #1a3d1a' }}>
                        <div style={{ fontSize: '0.65rem', color: '#4a8a4a', marginBottom: '0.2rem', textTransform: 'uppercase' }}>ETA (+1h)</div>
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
                        {selVehicle.location && <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.15rem' }}>{Math.round((selVehicle.location.speed || 0) * 1.60934)} km/h · {endPt ? formatDate(endPt.recorded_at) : '-'}</div>}
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Avance en Ruta</span>
                        <span style={{ fontSize: '0.75rem', color: '#00ff41', fontWeight: 600 }}>{avanceLabel}</span>
                      </div>
                      <div style={{ width: '100%', height: '12px', background: '#1a1a1a', borderRadius: '6px', overflow: 'hidden', border: '1px solid #1a3d1a' }}>
                        <div style={{ width: `${avancePct}%`, height: '100%', background: avancePct >= 80 ? 'linear-gradient(90deg, #10b981, #00ff41)' : avancePct >= 40 ? 'linear-gradient(90deg, #f59e0b, #10b981)' : 'linear-gradient(90deg, #3b82f6, #10b981)', borderRadius: '6px', transition: 'width 0.5s ease', boxShadow: `0 0 10px ${avancePct >= 80 ? '#00ff4144' : '#3b82f644'}` }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.65rem', color: '#4a8a4a' }}>
                        <span>📍 Inicio: {startPt ? startPt.location || 'GPS' : '-'}</span>
                        <span>{routeLen > 1 ? `${Math.round(routeLen)} pts · ${formatDate(startPt?.recorded_at)} → ${formatDate(endPt?.recorded_at)}` : 'Sin historial hoy'}</span>
                        <span>🏁 Fin</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {viajesActivos.length > 0 && (
                  <div style={{ ...s.card, padding: '0.75rem' }}>
                    <h3 style={{ marginTop: 0, fontSize: '0.9rem', marginBottom: '0.75rem', color: '#f59e0b' }}>🚐 Viajes Activos ({viajesActivos.length})</h3>
                    {viajesActivos.slice(0, 8).map((vj) => {
                      const vehicleNow = vehiculos.find(v => String(v.id) === String(vj.vehicle_id) || v.name === vj.vehicle_name);
                      const hasLoc = vehicleNow?.location;
                      const destino = vj.destino || vj.seg_destino || '';
                      const remolque = vj.seg_remolque || '';
                      const estatus = vj.estado || vj.seg_estatus || '';
                      return (
                        <div key={vj.id} onClick={() => selectMonitoreoVehicle({ id: vj.vehicle_id, name: vj.vehicle_name })} style={{ padding: '0.5rem', borderBottom: '1px solid #1a1a1a', cursor: 'pointer', borderRadius: '6px', transition: 'background 0.15s', background: monitoreoSelectedId === String(vj.vehicle_id) ? '#00ff4110' : 'transparent' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#152015'}
                          onMouseLeave={e => e.currentTarget.style.background = monitoreoSelectedId === String(vj.vehicle_id) ? '#00ff4110' : 'transparent'}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#00ff41' }}>{vj.vehicle_name}</span>
                            {hasLoc && <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '8px', background: vehicleNow.isOnline ? '#003311' : '#3a1111', color: vehicleNow.isOnline ? '#00ff41' : '#ef4444', border: `1px solid ${vehicleNow.isOnline ? '#00ff4133' : '#ef444433'}` }}>{vehicleNow.isOnline ? 'Online' : 'Offline'}</span>}
                          </div>
                          {remolque && <div style={{ fontSize: '0.7rem', color: '#f59e0b' }}>🚛 {remolque}</div>}
                          {destino && <div style={{ fontSize: '0.7rem', color: '#60a5fa' }}>🏁 {destino}</div>}
                          <div style={{ marginTop: '0.2rem' }}>
                            <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '8px', background: '#1a1a1a', color: '#94a3b8', border: '1px solid #333' }}>{estatus}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ ...s.card, overflow: 'auto', flex: 1, padding: '0.75rem' }}>
                  <h3 style={{ marginTop: 0, fontSize: '0.9rem', marginBottom: '0.75rem' }}>Todas las Unidades ({vehiculos.length})</h3>
                  {vehiculos.map((v) => (
                    <div key={v.id} onClick={() => selectMonitoreoVehicle(v)} style={{ padding: '0.5rem', borderBottom: '1px solid #0d1f0d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.15s', borderRadius: '6px', paddingLeft: '6px', paddingRight: '6px', background: monitoreoSelectedId === v.id ? '#00ff4110' : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#152015'}
                      onMouseLeave={e => e.currentTarget.style.background = monitoreoSelectedId === v.id ? '#00ff4110' : 'transparent'}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.85rem', color: monitoreoSelectedId === v.id ? '#00ff41' : '#e0e0e0' }}>{v.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6a9b6a' }}>
                          {operadores[String(v.id)]?.nombre || 'Sin operador'}
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
          </div>
          );
        })()}

        {activeTab === 'notas' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Notas por Unidad</h2>
                <p style={{ margin: '0.25rem 0 0', color: '#6a9b6a', fontSize: '0.9rem' }}>Bitácora interna e incidencias separadas</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => abrirReporteDirecto('bitacora')} style={s.button('#3b82f6')}>Reporte bitácora</button>
                <button onClick={() => abrirReporteDirecto('incidencias')} style={s.button('#f59e0b')}>Reporte incidencias</button>
                <button onClick={loadAll} style={s.button()}>Actualizar</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <button onClick={() => { setNotasTab('bitacora'); resetNotaForm('bitacora'); }} style={notasTab === 'bitacora' ? s.button('#00ff41') : s.button('#6b7280')}>Bitácora interna</button>
              <button onClick={() => { setNotasTab('incidencias'); resetNotaForm('incidencias'); }} style={notasTab === 'incidencias' ? s.button('#00ff41') : s.button('#6b7280')}>Incidencias</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
              <div style={s.card}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>{notasTab === 'bitacora' ? 'Agregar Bitácora' : 'Agregar Incidencia'}</h3>
                <form onSubmit={crearComentario}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={s.label}>Unidad *</label>
                      <select style={s.select} value={nuevoComentario.vehicle_id} onChange={(e) => {
                        const v = vehiculos.find(vh => String(vh.id) === e.target.value);
                        const remolque = obtenerRemolqueAsignadoUnidad(e.target.value, v?.name || '');
                        setNuevoComentario({ ...nuevoComentario, vehicle_id: e.target.value, vehicle_name: v?.name || '', remolque });
                      }} required>
                        <option value="">Seleccionar unidad...</option>
                        {vehiculos.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={s.label}>Remolque</label>
                      <input style={s.input} placeholder="Núm. remolque" value={nuevoComentario.remolque} onChange={(e) => setNuevoComentario({ ...nuevoComentario, remolque: e.target.value })} />
                    </div>
                  </div>
                  {notasTab === 'bitacora' ? (
                    <>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <label style={s.label}>Nota *</label>
                        <textarea
                          style={{ ...s.input, minHeight: '110px', resize: 'vertical', fontFamily: 'inherit' }}
                          placeholder="Escribe una observación corta de la bitácora..."
                          value={nuevoComentario.contenido}
                          onChange={(e) => setNuevoComentario({ ...nuevoComentario, contenido: e.target.value, tipo: 'bitacora' })}
                          required
                        />
                      </div>
                      <button type="submit" style={{ ...s.button('#10b981'), width: '100%' }}>Guardar Bitácora</button>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div>
                          <label style={s.label}>Tipo de Incidencia</label>
                          <input style={s.input} placeholder="Ej: retraso, falla, cliente" value={nuevoComentario.titulo} onChange={(e) => setNuevoComentario({ ...nuevoComentario, titulo: e.target.value, tipo: 'incidencia' })} />
                        </div>
                        <div>
                          <label style={s.label}>Severidad</label>
                          <select style={s.select} value={nuevoComentario.estatus} onChange={(e) => setNuevoComentario({ ...nuevoComentario, estatus: e.target.value, tipo: 'incidencia' })}>
                            <option value="">Seleccionar...</option>
                            <option value="Baja">Baja</option>
                            <option value="Media">Media</option>
                            <option value="Alta">Alta</option>
                            <option value="Crítica">Crítica</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <label style={s.label}>Descripción *</label>
                        <textarea
                          style={{ ...s.input, minHeight: '110px', resize: 'vertical', fontFamily: 'inherit' }}
                          placeholder="Describe la incidencia..."
                          value={nuevoComentario.contenido}
                          onChange={(e) => setNuevoComentario({ ...nuevoComentario, contenido: e.target.value, tipo: 'incidencia' })}
                          required
                        />
                      </div>
                      <button type="submit" style={{ ...s.button('#10b981'), width: '100%' }}>Guardar Incidencia</button>
                    </>
                  )}
                </form>
              </div>

              <div style={{ ...s.card, overflow: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>{notasTab === 'bitacora' ? `Bitácora (${notasBitacora.length})` : `Incidencias (${notasIncidencias.length})`}</h3>
                  <select style={{ ...s.select, width: 'auto' }} value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)}>
                    <option value="">Todas las unidades</option>
                    {vehiculos.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                {(notasTab === 'bitacora' ? notasBitacora : notasIncidencias)
                  .filter(c => !vehicleFilter || c.vehicle_id === vehicleFilter)
                  .length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#4a8a4a' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{notasTab === 'bitacora' ? '📒' : '🚨'}</div>
                    <p>No hay {notasTab === 'bitacora' ? 'bitácoras' : 'incidencias'} registradas</p>
                  </div>
                ) : (
                  (notasTab === 'bitacora' ? notasBitacora : notasIncidencias)
                    .filter(c => !vehicleFilter || c.vehicle_id === vehicleFilter)
                    .map((c) => (
                      <div key={c.id} style={{ padding: '1rem', borderBottom: '1px solid #0d1f0d' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                            <strong style={{ fontSize: '0.9rem' }}>{c.vehicle_name || c.vehicle_id}</strong>
                            <span style={{ ...s.badge(
                              notasTab === 'bitacora' ? '#3b82f6' : (c.estatus === 'Crítica' ? '#ef4444' : c.estatus === 'Alta' ? '#f59e0b' : c.estatus === 'Media' ? '#3b82f6' : '#6b7280')
                            ), marginLeft: '0.5rem' }}>{notasTab === 'bitacora' ? 'Bitácora' : (c.estatus || 'Incidencia')}</span>
                          </div>
                          <button onClick={() => eliminarComentario(c.id)} style={{ ...s.button('#ef4444'), padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>X</button>
                        </div>
                        {notasTab === 'incidencias' && c.titulo && <div style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{c.titulo}</div>}
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                          {notasTab === 'incidencias' && c.estatus && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: '#003311', color: '#00ff41', border: '1px solid #00ff4133' }}>{c.estatus}</span>}
                          {((c.remolque || obtenerRemolqueAsignadoUnidad(c.vehicle_id, c.vehicle_name)) || '') && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: '#332200', color: '#f59e0b', border: '1px solid #f59e0b33' }}>🚛 {c.remolque || obtenerRemolqueAsignadoUnidad(c.vehicle_id, c.vehicle_name)}</span>}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#c0c0c0', marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>{c.contenido}</div>
                        <div style={{ fontSize: '0.75rem', color: '#4a8a4a', display: 'flex', gap: '1rem' }}>
                          <span>{c.autor}</span>
                          <span>{parseFecha(c.created_at)?.toLocaleString()}</span>
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
                <button onClick={async () => { await fetch(`${apiUrl}/check-geofences`, { method: 'POST' }); await loadAll(); }} style={s.button('#8b5cf6')}>Revisar geocercas</button>
                <button onClick={async () => { await fetch(`${apiUrl}/check-fuel`, { method: 'POST' }); await loadAll(); }} style={s.button('#f59e0b')}>Revisar combustible</button>
                <button onClick={loadAll} style={s.button()}>Actualizar</button>
                <button onClick={limpiarAlertas} style={s.button('#ef4444')}>Limpiar alertas</button>
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
                        <div style={{ fontSize: '0.75rem', color: '#4a8a4a', marginTop: '0.25rem' }}>{parseFecha(a.timestamp)?.toLocaleString()}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {!a.leida && <button onClick={() => marcarAlertaLeida(a.id)} style={s.button('#10b981')}>Resuelta</button>}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
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
                <button onClick={() => { setPendienteEditando(null); setFormPendiente({ titulo: '', descripcion: '', prioridad: 'media', asignado_a: '', turno: '', notas: '' }); setShowPendienteModal(true); }} style={s.button('#10b981')}>+ Nuevo Pendiente</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
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
                            onClick={async () => { 
                              const comentarios = await fetch(`${apiUrl}/pendientes/${p.id}/comentarios`).then(r => r.json()).catch(() => []);
                              setPendienteEditando({ ...p, comentarios }); 
                              setFormPendiente({ titulo: p.titulo, descripcion: p.descripcion || '', prioridad: p.prioridad || 'media', asignado_a: p.asignado_a || '', turno: p.turno || '', notas: p.notas || '' }); 
                              setShowPendienteModal(true); 
                            }}>
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
          </div>
        )}

        {activeTab === 'viajes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#e0e0e0' }}>Programación de Viajes</h2>
                  <p style={{ margin: '0.25rem 0 0', color: '#6a9b6a', fontSize: '0.9rem' }}>{viajes.length} viajes registrados · {viajes.filter(v => !['completado', 'cancelado'].includes(String(v.estado || '').toLowerCase())).length} activos</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={s.card}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', color: '#e0e0e0' }}>Nuevo Viaje</h3>
                <form onSubmit={crearViaje}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={s.label}>Vehiculo</label>
                    <select style={s.select} value={formViaje.vehicle_id} onChange={(e) => {
                      const v = vehiculos.find(vh => String(vh.id) === e.target.value);
                      const op = operadores[e.target.value];
                      setFormViaje({
                        ...formViaje,
                        vehicle_id: e.target.value,
                        vehicle_name: v?.name || '',
                        origen: v?.location?.location || formViaje.origen,
                        conductor: op?.nombre || '',
                        telefono: op?.telefono || '',
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
                        setFormViaje({ ...formViaje, conductor: e.target.value, telefono: driver?.phone || formViaje.telefono });
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
                    <label style={s.label}>Remolque</label>
                    <select style={s.select} value={formViaje.remolque} onChange={(e) => setFormViaje({ ...formViaje, remolque: e.target.value })}>
                      <option value="">Sin remolque</option>
                      {remolques.filter(r => !r.vehicle_id_asignado || r.vehicle_id_asignado === formViaje.vehicle_id).map(r => (
                        <option key={r.id} value={r.numero}>#{r.numero}</option>
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
                  return (
                    <div style={{ fontSize: '0.85rem' }}>
                      <div style={{ padding: '0.75rem', background: '#111', borderRadius: '8px', border: '1px solid #1a3d1a' }}>
                        <div style={{ fontWeight: '600', color: '#00ff41', fontSize: '1rem', marginBottom: '0.5rem' }}>{v.name}</div>
                        <div style={{ color: '#c0c0c0' }}>Operador: {operadores[String(v.id)]?.nombre || 'Sin asignar'}</div>
                        <div style={{ color: '#c0c0c0' }}>Ubicación: {v.location?.location || 'Sin datos'}</div>
                        <div style={{ color: '#c0c0c0' }}>Diesel: {v.fuelLevelPercent !== null ? `${Math.round(v.fuelLevelPercent * 100)}%` : 'N/D'}</div>
                        <div style={{ color: v.isOnline ? '#00ff41' : '#f59e0b' }}>Estado: {v.isOnline ? 'Online' : 'Sin señal'}</div>
                      </div>
                      {calculandoViajeEta && (
                        <div style={{ marginTop: '0.75rem', padding: '0.6rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #f59e0b33', fontSize: '0.85rem', color: '#f59e0b', textAlign: 'center' }}>
                          Calculando ETA...
                        </div>
                      )}
                      {viajeEta && !calculandoViajeEta && (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #10b98133' }}>
                          <div style={{ fontWeight: '600', fontSize: '0.8rem', color: '#10b981', marginBottom: '0.5rem', textTransform: 'uppercase' }}>ETA Calculado (Tractocamión)</div>
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
                    <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>El origen se auto-llenará con la ubicación actual</p>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {[
                { key: 'programado', label: 'Programado', color: '#8b5cf6' },
                { key: 'en_ruta_vacio', label: 'En Ruta Vacío', color: '#3b82f6' },
                { key: 'en_ruta_cargado', label: 'En Ruta Cargado', color: '#10b981' },
                { key: 'proceso_carga', label: 'Proceso Carga', color: '#f59e0b' },
                { key: 'proceso_descarga', label: 'Proceso Descarga', color: '#ec4899' },
                { key: 'proceso_liberacion', label: 'Proceso Liberación', color: '#22c55e' },
                { key: 'espera_ingreso', label: 'Espera Ingreso', color: '#f97316' },
                { key: 'en_resguardo', label: 'En Resguardo', color: '#14b8a6' },
                { key: 'disponible', label: 'Disponible', color: '#6b7280' },
                { key: 'completado', label: 'Completado', color: '#00ff41' },
                { key: 'cancelado', label: 'Cancelado', color: '#ef4444' },
              ].map(col => {
                const items = viajes.filter(v => String(v.estado || 'programado').toLowerCase() === col.key);
                return (
                  <div key={col.key} style={{ background: '#0a0a0a', border: `1px solid ${col.color}33`, borderRadius: '12px', padding: '0.85rem', minHeight: '280px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h3 style={{ margin: 0, fontSize: '0.95rem', color: col.color }}>{col.label}</h3>
                      <span style={s.badge(col.color)}>{items.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {items.length === 0 ? (
                        <div style={{ color: '#4a8a4a', fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>Sin viajes</div>
                      ) : items.sort((a, b) => new Date(a.fecha_inicio || a.created_at || 0) - new Date(b.fecha_inicio || b.created_at || 0)).map(v => (
                        <div key={v.id} onClick={() => { setViajeDetalle(v); setViajeForm(v); setShowViajeModal(true); setViajeEditando(false); }}
                          style={{ background: '#111', border: `1px solid ${col.color}33`, borderRadius: '10px', padding: '0.75rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ color: '#00ff41', fontWeight: 700, fontSize: '0.95rem' }}>{v.vehicle_name || v.vehicle_id}</div>
                              <div style={{ color: '#c0c0c0', fontSize: '0.8rem' }}>{v.conductor || 'Sin conductor'}</div>
                            </div>
                            <select value={v.estado || 'programado'} onChange={(e) => { e.stopPropagation(); actualizarEstadoViaje(v.id, e.target.value); }}
                              style={{ ...s.select, width: '150px', fontSize: '0.75rem' }}>
                              {[
                                'programado','disponible','en_ruta_vacio','en_ruta_cargado','espera_ingreso','proceso_carga','proceso_descarga','proceso_liberacion','en_resguardo','completado','cancelado'
                              ].map(st => <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>)}
                            </select>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#e0e0e0' }}>{v.origen || '-'} → {v.destino || '-'}</div>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <span style={s.badge(estadoColors[v.estado] || col.color)}>{v.estado || 'programado'}</span>
                            {v.remolque && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: '#332200', color: '#f59e0b', border: '1px solid #f59e0b33' }}>🚛 {v.remolque}</span>}
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button onClick={(e) => { e.stopPropagation(); setViajeDetalle(v); setViajeForm(v); setShowViajeModal(true); setViajeEditando(false); }} style={{ ...s.button('#3b82f6'), padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>Ver</button>
                            <button onClick={(e) => { e.stopPropagation(); setViajeDetalle(v); setViajeForm(v); setShowViajeModal(true); setViajeEditando(true); }} style={{ ...s.button('#f59e0b'), padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>Editar</button>
                            <button onClick={(e) => { e.stopPropagation(); eliminarViaje(v.id); }} style={{ ...s.button('#ef4444'), padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>X</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
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
          </div>
        )}

        {activeTab === 'remolques' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: '#e0e0e0', margin: 0 }}>Remolques</h2>
              <button onClick={() => { setRemolqueEditando(null); setFormRemolque({ numero: '', categoria: 'Caja Seca' }); setShowRemolqueModal(true); }} style={{ padding: '0.5rem 1rem', background: '#00ff41', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>+ Nuevo</button>
            </div>

            {['Thermo Refrigerado', 'Caja Seca', 'Porta Contenedores', 'Tanque'].map(cat => {
              const filas = remolques.filter(r => (r.categoria || 'Caja Seca') === cat);
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
                      <div key={r.id} onClick={() => cargarHistorialRemolque(r.id)}
                        style={{ background: selectedRemolque === r.id ? '#1a3d1a' : '#111', border: `1px solid ${selectedRemolque === r.id ? '#00ff41' : '#1a3d1a'}`, borderRadius: '10px', padding: '1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#00ff41', fontWeight: 700, fontSize: '1.1rem' }}>#{r.numero}</span>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button onClick={(e) => { e.stopPropagation(); setRemolqueEditando(r); setFormRemolque({ numero: r.numero, categoria: r.categoria || 'Caja Seca' }); setShowRemolqueModal(true); }} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.9rem' }}>✏️</button>
                            <button onClick={(e) => { e.stopPropagation(); eliminarRemolque(r.id); }} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#f59e0b', textTransform: 'uppercase' }}>{r.categoria || 'Caja Seca'}</div>
                        {r.unidad_asignada ? (
                          <div style={{ fontSize: '0.85rem', color: '#00ff41', background: '#002200', padding: '0.3rem 0.6rem', borderRadius: '6px', display: 'inline-block', alignSelf: 'flex-start' }}>
                            🚛 {r.unidad_asignada}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.85rem', color: '#888', fontStyle: 'italic' }}>Sin asignar</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {selectedRemolque && historialRemolque.length > 0 && (
              <div style={{ background: '#111', border: '1px solid #1a3d1a', borderRadius: '10px', padding: '1rem' }}>
                <h3 style={{ color: '#e0e0e0', margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>Historial de asignaciones</h3>
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
          </div>
        )}

        {activeTab === 'seguimiento' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ color: '#e0e0e0', margin: 0, fontSize: '1.35rem' }}>Seguimiento Operativo</h2>
                <p style={{ margin: '0.25rem 0 0', color: '#6a9b6a', fontSize: '0.9rem' }}>Captura, filtra y revisa el historial por unidad</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={s.badge('#3b82f6')}>{seguimientoResumen.total} registros</span>
                <span style={s.badge('#10b981')}>{seguimientoResumen.activos} activos</span>
                <span style={s.badge('#6b7280')}>{seguimientoResumen.disponibles} disponibles</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {!showSeguimientoForm && (
                <button onClick={() => setShowSeguimientoForm(true)} style={{ ...s.button('#10b981'), alignSelf: 'flex-start' }}>+ Nuevo seguimiento</button>
              )}
              {showSeguimientoForm && (
              <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>{seguimientoEditando ? 'Editar seguimiento' : 'Nuevo seguimiento'}</h3>
                  <button onClick={limpiarSeguimientoForm} style={s.button('#6b7280')}>Cancelar</button>
                </div>
                <form onSubmit={guardarSeguimiento}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={s.label}>Unidad *</label>
                      <select
                        style={s.select}
                        value={vehiculos.find(v => v.name === formSeguimiento.unidad)?.id || ''}
                        onChange={(e) => aplicarSeguimientoDesdeUnidad(e.target.value)}
                        required
                      >
                        <option value="">Seleccionar unidad...</option>
                        {vehiculos.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={s.label}>Operador</label>
                      <input style={s.input} value={formSeguimiento.operador} onChange={e => setFormSeguimiento({ ...formSeguimiento, operador: e.target.value })} placeholder="Operador" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={s.label}>Remolque</label>
                      <input style={s.input} value={formSeguimiento.remolque} onChange={e => setFormSeguimiento({ ...formSeguimiento, remolque: e.target.value })} placeholder="Remolque" />
                    </div>
                    <div>
                      <label style={s.label}>Grupo</label>
                      <input style={s.input} value={formSeguimiento.grupo} onChange={e => setFormSeguimiento({ ...formSeguimiento, grupo: e.target.value })} placeholder="Grupo" />
                    </div>
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={s.label}>Ruta</label>
                    <input style={s.input} value={formSeguimiento.ruta} onChange={e => setFormSeguimiento({ ...formSeguimiento, ruta: e.target.value })} placeholder="Ruta o referencia" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={s.label}>Origen</label>
                      <input style={s.input} value={formSeguimiento.origen} onChange={e => setFormSeguimiento({ ...formSeguimiento, origen: e.target.value })} placeholder="Origen" />
                    </div>
                    <div>
                      <label style={s.label}>Destino</label>
                      <input style={s.input} value={formSeguimiento.destino} onChange={e => setFormSeguimiento({ ...formSeguimiento, destino: e.target.value })} placeholder="Destino" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={s.label}>Estatus</label>
                      <select style={s.select} value={formSeguimiento.estatus} onChange={e => setFormSeguimiento({ ...formSeguimiento, estatus: e.target.value })}>
                        {seguimientoEstados.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={s.label}>Cita carga</label>
                      <input style={s.input} value={formSeguimiento.cita_carga} onChange={e => setFormSeguimiento({ ...formSeguimiento, cita_carga: e.target.value })} placeholder="Fecha / hora" />
                    </div>
                    <div>
                      <label style={s.label}>Cita descarga</label>
                      <input style={s.input} value={formSeguimiento.cita_descarga} onChange={e => setFormSeguimiento({ ...formSeguimiento, cita_descarga: e.target.value })} placeholder="Fecha / hora" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={s.label}>Hora llegada</label>
                      <input style={s.input} value={formSeguimiento.hora_llegada} onChange={e => setFormSeguimiento({ ...formSeguimiento, hora_llegada: e.target.value })} placeholder="Hora llegada" />
                    </div>
                    <div>
                      <label style={s.label}>Hora liberación</label>
                      <input style={s.input} value={formSeguimiento.hora_liberacion} onChange={e => setFormSeguimiento({ ...formSeguimiento, hora_liberacion: e.target.value })} placeholder="Hora liberación" />
                    </div>
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={s.label}>Comentarios cliente</label>
                    <textarea style={{ ...s.input, minHeight: '70px', resize: 'vertical', fontFamily: 'inherit' }} value={formSeguimiento.comentarios_cliente} onChange={e => setFormSeguimiento({ ...formSeguimiento, comentarios_cliente: e.target.value })} placeholder="Observaciones del cliente" />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={s.label}>Comentarios monitoreo</label>
                    <textarea style={{ ...s.input, minHeight: '90px', resize: 'vertical', fontFamily: 'inherit' }} value={formSeguimiento.comentarios_monitoreo} onChange={e => setFormSeguimiento({ ...formSeguimiento, comentarios_monitoreo: e.target.value })} placeholder="Notas internas" />
                  </div>
                  <button type="submit" style={{ ...s.button('#10b981'), width: '100%' }}>{seguimientoEditando ? 'Actualizar registro' : 'Guardar registro'}</button>
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
                    <button onClick={() => { limpiarSeguimientoForm(); setActiveTab('seguimiento'); }} style={s.button('#3b82f6')}>+ Nuevo</button>
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
                        const viajesUnidad = ordenarViajesUnidad(
                          viajes.filter(v => String(v.vehicle_name || '').toLowerCase() === String(row.unidad || '').toLowerCase())
                        ).filter(v => !['completado', 'cancelado'].includes(String(v.estado || '').toLowerCase()));
                        const viajeActual = viajesUnidad[0] || null;
                        const viajeSiguiente = viajesUnidad[1] || null;
                        return (
                          <tr key={row.id} style={{ background: selectedSeguimiento?.id === row.id ? '#102010' : rowBg, borderBottom: '1px solid #1a1a1a' }}>
                            <td style={{ ...tdStyle, textAlign: 'center', color: '#4a8a4a', fontSize: '0.7rem' }}>{idx + 1}</td>
                            <td style={{ ...tdStyle, fontWeight: 700, color: '#00ff41' }}>{row.unidad || '-'}</td>
                            <td style={tdStyle}>{row.grupo || '-'}</td>
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
                              <button onClick={() => cargarHistorialSeguimiento(row)} style={{ background: 'none', border: '1px solid #1a3d1a', color: '#00ff41', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 6px', marginRight: '0.35rem' }}>Historial</button>
                              <button onClick={() => editarSeguimiento(row)} style={{ background: 'none', border: '1px solid #1a3d1a', color: '#60a5fa', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 6px', marginRight: '0.35rem' }}>Editar</button>
                              <button onClick={() => eliminarSeguimiento(row.id)} style={{ background: 'none', border: '1px solid #3a1a1a', color: '#ef4444', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 6px' }}>✕</button>
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
              <button onClick={() => setActiveTab('notas')} style={s.button('#00ff41')}>Ir a Notas</button>
              <button onClick={loadAll} style={s.button()}>Actualizar</button>
            </div>
          </div>
        )}

        {activeTab === 'geocercas' && (
          <div>
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
                            {g.nombre}
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
                {(() => {
                  const routeStops = routeHistory.filter((p, i) => i > 0 && Number(p.speed || 0) < 1 && Number(routeHistory[i - 1]?.speed || 0) >= 1);
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
                                  {' · '}{Math.round(p.speed || 0)} mph
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
          </div>
        )}

        {activeTab === 'citas' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#e0e0e0' }}>Citas por Unidad</h2>
                <p style={{ margin: '0.25rem 0 0', color: '#6a9b6a', fontSize: '0.9rem' }}>Unidades con citas próximas en seguimiento y viajes</p>
              </div>
              <button onClick={loadAll} style={s.button()}>Actualizar</button>
            </div>

            {(() => {
              const items = [
                ...seguimiento.filter(r => r.cita_carga || r.cita_descarga).map(r => ({
                  id: `seg-${r.id}`,
                  unidad: r.unidad,
                  tipo: 'Seguimiento',
                  origen: r.origen,
                  destino: r.destino,
                  cita_carga: r.cita_carga,
                  cita_descarga: r.cita_descarga,
                  remolque: r.remolque,
                  estatus: r.estatus,
                })),
                ...viajes.filter(v => v.fecha_inicio || v.fecha_fin).map(v => ({
                  id: `via-${v.id}`,
                  unidad: v.vehicle_name || v.vehicle_id,
                  tipo: 'Viaje',
                  origen: v.origen,
                  destino: v.destino,
                  cita_carga: v.fecha_inicio,
                  cita_descarga: v.fecha_fin,
                  remolque: v.remolque,
                  estatus: v.estado,
                })),
              ].sort((a, b) => new Date((a.cita_carga || a.cita_descarga || 0)).getTime() - new Date((b.cita_carga || b.cita_descarga || 0)).getTime());

              return items.length === 0 ? (
                <div style={{ ...s.card, textAlign: 'center', padding: '3rem', color: '#6a9b6a' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📅</div>
                  <p>No hay unidades con citas registradas</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                  {items.map(item => (
                    <div key={item.id} style={{ ...s.card, borderLeft: `4px solid ${item.tipo === 'Viaje' ? '#3b82f6' : '#f59e0b'}`, padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#00ff41' }}>{item.unidad || '-'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6a9b6a' }}>{item.tipo}</div>
                        </div>
                        <span style={s.badge(item.tipo === 'Viaje' ? '#3b82f6' : '#f59e0b')}>{item.estatus || 'pendiente'}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#e0e0e0', marginBottom: '0.35rem' }}>{item.origen || '-'} → {item.destino || '-'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#c0c0c0' }}>Carga: <strong>{item.cita_carga || '-'}</strong></div>
                      <div style={{ fontSize: '0.8rem', color: '#c0c0c0' }}>Descarga: <strong>{item.cita_descarga || '-'}</strong></div>
                      {item.remolque && <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: '#f59e0b' }}>🚛 {item.remolque}</div>}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'usuarios' && currentUser?.rol === 'admin' && (
          <div>
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
                    <th style={s.th}>Nombre</th>
                    <th style={s.th}>Rol</th>
                    <th style={s.th}>Estado</th>
                    <th style={s.th}>Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id}>
                      <td style={s.td}>{u.nombre || '-'}</td>
                      <td style={s.td}>{u.rol}</td>
                      <td style={s.td}>{u.activo ? 'Activo' : 'Inactivo'}</td>
                      <td style={s.td}>{u.created_at || '-'}</td>
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
                    <option value="pendientes">Pendientes</option>
                    <option value="pendientes-completados">Pendientes completados</option>
                    <option value="viajes">Viajes</option>
                    <option value="seguimiento">Seguimiento / Comentarios</option>
                    <option value="bitacora">Bitácora</option>
                    <option value="incidencias">Incidencias</option>
                  </select>
                </div>
                {(filtroReporte.tipo === 'seguimiento' || filtroReporte.tipo === 'bitacora' || filtroReporte.tipo === 'incidencias') && (
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
                {reportes.length > 0 && <button onClick={generarPDF} style={s.button('#ef4444')}>Descargar PDF</button>}
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

      {showZoneModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={() => setShowZoneModal(false)}>
          <div style={{ background: '#0d0d0d', borderRadius: '16px', width: '420px', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(248,113,113,0.1)', border: '1px solid #3d1a1a' }}
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
                  <input style={s.input} value={newZone.lat} readOnly placeholder="Haz clic en el mapa" />
                </div>
                <div>
                  <label style={s.label}>Longitud</label>
                  <input style={s.input} value={newZone.lng} readOnly placeholder="Haz clic en el mapa" />
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
        </div>
      )}

      {showUnidadModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={() => setShowUnidadModal(false)}>
          <div style={{ background: '#0d0d0d', borderRadius: '16px', width: '440px', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(0,255,65,0.1)', border: '1px solid #1a3d1a' }}
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
        </div>
      )}

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
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <select
                    value={operadores[String(selectedVehicle.id)]?.nombre || ''}
                    onChange={e => {
                      const nombre = e.target.value;
                      const driver = samsaraDrivers.find(d => d.name === nombre);
                      setOperadores(prev => ({ ...prev, [String(selectedVehicle.id)]: { nombre, telefono: driver?.phone || prev[String(selectedVehicle.id)]?.telefono || '' } }));
                    }}
                    style={{ flex: 1, padding: '0.55rem 0.75rem', border: '1px solid #1a3d1a', borderRadius: '8px', fontSize: '0.85rem', background: '#ffffff', color: '#000000' }}
                  >
                    <option value="">Seleccionar operador...</option>
                    {samsaraDrivers.filter(d => d.status === 'active').sort((a, b) => a.name.localeCompare(b.name)).map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <input
                    placeholder="Telefono WhatsApp (521XXXXXXXXXX)"
                    value={operadores[String(selectedVehicle.id)]?.telefono || ''}
                    onChange={e => setOperadores(prev => ({ ...prev, [String(selectedVehicle.id)]: { ...(prev[String(selectedVehicle.id)] || {}), telefono: e.target.value } }))}
                    style={{ flex: 1, padding: '0.55rem 0.75rem', border: '1px solid #1a3d1a', borderRadius: '8px', fontSize: '0.85rem', background: '#ffffff', color: '#000000' }}
                  />
                  <button
                    onClick={() => guardarOperador(selectedVehicle.id, selectedVehicle.name, operadores[String(selectedVehicle.id)]?.nombre || '', operadores[String(selectedVehicle.id)]?.telefono || '')}
                    style={{ padding: '0.55rem 0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    Asignar
                  </button>
                </div>
              </div>

              <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Remolque Asignado</div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    value={remolques.find(r => r.vehicle_id_asignado === String(selectedVehicle.id))?.id || ''}
                    onChange={e => {
                      const remolqueId = e.target.value;
                      const vName = selectedVehicle.name;
                      if (remolqueId) {
                        asignarRemolque(remolqueId, String(selectedVehicle.id), vName);
                      } else {
                        const actual = remolques.find(r => r.vehicle_id_asignado === String(selectedVehicle.id));
                        if (actual) desasignarRemolque(actual.id);
                      }
                    }}
                    style={{ flex: 1, padding: '0.55rem 0.75rem', border: '1px solid #1a3d1a', borderRadius: '8px', fontSize: '0.85rem', background: '#ffffff', color: '#000000' }}
                  >
                    <option value="">Sin remolque</option>
                    {remolques.map(r => (
                      <option key={r.id} value={r.id} disabled={r.vehicle_id_asignado && r.vehicle_id_asignado !== String(selectedVehicle.id)}>#{r.numero}{r.unidad_asignada ? ` (${r.unidad_asignada})` : ''}</option>
                    ))}
                  </select>
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
                          <span style={{ fontSize: '0.7rem', color: '#6a9b6a' }}>{v.fecha_inicio ? parseFecha(v.fecha_inicio).toLocaleDateString('es-MX') : '-'}</span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#e0e0e0' }}>
                          <strong>{v.origen}</strong> → <strong>{v.destino}</strong>
                        </div>
                        {v.conductor && <div style={{ fontSize: '0.72rem', color: '#6a9b6a', marginTop: '0.15rem' }}>Conductor: {v.conductor}</div>}
                        <div style={{ fontSize: '0.7rem', color: '#4a8a4a', marginTop: '0.15rem' }}>
                          {v.fecha_inicio ? parseFecha(v.fecha_inicio).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '--'} - {v.fecha_fin ? parseFecha(v.fecha_fin).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '--'}
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
                                <span style={{ fontSize: '0.7rem', color: '#6a9b6a' }}>{v.fecha_fin ? parseFecha(v.fecha_fin).toLocaleDateString('es-MX') : '-'}</span>
                              </div>
                              <div style={{ fontSize: '0.82rem', color: '#a3a3a3' }}>
                                <strong>{v.origen}</strong> → <strong>{v.destino}</strong>
                              </div>
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
                  <input placeholder="Escribe el destino para calcular ETA..." value={destinoInput} onChange={e => setDestinoInput(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #1a3d1a', borderRadius: '8px', fontSize: '0.85rem', background: '#ffffff', color: '#000000' }} />
                </div>
                {calculandoEta && (
                  <div style={{ padding: '0.6rem 0.75rem', background: '#1a1a1a', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem', color: '#f59e0b', border: '1px solid #f59e0b33' }}>
                    Calculando ruta...
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
                    <div style={{ fontSize: '0.7rem', color: '#4a8a4a', marginTop: '0.5rem', textAlign: 'center' }}>{etaData.destino}</div>
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
        </div>
      )}

      {showViajeModal && viajeDetalle && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => { setShowViajeModal(false); setViajeEditando(false); }}>
          <div style={{ background: '#0d1a0d', border: '1px solid #1a3d1a', borderRadius: '12px', padding: '1.5rem', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#00ff41' }}>{viajeEditando ? 'Editar Viaje' : 'Detalles del Viaje'}</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {!viajeEditando && (
                  <button onClick={() => setViajeEditando(true)} style={{ ...s.button('#f59e0b'), padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>Editar</button>
                )}
                <button onClick={() => { setShowViajeModal(false); setViajeEditando(false); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
              </div>
            </div>

            {viajeEditando ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={s.label}>Unidad</label>
                    <select style={s.select} value={viajeForm.vehicle_id || ''} onChange={(e) => {
                      const v = vehiculos.find(vh => String(vh.id) === e.target.value);
                      setViajeForm({ ...viajeForm, vehicle_id: e.target.value, vehicle_name: v?.name || '' });
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={s.label}>Origen</label>
                    <input style={s.input} value={viajeForm.origen || ''} onChange={(e) => setViajeForm({ ...viajeForm, origen: e.target.value })} />
                  </div>
                  <div>
                    <label style={s.label}>Destino</label>
                    <input style={s.input} value={viajeForm.destino || ''} onChange={(e) => setViajeForm({ ...viajeForm, destino: e.target.value })} />
                  </div>
                </div>

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
                    {remolques.filter(r => !r.vehicle_id_asignado || r.vehicle_id_asignado === viajeForm.vehicle_id).map(r => (
                      <option key={r.id} value={r.numero}>#{r.numero}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={s.label}>Notas</label>
                  <textarea style={{ ...s.input, minHeight: '80px', resize: 'vertical' }} value={viajeForm.notas || ''} onChange={(e) => setViajeForm({ ...viajeForm, notas: e.target.value })} />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => setViajeEditando(false)} style={s.button('#6b7280')}>Cancelar</button>
                  <button onClick={actualizarViaje} style={s.button('#10b981')}>Guardar</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #1a3d1a' }}>
                    <div style={{ fontSize: '0.7rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Unidad</div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#00ff41' }}>{viajeDetalle.vehicle_name || viajeDetalle.vehicle_id}</div>
                  </div>
                  <div style={{ padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #1a3d1a' }}>
                    <div style={{ fontSize: '0.7rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Estado</div>
                    <div style={{ fontSize: '1rem', fontWeight: '600' }}>
                      <span style={s.badge(estadoColors[viajeDetalle.estado] || '#6a9b6a')}>{viajeDetalle.estado}</span>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6a9b6a', marginBottom: '0.2rem' }}>Origen</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{viajeDetalle.origen || '-'}</div>
                    </div>
                    <div style={{ fontSize: '1.5rem', color: '#00ff41' }}>→</div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6a9b6a', marginBottom: '0.2rem' }}>Destino</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#60a5fa' }}>{viajeDetalle.destino || '-'}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #1a3d1a' }}>
                    <div style={{ fontSize: '0.7rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Fecha Inicio</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                      {viajeDetalle.fecha_inicio ? parseFecha(viajeDetalle.fecha_inicio)?.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #1a3d1a' }}>
                    <div style={{ fontSize: '0.7rem', color: '#4a8a4a', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Fecha Fin</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                      {viajeDetalle.fecha_fin ? parseFecha(viajeDetalle.fecha_fin)?.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
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
        </div>
        )}

        {showSeguimientoUpdateModal && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200, padding: '1rem' }}
            onClick={() => setShowSeguimientoUpdateModal(false)}
          >
            <div
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
          </div>
        )}

        {showMensajeModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowMensajeModal(false)}>
          <div style={{ background: '#0d1a0d', border: '1px solid #1a3d1a', borderRadius: '12px', padding: '1.5rem', maxWidth: '700px', width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
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
        </div>
      )}

      {showPendienteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => { setShowPendienteModal(false); setPendienteEditando(null); setFormPendiente({ titulo: '', descripcion: '', prioridad: 'media', asignado_a: '', turno: '', notas: '' }); setNuevoComentarioPendiente(''); }}>
          <div style={{ background: '#0d1a0d', border: '1px solid #1a3d1a', borderRadius: '12px', padding: '1.5rem', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#00ff41' }}>{pendienteEditando ? 'Detalles del Pendiente' : 'Nuevo Pendiente'}</h2>
              <button onClick={() => { setShowPendienteModal(false); setPendienteEditando(null); setFormPendiente({ titulo: '', descripcion: '', prioridad: 'media', asignado_a: '', turno: '', notas: '' }); setNuevoComentarioPendiente(''); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
            </div>
            {pendienteEditando ? (
              <div>
                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #1a3d1a' }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={s.label}>Título</label>
                    <div style={{ padding: '0.5rem', background: '#0d1a0d', borderRadius: '4px', color: '#e0e0e0' }}>{pendienteEditando.titulo}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={s.label}>Prioridad</label>
                      <select style={s.select} value={formPendiente.prioridad} onChange={(e) => setFormPendiente({ ...formPendiente, prioridad: e.target.value })}>
                        <option value="alta">Alta</option>
                        <option value="media">Media</option>
                        <option value="baja">Baja</option>
                      </select>
                    </div>
                    <div>
                      <label style={s.label}>Estado</label>
                      <div style={{ padding: '0.5rem', background: '#0d1a0d', borderRadius: '4px', color: '#60a5fa', textTransform: 'capitalize' }}>{pendienteEditando.estado || 'pendiente'}</div>
                    </div>
                  </div>
                  {pendienteEditando.descripcion && <div style={{ marginBottom: '0.75rem', padding: '0.5rem', background: '#0d1a0d', borderRadius: '4px', color: '#a0a0a0', whiteSpace: 'pre-wrap' }}>{pendienteEditando.descripcion}</div>}
                  <div style={{ fontSize: '0.8rem', color: '#6a9b6a' }}>Solo puedes cambiar la prioridad.</div>
                </div>

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
                            <span style={{ fontSize: '0.7rem', color: '#4a4a4a' }}>{new Date(c.fecha_creacion).toLocaleString('es-MX')}</span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#e0e0e0', whiteSpace: 'pre-wrap' }}>{c.contenido}</div>
                        </div>
                      ))
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input style={{ ...s.input, flex: 1 }} placeholder="Agregar comentario..." value={nuevoComentarioPendiente} onChange={(e) => setNuevoComentarioPendiente(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter' && nuevoComentarioPendiente.trim()) { agregarComentarioPendiente(pendienteEditando.id, nuevoComentarioPendiente); } }} />
                    <button type="button" onClick={() => { if (nuevoComentarioPendiente.trim()) agregarComentarioPendiente(pendienteEditando.id, nuevoComentarioPendiente); }} style={s.button('#10b981')}>Agregar</button>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => { eliminarPendiente(pendienteEditando.id); setShowPendienteModal(false); setPendienteEditando(null); }} style={s.button('#ef4444')}>Eliminar</button>
                  <button type="button" onClick={() => { setShowPendienteModal(false); setPendienteEditando(null); setNuevoComentarioPendiente(''); }} style={s.button('#6b7280')}>Cerrar</button>
                </div>
              </div>
            ) : (
              <form onSubmit={guardarPendiente}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={s.label}>Título *</label>
                  <input style={s.input} placeholder="Ej: Revisar unidad GERS-243" value={formPendiente.titulo} onChange={(e) => setFormPendiente({ ...formPendiente, titulo: e.target.value })} required />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={s.label}>Descripción</label>
                  <textarea style={{ ...s.input, minHeight: '60px', resize: 'vertical' }} placeholder="Detalles del pendiente..." value={formPendiente.descripcion} onChange={(e) => setFormPendiente({ ...formPendiente, descripcion: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={s.label}>Prioridad</label>
                    <select style={s.select} value={formPendiente.prioridad} onChange={(e) => setFormPendiente({ ...formPendiente, prioridad: e.target.value })}>
                      <option value="alta">Alta</option>
                      <option value="media">Media</option>
                      <option value="baja">Baja</option>
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Turno</label>
                    <select style={s.select} value={formPendiente.turno} onChange={(e) => setFormPendiente({ ...formPendiente, turno: e.target.value })}>
                      <option value="">Sin turno</option>
                      <option value="mañana">Mañana</option>
                      <option value="tarde">Tarde</option>
                      <option value="noche">Noche</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={s.label}>Asignado a</label>
                  <input style={s.input} placeholder="Nombre del monitorista" value={formPendiente.asignado_a} onChange={(e) => setFormPendiente({ ...formPendiente, asignado_a: e.target.value })} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={s.label}>Notas</label>
                  <textarea style={{ ...s.input, minHeight: '50px', resize: 'vertical' }} placeholder="Notas adicionales..." value={formPendiente.notas} onChange={(e) => setFormPendiente({ ...formPendiente, notas: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => { setShowPendienteModal(false); setPendienteEditando(null); setFormPendiente({ titulo: '', descripcion: '', prioridad: 'media', asignado_a: '', turno: '', notas: '' }); }} style={s.button('#6b7280')}>Cancelar</button>
                  <button type="submit" style={s.button('#10b981')}>Guardar</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showHistorialModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }} onClick={() => setShowHistorialModal(false)}>
          <div style={{ background: '#0d1a0d', border: '1px solid #1a3d1a', borderRadius: '12px', padding: '1.5rem', maxWidth: '1100px', width: '95%', maxHeight: '85vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
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
        </div>
      )}

      {showRemolqueModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200 }} onClick={cerrarRemolqueModal}>
          <div style={{ background: '#0d0d0d', border: '1px solid #1a3d1a', borderRadius: '16px', width: '520px', maxWidth: '95vw', padding: '1.5rem' }} onClick={(e) => e.stopPropagation()}>
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
        </div>
      )}

      {showTurnoModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200 }} onClick={() => { setShowTurnoModal(false); setTurnoSummary(null); }}>
          <div style={{ background: '#0d0d0d', border: '1px solid #1a3d1a', borderRadius: '16px', width: '920px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', padding: '1.5rem' }} onClick={(e) => e.stopPropagation()}>
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
        </div>
      )}
    </div>
  );
}
