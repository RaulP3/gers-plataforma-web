# GERS - Plataforma Web

Plataforma web de gestión, monitoreo y operación logística de GERS.

## Version

- Version actual: `1.1.0`
- Frontend: `Next.js 14.0.4` / `React 18.2.0`
- Backend: `Node.js` / `Express 4.18.2`
- Base de datos: `SQLite`

## Stack

- **Frontend:** Next.js + React
- **Backend:** Node.js + Express
- **Base de datos:** SQLite

## Lo Implementado

- Login con sesion y cierre de sesion.
- Administracion de usuarios.
- Pendientes con comentarios y seguimiento por usuario autenticado.
- Notas por unidad con tipos `seguimiento`, `incidente` y `mantenimiento`.
- ETAS con fecha y hora de llegada.
- Entrega de turno con resumen y descarga de PDF.
- Reportes con exportacion a PDF.
- Remolques con modal de alta y categorias `Thermo Refrigerado`, `Caja Seca` y `Tanque`.
- Seguimiento de notas con historial y formato limpio.

## Estructura

```
gers-plataforma-web/
├── backend/          # API REST
│   ├── server.js     # Servidor Express
│   └── package.json
├── frontend/         # App Next.js
│   ├── src/app/      # Pages y layouts
│   └── package.json
└── README.md
```

## Instalación

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

El backend corre en `http://localhost:3001` y el frontend en `http://localhost:3000`.

## Docker

Para levantar todo:

```bash
docker compose up -d --build
```

Para detenerlo:

```bash
docker compose down
```

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/dashboard | Estadísticas generales |
| GET | /api/operaciones | Listar operaciones |
| POST | /api/operaciones | Crear operación |
| PUT | /api/operaciones/:id | Actualizar estado |
| GET | /api/monitoreo | Datos de monitoreo |
| POST | /api/monitoreo | Registrar posición |

## Credenciales Iniciales

- Usuario: `admin`
- Contraseña: `admin123`
