'use client';

import {
  tituloAlerta,
} from '../lib/viajes';

import {
  CitaDetalleModal,
  ClienteGeofenceModal,
  ClienteModal,
  DetalleUnidadModal,
  ExistingGeofenceModal,
  HistorialModal,
  MantenimientoModal,
  MensajeModal,
  PendienteModal,
  RemolqueModal,
  SeguimientoUpdateModal,
  TurnoModal,
  UnidadModal,
  ViajeModal,
  WppReporteModal,
  ZoneModal,
} from './modals';

export function FloatingAlerts({
  floatingAlerts,
  setActiveTab,
  setAlertasView,
  setFloatingAlerts,
}) {
  return (<div aria-live="assertive" aria-atomic="false" style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 5000, width: 'min(390px, calc(100vw - 2rem))', display: 'grid', gap: '0.65rem', pointerEvents: 'none' }}>
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
        </div>);
}

export function ModalsRoot({
  actualizarMensaje,
  actualizarParadaViaje,
  actualizarViaje,
  agregarComentarioPendiente,
  allGeofences,
  calculandoEta,
  cerrarClienteGeofenceModal,
  cerrarClienteModal,
  cerrarExistingGeofenceModal,
  cerrarPendiente,
  cerrarRemolqueModal,
  citaLlegada,
  citaSeleccionada,
  citasOperativas,
  clienteDeDestino,
  clienteEditando,
  clienteGeofenceSaving,
  clienteSaving,
  clientes,
  comentarioRapido,
  copiarMensaje,
  copiarReporteWpp,
  copiarReporteWppEnvio,
  crearClienteGeofence,
  crearRemolque,
  crearZonaRiesgo,
  currentUser,
  descargarPdfTurno,
  destinoInput,
  diaEntregaCita,
  displayRemolque,
  driverPhoneOverrides,
  editUnidad,
  eliminarPendiente,
  eliminarViaje,
  entregarTurno,
  enviarWhatsApp,
  estadoColors,
  estadoVehiculoCita,
  etaData,
  etaError,
  existingGeofenceSaving,
  existingGeofenceSearch,
  existingGeofenceSelections,
  findGeofence,
  formCliente,
  formClienteGeofence,
  formMantenimiento,
  formPendiente,
  formRemolque,
  formUnidad,
  formatFechaProgramada,
  generarReporteWppCliente,
  geocercasCoincidentes,
  geofenceOptions,
  geofenceOwnerId,
  googleMyMapsEmbedUrl,
  googleUrlSeguro,
  gruposUnicos,
  guardarActualizacionSeguimiento,
  guardarCierreTurno,
  guardarCliente,
  guardarComentarioRapido,
  guardarMantenimiento,
  guardarOperador,
  guardarPendiente,
  guardarRemolqueSeleccionado,
  guardarUnidad,
  historialPendientes,
  labelDiaEntrega,
  mantenimientoEditando,
  mantenimientoSaving,
  mapaUrl,
  mapas,
  marcandoCitaId,
  marcarCitaCompletada,
  mensajeCliente,
  mensajeTexto,
  newZone,
  nuevoComentarioPendiente,
  numeroRemolque,
  obtenerMiembrosFull,
  obtenerOpcionesRemolque,
  obtenerRemolqueAsignadoUnidad,
  obtenerSeguimientoUnidad,
  obtenerViajesUnidad,
  operadorDraft,
  operadores,
  ordenarViajesUnidad,
  parseCitaDate,
  parseFecha,
  parseFechaProgramada,
  pendienteEditando,
  pendienteSaving,
  recalcularReporteWpp,
  remolqueDraft,
  remolqueEditando,
  remolqueModo,
  remolques,
  remolquesFullDraft,
  s,
  samsaraDrivers,
  seguimientoModalError,
  seguimientoModalGrupo,
  seguimientoModalNota,
  seguimientoModalSaving,
  seguimientoModalUnidadId,
  seleccionarUnidadSeguimiento,
  selectedCliente,
  selectedVehicle,
  setCitaSeleccionada,
  setComentarioRapido,
  setDestinoInput,
  setExistingGeofenceSearch,
  setExistingGeofenceSelections,
  setFormCliente,
  setFormClienteGeofence,
  setFormMantenimiento,
  setFormPendiente,
  setFormRemolque,
  setFormUnidad,
  setMensajeTexto,
  setNewZone,
  setNuevoComentarioPendiente,
  setOperadorDraft,
  setRemolqueDraft,
  setRemolqueModo,
  setRemolquesFullDraft,
  setSeguimientoModalGrupo,
  setSeguimientoModalNota,
  setSelectedVehicle,
  setShowHistorialModal,
  setShowMantenimientoModal,
  setShowMensajeModal,
  setShowSeguimientoUpdateModal,
  setShowTurnoModal,
  setShowUnidadModal,
  setShowViajeModal,
  setShowWppReporte,
  setShowZoneModal,
  setTelefonoDraft,
  setTurnoForm,
  setTurnoSummary,
  setViajeDetalle,
  setViajeEditando,
  setViajeForm,
  setWppReporteDia,
  setWppReporteGrupos,
  setWppReporteTextos,
  showClienteGeofenceModal,
  showClienteModal,
  showExistingGeofenceModal,
  showHistorialModal,
  showMantenimientoModal,
  showMensajeModal,
  showPendienteModal,
  showRemolqueModal,
  showSeguimientoUpdateModal,
  showTurnoModal,
  showUnidadModal,
  showViajeModal,
  showWppReporte,
  showZoneModal,
  telefonoDraft,
  todasLasUnidades,
  turnoForm,
  turnoLoading,
  turnoSaving,
  turnoSummary,
  vehiculoDeCita,
  vehiculos,
  velocidadKmh,
  viajeDetalle,
  viajeEditando,
  viajeForm,
  viajeSaving,
  viajes,
  vincularExistingGeofence,
  wppReporteDia,
  wppReporteGrupos,
  wppReporteTextos,
}) {
  return (
    <>
{showZoneModal &&
  <ZoneModal
  setShowZoneModal={setShowZoneModal}
  crearZonaRiesgo={crearZonaRiesgo}
  s={s}
  newZone={newZone}
  setNewZone={setNewZone}
/>
}

      {showUnidadModal &&
  <UnidadModal
  setShowUnidadModal={setShowUnidadModal}
  editUnidad={editUnidad}
  guardarUnidad={guardarUnidad}
  s={s}
  formUnidad={formUnidad}
  setFormUnidad={setFormUnidad}
/>
}

      {selectedVehicle &&
  <DetalleUnidadModal
  setSelectedVehicle={setSelectedVehicle}
  selectedVehicle={selectedVehicle}
  operadorDraft={operadorDraft}
  samsaraDrivers={samsaraDrivers}
  setOperadorDraft={setOperadorDraft}
  setTelefonoDraft={setTelefonoDraft}
  driverPhoneOverrides={driverPhoneOverrides}
  telefonoDraft={telefonoDraft}
  guardarOperador={guardarOperador}
  remolques={remolques}
  obtenerMiembrosFull={obtenerMiembrosFull}
  displayRemolque={displayRemolque}
  numeroRemolque={numeroRemolque}
  setRemolqueModo={setRemolqueModo}
  remolqueModo={remolqueModo}
  remolqueDraft={remolqueDraft}
  setRemolqueDraft={setRemolqueDraft}
  remolquesFullDraft={remolquesFullDraft}
  setRemolquesFullDraft={setRemolquesFullDraft}
  s={s}
  guardarRemolqueSeleccionado={guardarRemolqueSeleccionado}
  viajes={viajes}
  ordenarViajesUnidad={ordenarViajesUnidad}
  estadoColors={estadoColors}
  parseFechaProgramada={parseFechaProgramada}
  velocidadKmh={velocidadKmh}
  comentarioRapido={comentarioRapido}
  setComentarioRapido={setComentarioRapido}
  destinoInput={destinoInput}
  setDestinoInput={setDestinoInput}
  geofenceOptions={geofenceOptions}
  calculandoEta={calculandoEta}
  etaError={etaError}
  etaData={etaData}
  guardarComentarioRapido={guardarComentarioRapido}
/>
}

      {showViajeModal && viajeDetalle &&
  <ViajeModal
  setShowViajeModal={setShowViajeModal}
  setViajeEditando={setViajeEditando}
  setViajeForm={setViajeForm}
  viajeEditando={viajeEditando}
  eliminarViaje={eliminarViaje}
  viajeDetalle={viajeDetalle}
  setViajeDetalle={setViajeDetalle}
  s={s}
  viajeForm={viajeForm}
  vehiculos={vehiculos}
  operadores={operadores}
  obtenerRemolqueAsignadoUnidad={obtenerRemolqueAsignadoUnidad}
  geofenceOptions={geofenceOptions}
  obtenerOpcionesRemolque={obtenerOpcionesRemolque}
  actualizarViaje={actualizarViaje}
  viajeSaving={viajeSaving}
  estadoColors={estadoColors}
  geocercasCoincidentes={geocercasCoincidentes}
  parseFecha={parseFecha}
  actualizarParadaViaje={actualizarParadaViaje}
  formatFechaProgramada={formatFechaProgramada}
  mapas={mapas}
  mapaUrl={mapaUrl}
  googleUrlSeguro={googleUrlSeguro}
  googleMyMapsEmbedUrl={googleMyMapsEmbedUrl}
/>
}

        {showSeguimientoUpdateModal &&
  <SeguimientoUpdateModal
  setShowSeguimientoUpdateModal={setShowSeguimientoUpdateModal}
  s={s}
  todasLasUnidades={todasLasUnidades}
  seguimientoModalUnidadId={seguimientoModalUnidadId}
  obtenerSeguimientoUnidad={obtenerSeguimientoUnidad}
  seleccionarUnidadSeguimiento={seleccionarUnidadSeguimiento}
  obtenerViajesUnidad={obtenerViajesUnidad}
  operadores={operadores}
  seguimientoModalGrupo={seguimientoModalGrupo}
  setSeguimientoModalGrupo={setSeguimientoModalGrupo}
  seguimientoModalNota={seguimientoModalNota}
  setSeguimientoModalNota={setSeguimientoModalNota}
  seguimientoModalError={seguimientoModalError}
  guardarActualizacionSeguimiento={guardarActualizacionSeguimiento}
  seguimientoModalSaving={seguimientoModalSaving}
/>
}

        {showMensajeModal &&
  <MensajeModal
  setShowMensajeModal={setShowMensajeModal}
  s={s}
  mensajeCliente={mensajeCliente}
  actualizarMensaje={actualizarMensaje}
  gruposUnicos={gruposUnicos}
  mensajeTexto={mensajeTexto}
  setMensajeTexto={setMensajeTexto}
  copiarMensaje={copiarMensaje}
  enviarWhatsApp={enviarWhatsApp}
/>
}

      {showPendienteModal &&
  <PendienteModal
  cerrarPendiente={cerrarPendiente}
  pendienteEditando={pendienteEditando}
  guardarPendiente={guardarPendiente}
  s={s}
  formPendiente={formPendiente}
  setFormPendiente={setFormPendiente}
  eliminarPendiente={eliminarPendiente}
  pendienteSaving={pendienteSaving}
  parseFecha={parseFecha}
  nuevoComentarioPendiente={nuevoComentarioPendiente}
  setNuevoComentarioPendiente={setNuevoComentarioPendiente}
  agregarComentarioPendiente={agregarComentarioPendiente}
/>
}

      {showHistorialModal &&
  <HistorialModal
  setShowHistorialModal={setShowHistorialModal}
  historialPendientes={historialPendientes}
  s={s}
  parseFecha={parseFecha}
/>
}

      {showExistingGeofenceModal && selectedCliente &&
  <ExistingGeofenceModal
  cerrarExistingGeofenceModal={cerrarExistingGeofenceModal}
  selectedCliente={selectedCliente}
  vincularExistingGeofence={vincularExistingGeofence}
  existingGeofenceSaving={existingGeofenceSaving}
  s={s}
  existingGeofenceSearch={existingGeofenceSearch}
  setExistingGeofenceSearch={setExistingGeofenceSearch}
  allGeofences={allGeofences}
  geofenceOwnerId={geofenceOwnerId}
  clientes={clientes}
  existingGeofenceSelections={existingGeofenceSelections}
  setExistingGeofenceSelections={setExistingGeofenceSelections}
/>
}

      {showClienteGeofenceModal && selectedCliente &&
  <ClienteGeofenceModal
  cerrarClienteGeofenceModal={cerrarClienteGeofenceModal}
  selectedCliente={selectedCliente}
  crearClienteGeofence={crearClienteGeofence}
  clienteGeofenceSaving={clienteGeofenceSaving}
  s={s}
  formClienteGeofence={formClienteGeofence}
  setFormClienteGeofence={setFormClienteGeofence}
/>
}

      {showClienteModal &&
  <ClienteModal
  cerrarClienteModal={cerrarClienteModal}
  clienteEditando={clienteEditando}
  guardarCliente={guardarCliente}
  clienteSaving={clienteSaving}
  s={s}
  formCliente={formCliente}
  setFormCliente={setFormCliente}
/>
}

      {showRemolqueModal &&
  <RemolqueModal
  cerrarRemolqueModal={cerrarRemolqueModal}
  remolqueEditando={remolqueEditando}
  s={s}
  formRemolque={formRemolque}
  setFormRemolque={setFormRemolque}
  crearRemolque={crearRemolque}
/>
}

      {showMantenimientoModal &&
  <MantenimientoModal
  setShowMantenimientoModal={setShowMantenimientoModal}
  mantenimientoEditando={mantenimientoEditando}
  s={s}
  formMantenimiento={formMantenimiento}
  setFormMantenimiento={setFormMantenimiento}
  todasLasUnidades={todasLasUnidades}
  remolques={remolques}
  mantenimientoSaving={mantenimientoSaving}
  guardarMantenimiento={guardarMantenimiento}
/>
}

      {showTurnoModal &&
  <TurnoModal
  setShowTurnoModal={setShowTurnoModal}
  setTurnoSummary={setTurnoSummary}
  turnoSummary={turnoSummary}
  entregarTurno={entregarTurno}
  s={s}
  turnoForm={turnoForm}
  setTurnoForm={setTurnoForm}
  turnoLoading={turnoLoading}
  descargarPdfTurno={descargarPdfTurno}
  guardarCierreTurno={guardarCierreTurno}
  turnoSaving={turnoSaving}
  currentUser={currentUser}
/>
}


{citaSeleccionada && <CitaDetalleModal
  setCitaSeleccionada={setCitaSeleccionada}
  citaSeleccionada={citaSeleccionada}
  findGeofence={findGeofence}
  geocercasCoincidentes={geocercasCoincidentes}
  vehiculoDeCita={vehiculoDeCita}
  estadoVehiculoCita={estadoVehiculoCita}
  parseCitaDate={parseCitaDate}
  s={s}
  velocidadKmh={velocidadKmh}
  citaLlegada={citaLlegada}
  allGeofences={allGeofences}
  marcarCitaCompletada={marcarCitaCompletada}
  marcandoCitaId={marcandoCitaId}
/>}

{showWppReporte && <WppReporteModal
  setShowWppReporte={setShowWppReporte}
  s={s}
  wppReporteDia={wppReporteDia}
  setWppReporteDia={setWppReporteDia}
  recalcularReporteWpp={recalcularReporteWpp}
  citasOperativas={citasOperativas}
  diaEntregaCita={diaEntregaCita}
  clienteDeDestino={clienteDeDestino}
  labelDiaEntrega={labelDiaEntrega}
  wppReporteGrupos={wppReporteGrupos}
  wppReporteTextos={wppReporteTextos}
  generarReporteWppCliente={generarReporteWppCliente}
  copiarReporteWppEnvio={copiarReporteWppEnvio}
  copiarReporteWpp={copiarReporteWpp}
  setWppReporteGrupos={setWppReporteGrupos}
  setWppReporteTextos={setWppReporteTextos}
/>}
    </>
  );
}
