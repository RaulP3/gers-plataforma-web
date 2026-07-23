# GERS - Plataforma Web

Plataforma web de gestión, monitoreo y operación logística de GERS.

## Stack

- **Frontend:** Next.js + React
- **Backend:** Node.js + Express
- **Base de datos:** SQLite

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

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/dashboard | Estadísticas generales |
| GET | /api/operaciones | Listar operaciones |
| POST | /api/operaciones | Crear operación |
| PUT | /api/operaciones/:id | Actualizar estado |
| GET | /api/monitoreo | Datos de monitoreo |
| POST | /api/monitoreo | Registrar posición |
