# Manual de Usuario GERS

## Version
- Version actual: `1.1.0`

## Acceso
- URL local: `http://localhost:3000`
- Usuario inicial: `admin`
- Contrasena inicial: `admin123`

## Que permite hacer el sistema
- Ver unidades y su estado.
- Monitorear vehiculos en mapa.
- Registrar notas, pendientes y viajes.
- Consultar alertas y rutas historicas.
- Administrar remolques y usuarios.
- Generar y descargar reportes en PDF.
- Entregar turno con resumen y cierre de sesion.

## Inicio de sesion
1. Escribe tu usuario.
2. Escribe tu contrasena.
3. Presiona `Entrar`.

## Cerrar sesion
- Usa el boton `Salir` del panel lateral.

## Modulos principales

### Dashboard
- Muestra el resumen general de la operacion.
- Permite ver unidades activas, detenidas y sin senal.
- Muestra alertas y viajes vigentes.

### Unidades
- Lista unidades Samsara y locales.
- Permite crear, editar y eliminar unidades locales.
- Sirve para consultar notas y datos generales de cada unidad.

### Monitoreo
- Muestra las unidades en mapa.
- Permite revisar velocidad, ubicacion y estado.

### Notas
- Permite registrar notas de tipo `seguimiento`, `incidente` y `mantenimiento`.
- El historial aparece debajo del formulario.
- En mantenimiento se muestra un mensaje de apoyo para captura.

### Alertas
- Muestra alertas de geocerca, combustible bajo y otras alertas operativas.
- Puedes marcar una alerta como leida o limpiar todas.

### Pendientes
- Permite crear y dar seguimiento a pendientes.
- Se pueden mover entre estados y agregar comentarios.

### Viajes
- Permite crear y editar viajes.
- Guarda origen, destino, conductor, telefono, remolque y fechas.
- Muestra ETA con fecha y hora de llegada.

### Operadores
- Muestra la lista de operadores.
- Permite editar telefono y ocultar operadores de la vista.

### Remolques
- Permite crear remolques desde un modal.
- Los remolques se organizan por categoria:
  - Thermo Refrigerado
  - Caja Seca
  - Tanque
- Permite asignar y desasignar remolques a unidades.

### Seguimiento
- Muestra las notas registradas por unidad.
- Sirve como historial operativo de seguimiento.

### Geocercas
- Permite crear y administrar geocercas.
- Muestra entradas y salidas de unidades.

### Historial Rutas
- Permite consultar rutas historicas por unidad y fecha.

### Reportes
- Genera reportes de pendientes, viajes y seguimiento.
- Permite descargar el reporte en PDF.

### Usuarios
- Disponible solo para administradores.
- Permite crear usuarios nuevos.

## Entrega de turno
1. Presiona `Entregar turno`.
2. Captura nombre del turno, horas y observaciones.
3. Genera el resumen.
4. Usa `Guardar reporte y cerrar sesion`.
5. El sistema descarga el PDF y cierra la sesion automaticamente.

## Archivos descargados
- Los PDF se descargan en tu equipo desde el navegador.
- Normalmente quedan en la carpeta de descargas.

## Recomendaciones
- Cerrar sesion al terminar el turno.
- Revisar alertas antes de iniciar operacion.
- Usar notas para dejar contexto operativo.
- Generar el reporte de turno al finalizar la jornada.

## Instalacion con Docker
```bash
docker compose up -d --build
```

Para detenerlo:
```bash
docker compose down
```
