# GERS - Plataforma Web

Plataforma web de gestión, monitoreo y operación logística de GERS. Permite monitorear unidades en tiempo real (vía Samsara), administrar viajes, citas, remolques, clientes, geocercas, pendientes, notas, alertas y reportes, con entrega de turno y exportación a PDF.

## Version

- Version actual: `1.1.0`
- Frontend: `Next.js 16.2.12` / `React 18.2.0`
- Backend: `Node.js` / `Express 4.18.2`
- Base de datos: `SQLite` (`sqlite3`)
- Mapas: `Leaflet 1.9.4`
- PDF: `jsPDF 4.2.1` + `jspdf-autotable`

## Stack

- **Frontend:** Next.js + React (App Router, `'use client'`)
- **Backend:** Node.js + Express
- **Base de datos:** SQLite (archivo local persistente)
- **Integración:** Samsara (vehículos, ubicaciones, conductores, geocercas/addresses, webhooks)
- **Tiempo real:** SSE (`/api/live`) + polling con refresco automático
- **Despliegue:** Docker Compose (dev/on-premise), Railway (backend) y Vercel (frontend)

## Módulos principales

| Pestaña | Descripción |
|---------|-------------|
| Dashboard | Resumen general: unidades activas, detenidas, sin señal, alertas y viajes vigentes |
| Unidades | Lista de unidades Samsara y locales; crear, editar y eliminar unidades locales |
| Monitoreo | Unidades en mapa con velocidad, ubicación y estado; zonas de riesgo |
| Notas | Notas por unidad de tipo `seguimiento`, `incidente` y `mantenimiento` |
| Alertas | Alertas de geocerca, combustible bajo y operativas; marcar leídas, archivar, limpiar |
| Operaciones | Tablero de pendientes con drag & drop, comentarios e historial |
| Viajes | Crear/editar viajes (directo o reparto con paradas), conductor, remolque y fechas; ETA |
| Citas | Agenda operativa unificada de viajes y seguimiento con estado del vehículo y ETA |
| Clientes | Administración de clientes y vínculo con geocercas (locales y Samsara) |
| Operadores | Operadores con teléfono; ocultar de la vista |
| Remolques | Alta de remolques por categoría; asignación sencilla o full (doble) |
| Seguimiento | Fila de seguimiento por unidad con citas, estatus, historial e importación |
| Geocercas | Crear/administrar geocercas y consultar entradas/salidas |
| Mapas | Enlaces a Google My Maps |
| Rutas | Historial de rutas por unidad y fecha |
| Usuarios | Administración de usuarios (solo admin) |
| Reportes | Reportes de pendientes, viajes y seguimiento con exportación a PDF |

## Funcionalidades clave

### Citas (agenda operativa)
- Une citas de **viajes** (activos) y **seguimiento** en una sola tabla.
- Una fila de seguimiento se oculta si ya existe un viaje para esa unidad/fecha/destino-remolque, incluyendo viajes **completados/cancelados** (no se muestran citas de viajes terminados).
- Estado del vehículo por cita: `Circulando`, `Detenido`, `Sin señal`, `Sin GPS reciente (N min)` o `En destino`.
- En `En destino` muestra la **hora de llegada** a la geocerca del destino (último evento de entrada del vehículo).
- ETA calculada a la geocerca del destino; si la unidad ya está dentro, marca `Llegada · 0 km`.
- En viajes tipo **reparto** la cita muestra el destino de la **parada en curso**: inicia con el primer destino y cambia al siguiente cuando el vehículo sale (la parada se marca `completada` y la siguiente pasa a `en_camino`).
- Umbral de GPS para marcar cita sin señal reciente: `CITAS_GPS_STALE_MIN = 60` minutos (`page.js:11`).

### Sincronización de remolques con viajes
- Al poner un viaje en estado activo (`en_ruta_vacio`, `en_ruta_cargado`, `proceso_carga`, `proceso_descarga`, `proceso_liberacion`, `espera_ingreso`, `en_resguardo`) y tener remolque, el backend asigna el remolque a la unidad automáticamente (`syncTripTrailer`, `server.js:1890`).
- Un remolque o grupo full (doble remolque) ya asignado a otra unidad devuelve `409` con el detalle.

### Geocercas y eventos
- Verificación automática de geocercas locales y de Samsara (`check-geofences`).
- Registra eventos `entrada`/`salida` por vehículo y geocerca (`geofence_events`).
- Actualiza paradas de viajes al entrar/salir de la geocerca del destino.
- Genera alertas de geocerca y de clientes vinculados.

### Tiempo real
- SSE en `/api/live` para notificaciones en vivo (ubicaciones, alertas, remolques, etc.).
- Refresco periódico automático de datos.

### Reportes y turno
- Entrega de turno con resumen y descarga de PDF.
- Reportes de pendientes, viajes y seguimiento con exportación a PDF.

## Estructura

```
gers-plataforma-web/
├── backend/                    # API REST (Express)
│   ├── server.js               # Servidor, rutas, base de datos, lógica de negocio
│   ├── railway.json            # Config de despliegue Railway
│   ├── Dockerfile
│   ├── .env.example            # Variables requeridas
│   ├── .env.docker.local       # Variables locales para Docker
│   ├── gers.db                 # Base de datos SQLite (generada en runtime)
│   └── test/
│       └── smoke.js            # Prueba integral (levanta servidor + Samsara mock)
├── frontend/                   # App Next.js
│   ├── src/app/
│   │   ├── layout.js           # Layout raíz
│   │   ├── page.js             # Página principal (todos los módulos)
│   │   └── globals.css
│   ├── src/components/
│   │   ├── MapaUnidades.js     # Mapa Leaflet con unidades y zonas de riesgo
│   │   └── RouteMap.js         # Mapa de ruta histórica
│   ├── vercel.json             # Config de despliegue Vercel
│   ├── next.config.js          # output: 'standalone'
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml          # Backend + Frontend con volúmenes y healthchecks
├── .env.example                # Variables del Compose
├── start.bat                   # Inicio Docker (Windows, valida .env)
├── stop.bat                    # Detención Docker
├── start-local.bat             # Inicio local (npm ci + dev)
├── stop-local.bat              # Detención local
├── MANUAL_USUARIO_GERS.md      # Manual de usuario
└── README.md
```

## Base de datos

Archivo SQLite en `DATABASE_PATH` (por defecto `backend/gers.db`; en Docker `/app/data/gers.db` con volumen persistente `gers-data`). Principales tablas:

| Tabla | Contenido |
|-------|-----------|
| `users`, `sessions` | Autenticación (hash + salt) y sesiones |
| `vehicles` / `vehicle_locations` | Unidades y última ubicación reportada |
| `viajes`, `viaje_paradas` | Viajes (directo/reparto) y sus paradas con estado |
| `seguimiento`, `seguimiento_historial` | Seguimiento operativo por unidad y su historial |
| `remolques`, `remolque_asignaciones` | Remolques y asignaciones (sencillo/full) |
| `geofences`, `geofence_events`, `vehicle_geofence_state` | Geocercas y eventos de entrada/salida |
| `clientes`, `cliente_geofence_links` | Clientes y vínculos con geocercas |
| `alertas` | Alertas operativas (leídas/archivadas) |
| `pendientes`, `comentarios_pendientes`, `pendientes_historial` | Pendientes con comentarios e historial |
| `comentarios` | Notas por unidad |
| `route_history` | Historial de posiciones para rutas |
| `vehicle_operators` | Operadores por vehículo |
| `turnos_reportes` | Reportes de entrega de turno |
| `mapas_mymaps` | Enlaces a Google My Maps |
| `risk_zones` | Zonas de riesgo personalizadas |

## Instalación

### Requisitos

- Node.js 22+ (para desarrollo local) o Docker (para despliegue con Compose)
- Token de API de Samsara y secreto de webhook (para datos en vivo)

### Desarrollo local

Crea `backend/.env` desde `backend/.env.example` y define credenciales propias:

```bash
cd backend
npm ci
npm run dev
```

En otra terminal:

```bash
cd frontend
npm ci
npm run dev
```

En Windows también puedes ejecutar `start-local.bat` (instala dependencias, valida `backend/.env` y abre ambos procesos). Para detener: `stop-local.bat`.

El backend corre en `http://localhost:3001` y el frontend en `http://localhost:3000`.

### Docker

1. Crea la configuración local desde la plantilla:

```powershell
Copy-Item .env.example .env
```

2. Reemplaza todos los valores de ejemplo en `.env`. Son obligatorios `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SAMSARA_API_TOKEN` y `SAMSARA_WEBHOOK_SECRET`. Usa credenciales únicas y genera el secreto del webhook con un generador criptográficamente seguro.

3. Inicia los servicios y espera a que estén saludables:

```bash
docker compose --env-file .env up --detach --build --wait
```

En Windows también puedes ejecutar `start.bat`; valida `.env` y solo informa éxito cuando ambos servicios están saludables.

Para detenerlo:

```bash
docker compose --env-file .env down
```

Los datos persisten en el volumen `gers-data`. No confirmes archivos `.env` ni secretos. Si un token, contraseña o secreto con apariencia real fue confirmado, compartido o expuesto previamente, reemplázalo y rótalo en el proveedor correspondiente; cambiar solamente la documentación o el repositorio no revoca el valor anterior.

## Variables de entorno

### `.env` (raíz, Docker Compose)

| Variable | Descripción |
|----------|-------------|
| `ADMIN_USERNAME` | Usuario administrador inicial |
| `ADMIN_PASSWORD` | Contraseña administradora (larga y única) |
| `SAMSARA_API_TOKEN` | Token de API de Samsara |
| `SAMSARA_WEBHOOK_SECRET` | Secreto del webhook de Samsara |
| `NEXT_PUBLIC_API_URL` | URL pública del backend (p. ej. `https://tu-backend.up.railway.app/api`) |

### `backend/.env` (desarrollo local)

| Variable | Descripción |
|----------|-------------|
| `SAMSARA_API_TOKEN` | Token de API de Samsara |
| `SAMSARA_WEBHOOK_SECRET` | Secreto del webhook de Samsara |
| `SAMSARA_API_URL` | URL base de la API de Samsara (por defecto `https://api.samsara.com/v1`) |
| `PORT` | Puerto del backend (por defecto `3001`) |
| `FRONTEND_URL` | Origen permitido por CORS (por defecto `http://localhost:3000`) |
| `ADMIN_USERNAME` | Usuario administrador inicial |
| `ADMIN_PASSWORD` | Contraseña administradora |
| `ADMIN_NAME` | Nombre del administrador |

### `frontend/.env` (desarrollo local opcional)

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | URL de la API; si se omite, el frontend usa `http://<host>:3001/api` |

## API Endpoints

Todas las rutas van precedidas de `/api` salvo `GET /health`. Las rutas protegidas requieren `Authorization: Bearer <token>` y algunas solo admiten rol `admin`.

### Autenticación y usuarios

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/login | Iniciar sesión |
| GET | /api/auth/me | Usuario actual |
| POST | /api/auth/logout | Cerrar sesión |
| GET | /api/users | Listar usuarios (admin) |
| POST | /api/users | Crear usuario (admin) |
| DELETE | /api/users/:id | Eliminar usuario (admin) |

### Vehículos y Samsara

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/live | Eventos en tiempo real (SSE) |
| GET | /api/samsara/vehicles | Vehículos con ubicación en vivo |
| GET | /api/samsara/drivers | Conductores Samsara |
| GET | /api/vehicle-operators | Operadores por vehículo |
| PUT | /api/vehicle-operators/:vehicleId | Actualizar operador/teléfono |
| POST | /api/webhooks/samsara | Webhook de Samsara |
| POST | /api/check-fuel | Verificación de combustible bajo |
| GET | /api/unidades | Unidades locales |
| POST | /api/unidades | Crear unidad local |
| PUT | /api/unidades/:id | Actualizar unidad local |
| DELETE | /api/unidades/:id | Eliminar unidad local |

### Geocercas y eventos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/geofences | Listar geocercas |
| POST | /api/geofences | Crear geocerca |
| PUT | /api/geofences/toggle | Activar/desactivar geocercas |
| PUT | /api/geofences/:id | Actualizar geocerca |
| DELETE | /api/geofences/:id | Eliminar geocerca |
| GET | /api/samsara/addresses | Geocercas Samsara |
| GET | /api/geofence-events | Eventos de geocerca (filtro por vehicle_id, geofence_id, limit) |
| DELETE | /api/geofence-events | Limpiar eventos (admin) |
| POST | /api/check-geofences | Verificación manual de geocercas |
| POST | /api/geocode-address | Geocodificar dirección |

### Viajes y paradas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/viajes | Listar viajes (con paradas) |
| GET | /api/viajes/activos | Viajes activos |
| POST | /api/viajes | Crear viaje |
| PUT | /api/viajes/:id | Actualizar viaje (sincroniza remolque al activar) |
| PUT | /api/viajes/:id/paradas/:paradaId | Actualizar estado de parada |
| DELETE | /api/viajes/:id | Eliminar viaje |

### Citas / Seguimiento

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/seguimiento | Listar seguimiento |
| POST | /api/seguimiento | Crear fila de seguimiento |
| PUT | /api/seguimiento/:id | Actualizar seguimiento |
| DELETE | /api/seguimiento/:id | Eliminar seguimiento |
| GET | /api/seguimiento/:id/historial | Historial de una fila |
| GET | /api/seguimiento/historial/todas | Historial global |
| POST | /api/seguimiento/import | Importar seguimiento (admin) |

### Remolques

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/remolques | Listar remolques |
| POST | /api/remolques | Crear remolque |
| PUT | /api/remolques/:id | Actualizar remolque |
| DELETE | /api/remolques/:id | Eliminar remolque |
| POST | /api/remolques/full/asignar | Asignar grupo full (doble) |
| POST | /api/remolques/:id/asignar | Asignar remolque a unidad |
| POST | /api/remolques/:id/desasignar | Desasignar remolque |
| GET | /api/remolques/:id/historial | Historial del remolque |
| GET | /api/remolques/asignaciones/activas | Asignaciones activas |

### Clientes

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/clientes | Listar clientes |
| GET | /api/clientes/:id | Detalle de cliente |
| POST | /api/clientes | Crear cliente |
| PUT | /api/clientes/:id | Actualizar cliente |
| DELETE | /api/clientes/:id | Eliminar cliente |
| GET | /api/clientes/geofence-links | Vínculos cliente-geocerca |
| POST | /api/clientes/:id/geofences/link | Vincular geocerca a cliente |
| DELETE | /api/clientes/:id/geofences/:source/:geofenceRef | Desvincular geocerca |

### Alertas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/alertas | Listar alertas (activas o archivadas) |
| POST | /api/alertas | Crear alerta |
| PUT | /api/alertas/:id/leer | Marcar como leída |
| PUT | /api/alertas/:id/archivar | Archivar alerta |
| PUT | /api/alertas/:id/restaurar | Restaurar alerta |
| PUT | /api/alertas/archivar-todas | Archivar todas |
| DELETE | /api/alertas/:id | Eliminar alerta |
| DELETE | /api/alertas | Limpiar alertas (admin) |

### Pendientes y operaciones

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/pendientes | Listar pendientes |
| POST | /api/pendientes | Crear pendiente |
| PUT | /api/pendientes/:id | Actualizar pendiente |
| DELETE | /api/pendientes/:id | Eliminar pendiente |
| GET | /api/pendientes/:id/comentarios | Comentarios del pendiente |
| POST | /api/pendientes/:id/comentarios | Agregar comentario |
| DELETE | /api/pendientes/:id/comentarios/:comentarioId | Eliminar comentario |
| GET | /api/pendientes/historial | Historial de pendientes |
| POST | /api/pendientes/archivar-completados | Archivar completados (admin) |

### Notas / Comentarios

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/comentarios | Listar notas |
| POST | /api/comentarios | Crear nota |
| PUT | /api/comentarios/:id | Actualizar nota |
| DELETE | /api/comentarios/:id | Eliminar nota |

### Rutas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/route-history | Historial de ruta (filtro por unidad/fecha) |
| GET | /api/route-history/vehicles | Vehículos con historial |
| GET | /api/route-history/dates | Fechas con historial |
| GET | /api/route-history/last | Últimas posiciones por vehículo |
| DELETE | /api/route-history | Limpiar historial (admin) |
| POST | /api/calculate-route | Calcular ruta/ETA entre origen y destino |

### Mapas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/mapas | Listar enlaces My Maps |
| POST | /api/mapas | Crear enlace |
| PUT | /api/mapas/:id | Actualizar enlace |
| DELETE | /api/mapas/:id | Eliminar enlace |

### Turnos y reportes

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/turnos/entregar | Entregar turno |
| POST | /api/turnos/resumen | Generar resumen de turno |
| GET | /api/turnos/entregas | Entregas registradas |
| GET | /api/reportes/resumen | Resumen general (dashboard) |
| GET | /api/reportes/pendientes | Reporte de pendientes |
| GET | /api/reportes/pendientes-completados | Reporte de pendientes completados |
| GET | /api/reportes/viajes | Reporte de viajes |
| GET | /api/reportes/notas | Reporte de notas |
| GET | /api/reportes/seguimiento | Reporte de seguimiento |

### Zonas de riesgo

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/risk-zones | Listar zonas de riesgo |
| POST | /api/risk-zones | Crear zona de riesgo |
| DELETE | /api/risk-zones/:id | Eliminar zona de riesgo |

### Salud

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /health | Verificación de salud (usada por healthcheck de Docker) |

## Pruebas

El backend incluye un test de humo integral (`backend/test/smoke.js`) que levanta el servidor con una base temporal y un servidor Samsara simulado, y verifica flujos de autenticación, viajes, paradas, remolques, geocercas, alertas, pendientes, seguimiento y reportes.

```bash
cd backend
npm test
```

## Despliegue en la nube

El backend no es compatible con serverless (usa SQLite en archivo local y SSE), por lo que se recomienda un servicio con disco persistente. El frontend Next.js sí puede ir a Vercel.

### Backend: Railway

- `backend/railway.json` define build (`npm ci --omit=dev`) y start (`node server.js`).
- Configura las variables de entorno (ver sección anterior) y un volumen persistente para el archivo de la base de datos.
- Expón el puerto `3001`.

### Frontend: Vercel

- `frontend/vercel.json` define framework Next.js, `installCommand: npm ci`, `buildCommand: npm run build` y `outputDirectory: .next`.
- Configura `NEXT_PUBLIC_API_URL` apuntando al backend desplegado (p. ej. `https://tu-backend.up.railway.app/api`).
- Ajusta el origen permitido en el backend (`FRONTEND_URL`) para permitir el dominio de Vercel.

## Acceso Inicial

No existen credenciales públicas predeterminadas. Usa el usuario y la contraseña definidos por el operador en `.env` para Docker o en `backend/.env` para desarrollo local. El sistema crea el administrador inicial con esos valores.

## Documentación adicional

- `MANUAL_USUARIO_GERS.md` — manual de uso para el operador.
