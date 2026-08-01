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
npm ci
npm run dev
```

### Frontend
```bash
cd frontend
npm ci
npm run dev
```

El backend corre en `http://localhost:3001` y el frontend en `http://localhost:3000`.

## Docker

1. Crea el archivo de configuracion local desde la plantilla:

```powershell
Copy-Item .env.example .env
```

2. Reemplaza todos los valores de ejemplo en `.env`. Son obligatorios `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SAMSARA_API_TOKEN` y `SAMSARA_WEBHOOK_SECRET`. Usa credenciales unicas y genera el secreto del webhook con un generador criptograficamente seguro.

3. Inicia los servicios y espera a que esten saludables:

```bash
docker compose --env-file .env up --detach --build --wait
```

En Windows tambien puedes ejecutar `start.bat`; valida `.env` y solo informa exito cuando ambos servicios estan saludables.

Para detenerlo:

```bash
docker compose --env-file .env down
```

No confirmes archivos `.env` ni secretos. Si un token, contrasena o secreto con apariencia real fue confirmado, compartido o expuesto previamente, reemplazalo y rotalo en el proveedor correspondiente; cambiar solamente la documentacion o el repositorio no revoca el valor anterior.

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/dashboard | Estadísticas generales |
| GET | /api/operaciones | Listar operaciones |
| POST | /api/operaciones | Crear operación |
| PUT | /api/operaciones/:id | Actualizar estado |
| GET | /api/monitoreo | Datos de monitoreo |
| POST | /api/monitoreo | Registrar posición |

## Acceso Inicial

No existen credenciales publicas predeterminadas. Usa el usuario y la contrasena definidos por el operador en `.env` para Docker o en `backend/.env` para desarrollo local.

Para desarrollo local, crea `backend/.env` desde `backend/.env.example`, reemplaza sus valores de ejemplo y ejecuta `start-local.bat`. El script ejecuta `npm ci` en ambos proyectos y rechaza credenciales de administrador vacias.
