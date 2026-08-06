'use client';

import useGersDashboard from '../lib/useGersDashboard';
import {
  Sidebar,
  DashboardSection,
  UnidadesSection,
  MonitoreoSection,
  NotasSection,
  AlertasSection,
  OperacionesSection,
  ViajesSection,
  ClientesSection,
  OperadoresSection,
  RemolquesSection,
  MantenimientoSection,
  SeguimientoSection,
  GeocercasSection,
  MapasSection,
  RutasSection,
  CitasSection,
  UsuariosSection,
  ReportesSection,
} from '../components/sections';
import { FloatingAlerts, ModalsRoot } from '../components/overlays';

export default function Home() {
  const d = useGersDashboard();
  const {
    authLoading,
    currentUser,
    loginForm,
    setLoginForm,
    loginError,
    handleLogin,
    s,
    activeTab,
    gruposUnicos,
  } = d;

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
      <Sidebar {...d} />

      <main className="app-main" style={{ ...s.main, overflow: activeTab === 'dashboard' ? 'hidden' : 'auto' }}>
        {activeTab === 'dashboard' && <DashboardSection {...d} />}

        {activeTab === 'unidades' && <UnidadesSection {...d} />}

        {activeTab === 'monitoreo' && <MonitoreoSection {...d} />}

        {activeTab === 'notas' && <NotasSection {...d} />}

        {activeTab === 'alertas' && <AlertasSection {...d} />}

        {activeTab === 'operaciones' && <OperacionesSection {...d} />}

        {activeTab === 'viajes' && <ViajesSection {...d} />}

        {activeTab === 'clientes' && <ClientesSection {...d} />}

        {activeTab === 'operadores' && <OperadoresSection {...d} />}

        {activeTab === 'remolques' && <RemolquesSection {...d} />}

        {activeTab === 'mantenimiento' && <MantenimientoSection {...d} />}

        {activeTab === 'seguimiento' && <SeguimientoSection {...d} />}

        {activeTab === 'geocercas' && <GeocercasSection {...d} />}

        {activeTab === 'mapas' && <MapasSection {...d} />}

        {activeTab === 'rutas' && <RutasSection {...d} />}

        {activeTab === 'citas' && <CitasSection {...d} />}
        {activeTab === 'usuarios' && currentUser?.rol === 'admin' && <UsuariosSection {...d} />}

        {activeTab === 'reportes' && <ReportesSection {...d} />}
      </main>

      <FloatingAlerts {...d} />
      <ModalsRoot {...d} />
    </div>
  );
}

