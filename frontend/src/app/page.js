'use client';

import dynamic from 'next/dynamic';
import {
  estaEnMovimiento,
  parseDestinos,
  destinosViaje,
  paradasViaje,
  paradaActualViaje,
  destinoViajeActual,
  ordenarViajesPorUnidad,
  normalizarViaje,
  activarConTeclado,
  tituloAlerta,
} from '../lib/viajes';
import useGersDashboard from '../lib/useGersDashboard';

const MapaUnidades = dynamic(() => import('../components/MapaUnidades'), { ssr: false });
const RouteMap = dynamic(() => import('../components/RouteMap'), { ssr: false });

export default function Home() {
  const {
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
    comentarios,
    setComentarios,
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
    vehicleFilter,
    setVehicleFilter,
    nuevoComentario,
    setNuevoComentario,
    remolques,
    setRemolques,
    mantenimientos,
    setMantenimientos,
    showMantenimientoModal,
    setShowMantenimientoModal,
    mantenimientoEditando,
    setMantenimientoEditando,
    formMantenimiento,
    setFormMantenimiento,
    mantenimientoSaving,
    setMantenimientoSaving,
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
    notasBitacora,
    notasIncidencias,
    notasTab,
    setNotasTab,
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
    estadoVehiculoCita,
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
    completarMantenimiento,
    eliminarMantenimiento,
    guardarMantenimiento,
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
    abrirClienteModal,
    cerrarClienteModal,
    guardarCliente,
    eliminarCliente,
    asignarRemolque,
    asignarFull,
    desasignarRemolque,
    cargarHistorialRemolque,
    resetNotaForm,
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
    crearComentario,
    eliminarComentario,
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
  } = useGersDashboard();

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

  return (
    <div className="app-shell" style={s.container}>
      <datalist id="seguimiento-group-suggestions">
        {gruposUnicos.map(grupo => <option key={grupo} value={grupo} />)}
      </datalist>
      <aside className="app-sidebar" style={{ ...s.sidebar, width: sidebarCollapsed ? '56px' : '240px', transition: 'width 0.2s ease' }}>
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
      </aside>

      <main className="app-main" style={{ ...s.main, overflow: activeTab === 'dashboard' ? 'hidden' : 'auto' }}>
        {activeTab === 'dashboard' && (
          <div className="dashboard-shell" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 3rem)', margin: '-1.5rem -2rem', overflow: 'hidden' }}>
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
                const tipoAlerta = { geocerca: 'Geocerca', combustible_bajo: 'Combustible', velocidad: 'Velocidad', mantenimiento: 'Mantenimiento' };
                const alertasPorTipo = alertasNoLeidas.reduce((acc, a) => {
                  const key = String(a.tipo || 'otra');
                  acc[key] = (acc[key] || 0) + 1;
                  return acc;
                }, {});
                const mVen = mantenimientos.filter(m => m.status === 'vencido').length;
                const mProx = mantenimientos.filter(m => m.status === 'proximo').length;
                const mProg = mantenimientos.filter(m => m.status === 'programado').length;
                const mCompletados = mantenimientos.filter(m => m.status === 'completado').length;
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

                      {section('Mantenimiento y control')}
                      {panel('Mantenimiento', mVen > 0 ? '#f87171' : mProx > 0 ? '#facc15' : '#4ade80', (
                        <>
                          {bigNum(mVen + mProx, mVen > 0 ? '#f87171' : mProx > 0 ? '#facc15' : '#4ade80', 'Vencidos + próximos')}
                          {fila('Vencidos', mVen, mVen > 0 ? '#f87171' : '#e0e0e0')}
                          {fila('Próximos', mProx, mProx > 0 ? '#facc15' : '#e0e0e0')}
                          {fila('Programados', mProg, '#60a5fa')}
                          {fila('Completados', mCompletados, '#4ade80')}
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
                              const borderColor = a.tipo === 'geocerca' ? '#8b5cf6' : a.tipo === 'combustible_bajo' ? '#f59e0b' : a.tipo === 'mantenimiento' ? '#f87171' : '#3b82f6';
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
        })()}

        {activeTab === 'monitoreo' && (() => {
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
        })()}

        {activeTab === 'notas' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
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
          </div>
        )}

        {activeTab === 'operaciones' && (
          <div>
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
            {showProgramarViajeModal && (
              <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 2100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.82)' }} onClick={() => setShowProgramarViajeModal(false)}>
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
              </div>
            )}
            {viajesView === 'tablero' && (
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
                         </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            )}

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
          </div>
        )}

        {activeTab === 'clientes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                  <div style={{ color: '#4ade80', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.45rem' }}>Grupos de WhatsApp para reportes</div>
                  {(selectedCliente.wpp_groups || []).length === 0 ? (
                    <div style={{ color: '#6a9b6a', fontSize: '0.85rem' }}>Sin grupos configurados. Pulsa "Editar" en el cliente para agregarlos.</div>
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
                          onClick={(e) => {
                            e.stopPropagation();
                            if (r.vehicle_id_asignado || r.unidad_asignada) desasignarRemolque(r.id);
                            else abrirRemolqueDashboard(r);
                          }}
                          style={{ ...s.button((r.vehicle_id_asignado || r.unidad_asignada) ? '#ef4444' : '#3b82f6'), marginTop: '0.25rem', width: '100%' }}
                        >
                          {(r.vehicle_id_asignado || r.unidad_asignada) ? 'Desasignar' : 'Asignar a unidad'}
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
          </div>
        )}

        {activeTab === 'mantenimiento' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ color: '#e0e0e0', margin: 0, fontSize: '1.35rem' }}>Mantenimiento Preventivo</h2>
                <div style={{ color: '#6a9b6a', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  {(() => {
                    const vencidos = mantenimientos.filter(m => m.status === 'vencido').length;
                    const proximos = mantenimientos.filter(m => m.status === 'proximo').length;
                    const completados = mantenimientos.filter(m => m.status === 'completado').length;
                    return `Vencidos: ${vencidos} · Próximos: ${proximos} · Completados: ${completados}`;
                  })()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={async () => { try { await apiJson(`${apiUrl}/check-mantenimiento`, { method: 'POST' }); await loadAll(); } catch (e) { console.error(e); } }} style={s.button('#f59e0b')}>Verificar vencimientos</button>
                <button onClick={() => { setMantenimientoEditando(null); setFormMantenimiento({ entidad_tipo: 'unidad', entidad_id: '', entidad_nombre: '', tipo_servicio: 'general', fecha_ultimo: '', fecha_proxima: '', intervalo_dias: 30, kilometraje_ultimo: '', kilometraje_proximo: '', notas: '' }); setShowMantenimientoModal(true); }} style={{ padding: '0.5rem 1rem', background: '#00ff41', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>+ Programar</button>
              </div>
            </div>

            <div style={{ background: '#111', border: '1px solid #1a3d1a', borderRadius: '10px', overflow: 'hidden' }}>
              {mantenimientos.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: '#6a9b6a' }}>Sin mantenimientos programados. Haz clic en "+ Programar".</div>}
              {mantenimientos.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={s.th}>Equipo</th>
                      <th style={s.th}>Servicio</th>
                      <th style={s.th}>Estado</th>
                      <th style={s.th}>Último</th>
                      <th style={s.th}>Próximo</th>
                      <th style={s.th}>Km prox.</th>
                      <th style={s.th}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mantenimientos.map(m => {
                      const color = m.status === 'vencido' ? '#f87171' : m.status === 'proximo' ? '#facc15' : m.status === 'completado' ? '#4ade80' : '#6a9b6a';
                      const label = m.status === 'vencido' ? 'Vencido' : m.status === 'proximo' ? 'Próximo' : m.status === 'completado' ? 'Completado' : 'Programado';
                      return (
                        <tr key={m.id}>
                          <td style={s.td}>
                            <div style={{ fontWeight: 600, color: '#e0e0e0' }}>{m.entidad_nombre || m.entidad_id || '-'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6a9b6a' }}>{m.entidad_tipo === 'remolque' ? 'Remolque' : 'Unidad'}</div>
                          </td>
                          <td style={s.td}>{m.tipo_servicio || 'general'}</td>
                          <td style={s.td}><span style={s.badge(color)}>{label}</span></td>
                          <td style={s.td}>{m.fecha_ultimo ? formatFechaProgramada(m.fecha_ultimo) : '-'}</td>
                          <td style={s.td}>{m.fecha_proxima ? formatFechaProgramada(m.fecha_proxima) : '-'}</td>
                          <td style={s.td}>{m.kilometraje_proximo || '-'}</td>
                          <td style={s.td}>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              {m.status !== 'completado' && (
                                <button onClick={() => completarMantenimiento(m)} style={{ background: '#00ff4133', color: '#00ff41', border: '1px solid #00ff4155', padding: '0.3rem 0.7rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>✓ Completar</button>
                              )}
                              <button onClick={() => { setMantenimientoEditando(m); setFormMantenimiento({ entidad_tipo: m.entidad_tipo || 'unidad', entidad_id: m.entidad_id || '', entidad_nombre: m.entidad_nombre || '', tipo_servicio: m.tipo_servicio || 'general', fecha_ultimo: m.fecha_ultimo || '', fecha_proxima: m.fecha_proxima || '', intervalo_dias: m.intervalo_dias || 30, kilometraje_ultimo: m.kilometraje_ultimo || '', kilometraje_proximo: m.kilometraje_proximo || '', notas: m.notas || '' }); setShowMantenimientoModal(true); }} style={s.button('#60a5fa')}>Editar</button>
                              <button onClick={() => eliminarMantenimiento(m)} style={{ background: '#ff444433', color: '#ff4444', border: '1px solid #ff444455', padding: '0.3rem 0.7rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Eliminar</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'seguimiento' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                                <button onClick={() => { setSeguimientoModalUnidadId(String(row._unidadObj?.id || '')); setSeguimientoModalError(''); setSeguimientoModalGrupo(''); setSeguimientoModalNota(''); setShowSeguimientoUpdateModal(true); }} style={{ background: 'none', border: '1px solid #1a3d1a', color: '#00ff41', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 6px' }}>Actualizar</button>
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
                  <div style={{ fontSize: '0.85rem', color: '#6a9b6a' }}>Aún no hay zonas propias. Presiona "Agregar zona" y haz clic en el mapa para crear una.</div>
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
          </div>
        )}

        {activeTab === 'mapas' && (
          <div className="mapas-page">
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
                <form className="mapas-form" onSubmit={guardarMapa}>
                  <h3>{mapaEditando ? 'Editar mapa' : 'Nuevo mapa'}</h3>
                  <label>
                    <span>Nombre</span>
                    <input required value={formMapa.nombre} onChange={e => setFormMapa({ ...formMapa, nombre: e.target.value })} placeholder="Ruta Bajío" />
                  </label>
                  <div className="mapas-form-route">
                    <label>
                      <span>Origen</span>
                       <select value={formMapa.origen} onChange={e => setFormMapa({ ...formMapa, origen: e.target.value })}>{geofenceOptions(formMapa.origen)}</select>
                    </label>
                    <label>
                      <span>Destino</span>
                       <select value={formMapa.destino} onChange={e => setFormMapa({ ...formMapa, destino: e.target.value })}>{geofenceOptions(formMapa.destino)}</select>
                    </label>
                  </div>
                  <label>
                    <span>Descripción</span>
                    <textarea rows="3" value={formMapa.descripcion} onChange={e => setFormMapa({ ...formMapa, descripcion: e.target.value })} placeholder="Paradas, restricciones y referencias de la ruta" />
                  </label>
                  <label>
                    <span>URL Google My Maps</span>
                    <input
                      required
                      type="url"
                      value={formMapa.url}
                      onChange={e => setFormMapa({ ...formMapa, url: e.target.value })}
                      onBlur={() => {
                        const embedUrl = googleMyMapsEmbedUrl(formMapa.url);
                        if (embedUrl) setFormMapa(prev => ({ ...prev, url: embedUrl }));
                      }}
                      placeholder="https://www.google.com/maps/d/viewer?mid=..."
                    />
                  </label>
                  <div className="mapas-form-actions">
                    {mapaEditando && <button type="button" onClick={cancelarEdicionMapa} style={s.button('#9ca3af')}>Cancelar</button>}
                    <button type="submit" disabled={mapaSaving} style={s.button()}>{mapaSaving ? 'Guardando...' : mapaEditando ? 'Actualizar' : 'Guardar mapa'}</button>
                  </div>
                </form>

                <div className="mapas-list" aria-label="Mapas guardados">
                  {mapas.length === 0 ? (
                    <div className="mapas-empty">No hay mapas guardados.</div>
                  ) : mapas.map(mapa => (
                    <article
                      key={mapa.id}
                      className={`mapa-card${String(selectedMapa?.id) === String(mapa.id) ? ' selected' : ''}`}
                      role="button"
                      tabIndex="0"
                      onClick={() => setSelectedMapa(mapa)}
                      onKeyDown={e => activarConTeclado(e, () => setSelectedMapa(mapa))}
                    >
                      <div className="mapa-card-title">{mapa.nombre}</div>
                      <div className="mapa-card-route">{mapa.origen || 'Origen sin definir'} <span>→</span> {mapa.destino || 'Destino sin definir'}</div>
                      {mapa.descripcion && <p>{mapa.descripcion}</p>}
                      <div className="mapa-card-actions">
                        <button type="button" onClick={e => { e.stopPropagation(); editarMapa(mapa); }} style={s.button('#60a5fa')}>Editar</button>
                        <button type="button" onClick={e => { e.stopPropagation(); eliminarMapa(mapa); }} style={s.button('#ef4444')}>Eliminar</button>
                      </div>
                    </article>
                  ))}
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
                          <h3>{selectedMapa.nombre}</h3>
                          <p>{selectedMapa.origen || 'Origen sin definir'} → {selectedMapa.destino || 'Destino sin definir'}</p>
                        </div>
                        {urlSegura && <a href={urlSegura} target="_blank" rel="noopener noreferrer">Abrir en Google</a>}
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
            </div>
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
          </div>
        )}

        {activeTab === 'citas' && (
          <div>
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
                              <th style={s.th}>ETA GPS</th>
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
                                <td style={s.td}><strong style={{ color: '#00ff41' }}>{item.unidad || '-'}</strong></td>
                                <td style={s.td}><span style={s.badge(estadoVeh.color)}>{estadoVeh.label}</span></td>
                                <td style={{ ...s.td, color: '#60a5fa' }}>📍 {findGeofence(item.destino)?.nombre || geocercasCoincidentes(item.destino)[0] || item.destino || '-'}</td>
                                <td style={s.td}>{appointment ? appointment.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</td>
                                <td style={s.td}>
                                  {etaInfo?.eta ? (
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
          </div>
        )}

        {citaSeleccionada && (
          <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100 }}
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
          </div>
        )}

        {showWppReporte && (
          <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 2300, overflowY: 'auto', padding: '2rem 1rem' }}
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
          </div>
        )}

        {activeTab === 'reportes' && (
          <div>
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
          </div>
        )}
      </main>

      {floatingAlerts.length > 0 && (
        <div aria-live="assertive" aria-atomic="false" style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 5000, width: 'min(390px, calc(100vw - 2rem))', display: 'grid', gap: '0.65rem', pointerEvents: 'none' }}>
          {floatingAlerts.map(alert => {
            const esError = alert.sync && alert.tipo === 'operador_samsara_err';
            return (
              <div key={alert.id} role="alert" style={{ pointerEvents: 'auto', padding: '1rem', borderRadius: '12px', border: `1px solid ${esError ? '#ff4d4d77' : '#00ff4177'}`, borderLeft: `4px solid ${esError ? '#ff4d4d' : '#00ff41'}`, background: esError ? 'linear-gradient(135deg, #1a0707f7, #2a1010f7)' : 'linear-gradient(135deg, #071407f7, #102510f7)', boxShadow: esError ? '0 16px 42px rgba(0,0,0,0.55), 0 0 24px rgba(255,77,77,0.12)' : '0 16px 42px rgba(0,0,0,0.55), 0 0 24px rgba(0,255,65,0.12)', backdropFilter: 'blur(10px)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ width: '34px', height: '34px', flex: '0 0 34px', display: 'grid', placeItems: 'center', borderRadius: '50%', background: esError ? '#ff4d4d18' : '#00ff4118', color: esError ? '#ff4d4d' : '#00ff41', fontSize: '1rem' }}>{esError ? '✕' : '✓'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: esError ? '#ff6b6b' : '#00ff41', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{tituloAlerta(alert.tipo)}</div>
                    <div style={{ color: '#f0fdf4', fontSize: '0.86rem', lineHeight: 1.45, marginTop: '0.25rem', overflowWrap: 'anywhere' }}>{alert.mensaje}</div>
                    {!alert.sync && (
                      <button type="button" onClick={() => { setAlertasView('activas'); setActiveTab('alertas'); setFloatingAlerts(current => current.filter(item => item.id !== alert.id)); }} style={{ marginTop: '0.55rem', padding: 0, border: 0, background: 'none', color: '#72d98a', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>Ver en Alertas</button>
                    )}
                  </div>
                  <button type="button" aria-label="Cerrar notificación" onClick={() => setFloatingAlerts(current => current.filter(item => item.id !== alert.id))} style={{ background: 'none', border: 0, color: '#6a9b6a', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showZoneModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
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
        </div>
      )}

      {showUnidadModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
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
        </div>
      )}

      {selectedVehicle && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
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
        </div>
      )}

      {showViajeModal && viajeDetalle && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => { setShowViajeModal(false); setViajeEditando(false); setViajeForm({}); }}>
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
        </div>
        )}

        {showSeguimientoUpdateModal && (
          <div className="modal-backdrop"
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
          </div>
        )}

        {showMensajeModal && (
          <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowMensajeModal(false)}>
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
        </div>
      )}

      {showPendienteModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={cerrarPendiente}>
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
        </div>
      )}

      {showHistorialModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }} onClick={() => setShowHistorialModal(false)}>
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
        </div>
      )}

      {showExistingGeofenceModal && selectedCliente && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2320 }} onClick={cerrarExistingGeofenceModal}>
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
        </div>
      )}

      {showClienteGeofenceModal && selectedCliente && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2300 }} onClick={cerrarClienteGeofenceModal}>
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
        </div>
      )}

      {showClienteModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.86)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2250 }} onClick={cerrarClienteModal}>
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
        </div>
      )}

      {showRemolqueModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200 }} onClick={cerrarRemolqueModal}>
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
        </div>
      )}

      {showMantenimientoModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200 }} onClick={() => setShowMantenimientoModal(false)}>
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
        </div>
      )}

      {showTurnoModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200 }} onClick={() => { setShowTurnoModal(false); setTurnoSummary(null); }}>
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
        </div>
      )}
    </div>
  );
}

