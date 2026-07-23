'use client';

import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001/api';

export default function Home() {
  const [stats, setStats] = useState({});
  const [operaciones, setOperaciones] = useState([]);
  const [nuevaOp, setNuevaOp] = useState({ codigo: '', descripcion: '', origen: '', destino: '' });
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    fetchStats();
    fetchOperaciones();
  }, []);

  const fetchStats = async () => {
    const res = await fetch(`${API_URL}/dashboard`);
    const data = await res.json();
    setStats(data);
  };

  const fetchOperaciones = async () => {
    const res = await fetch(`${API_URL}/operaciones`);
    const data = await res.json();
    setOperaciones(data);
  };

  const crearOperacion = async (e) => {
    e.preventDefault();
    await fetch(`${API_URL}/operaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevaOp),
    });
    setNuevaOp({ codigo: '', descripcion: '', origen: '', destino: '' });
    fetchOperaciones();
    fetchStats();
  };

  const actualizarEstado = async (id, estado) => {
    await fetch(`${API_URL}/operaciones/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    fetchOperaciones();
    fetchStats();
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', minHeight: '100vh' }}>
      <header style={{ background: '#1a365d', color: 'white', padding: '1rem 2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>GERS - Plataforma Logistica</h1>
      </header>

      <nav style={{ background: '#2d3748', padding: '0.5rem 2rem' }}>
        {['dashboard', 'operaciones', 'monitoreo'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? '#4299e1' : 'transparent',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              marginRight: '0.5rem',
              cursor: 'pointer',
              borderRadius: '4px',
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      <main style={{ padding: '2rem' }}>
        {activeTab === 'dashboard' && (
          <div>
            <h2>Dashboard</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {[
                { label: 'Total Operaciones', value: stats.totalOperaciones, color: '#4299e1' },
                { label: 'Operaciones Activas', value: stats.operacionesActivas, color: '#48bb78' },
                { label: 'Completadas', value: stats.operacionesCompletadas, color: '#9f7aea' },
              ].map((card) => (
                <div
                  key={card.label}
                  style={{
                    background: card.color,
                    color: 'white',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '2rem' }}>{card.value}</h3>
                  <p style={{ margin: '0.5rem 0 0' }}>{card.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'operaciones' && (
          <div>
            <h2>Operaciones</h2>
            <form onSubmit={crearOperacion} style={{ marginBottom: '2rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input placeholder="Codigo" value={nuevaOp.codigo} onChange={(e) => setNuevaOp({ ...nuevaOp, codigo: e.target.value })} required style={{ padding: '0.5rem' }} />
              <input placeholder="Descripcion" value={nuevaOp.descripcion} onChange={(e) => setNuevaOp({ ...nuevaOp, descripcion: e.target.value })} style={{ padding: '0.5rem' }} />
              <input placeholder="Origen" value={nuevaOp.origen} onChange={(e) => setNuevaOp({ ...nuevaOp, origen: e.target.value })} style={{ padding: '0.5rem' }} />
              <input placeholder="Destino" value={nuevaOp.destino} onChange={(e) => setNuevaOp({ ...nuevaOp, destino: e.target.value })} style={{ padding: '0.5rem' }} />
              <button type="submit" style={{ background: '#4299e1', color: 'white', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '4px' }}>
                Crear
              </button>
            </form>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ccc' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Codigo</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Descripcion</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Origen</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Destino</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Estado</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {operaciones.map((op) => (
                  <tr key={op.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.5rem' }}>{op.codigo}</td>
                    <td style={{ padding: '0.5rem' }}>{op.descripcion}</td>
                    <td style={{ padding: '0.5rem' }}>{op.origen}</td>
                    <td style={{ padding: '0.5rem' }}>{op.destino}</td>
                    <td style={{ padding: '0.5rem' }}>{op.estado}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <select
                        value={op.estado}
                        onChange={(e) => actualizarEstado(op.id, e.target.value)}
                        style={{ padding: '0.25rem' }}
                      >
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
        )}

        {activeTab === 'monitoreo' && (
          <div>
            <h2>Monitoreo</h2>
            <p style={{ color: '#666' }}>Mapa de monitoreo en tiempo real (proximamente)</p>
          </div>
        )}
      </main>
    </div>
  );
}
