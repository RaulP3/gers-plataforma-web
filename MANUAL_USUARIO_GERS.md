# Manual de Usuario GERS

## Version
- Version actual: `1.2.0`

## Acceso
- URL local: `http://localhost:3000`
- Usuario inicial: el valor seguro configurado por el operador en `ADMIN_USERNAME`.
- Contrasena inicial: el valor seguro configurado por el operador en `ADMIN_PASSWORD`.
- El sistema no publica credenciales predeterminadas. Solicita el acceso al administrador responsable.

## Que permite hacer el sistema
- Ver unidades y su estado.
- Monitorear vehiculos en mapa.
- Registrar notas, pendientes y viajes.
- Consultar alertas y rutas historicas.
- Administrar remolques, clientes y usuarios.
- Ver la agenda operativa unificada de citas con estado del vehiculo.
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
- Un viaje puede ser directo o tipo reparto (varias paradas).
- Al activar un viaje con remolque, el sistema asigna el remolque a la unidad automaticamente. Si el remolque ya esta asignado a otra unidad, el sistema muestra el aviso correspondiente.
- En viajes tipo reparto, la cita del viaje muestra el destino de la parada en curso: inicia con el primer destino y cambia al siguiente cuando el vehiculo sale de la parada anterior.

### Citas
- Muestra la agenda operativa unificada de viajes y seguimiento.
- Cada cita muestra el estado del vehiculo: `Circulando`, `Detenido`, `Sin senal`, `Sin GPS reciente` o `En destino`.
- Cuando el vehiculo esta en destino, muestra la hora de llegada a la geocerca.
- Muestra la ETA calculada a la geocerca del destino.
- Si una unidad ya tiene un viaje, su fila de seguimiento se oculta para evitar citas duplicadas.

### Clientes
- Permite administrar clientes.
- Permite vincular cada cliente con geocercas propias o de Samsara.
- Las entradas y salidas de las geocercas vinculadas generan alertas del cliente.

### Mapas
- Permite administrar enlaces a Google My Maps.
- Cada enlace se abre en una pestana nueva.

### Operadores
- Muestra la lista de operadores.
- Permite editar telefono y ocultar operadores de la vista.

### Remolques
- Permite crear remolques desde un modal.
- Los remolques se organizan por categoria:
  - Thermo Refrigerado
  - Caja Seca
  - Tanque
  - Porta Contenedores
- Permite asignar y desasignar remolques a unidades.
- Permite asignar un grupo full (doble remolque) a una unidad.
- Al asignar un remolque a un viaje activo, la unidad queda vinculada al remolque.

### Seguimiento
- Muestra las notas registradas por unidad.
- Sirve como historial operativo de seguimiento.
- Permite consultar el historial de cada fila de seguimiento.

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
1. Copia `.env.example` como `.env` en la raiz del proyecto.
2. Reemplaza los valores de ejemplo de `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SAMSARA_API_TOKEN` y `SAMSARA_WEBHOOK_SECRET`. No compartas ni confirmes `.env`.
3. Inicia y espera las comprobaciones de salud:

```bash
docker compose --env-file .env up --detach --build --wait
```

En Windows, `start.bat` realiza estas validaciones automaticamente. Si alguna credencial o secreto real estuvo expuesto anteriormente, el administrador debe rotarlo tambien en Samsara o en el proveedor correspondiente; eliminarlo del archivo no lo revoca.

Para detenerlo:
```bash
docker compose --env-file .env down
```
