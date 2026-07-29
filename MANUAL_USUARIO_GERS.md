# Manual de Usuario GERS

## 1. Objetivo del sistema
GERS fue creado para centralizar la operacion logistico-administrativa de la flotilla. El sistema permite monitorear unidades, dar seguimiento a viajes, registrar pendientes, administrar alertas, consultar rutas historicas, crear usuarios y mantener control operativo desde una sola plataforma.

## 2. Para que se elaboro
Este sistema se elaboro para:
- Tener visibilidad de las unidades en tiempo real.
- Reducir el trabajo manual en seguimiento y reportes.
- Centralizar la informacion de viaje, operadores, remolques y clientes.
- Detectar alertas relevantes como geocercas o bajo combustible.
- Controlar accesos por usuario y rol.

## 3. Acceso al sistema
El sistema se puede abrir desde:
- La misma PC del servidor: `http://localhost:3000`
- Otro equipo en la red: `http://IP_DEL_SERVIDOR:3000`

Al ingresar, el sistema solicita usuario y contrasena.

Usuario inicial:
- Usuario: `admin`
- Contrasena: `admin123`

## 4. Inicio de sesion
1. Captura usuario y contrasena.
2. Presiona **Entrar**.
3. Si las credenciales son correctas, el sistema abre el panel principal.
4. La sesion se mantiene activa y se renueva automaticamente mientras el sistema se use.

## 5. Cerrar sesion
En el panel lateral aparece el boton **Salir**.

Al cerrar sesion:
- Se elimina la sesion activa.
- El sistema regresa a la pantalla de login.

## 6. Estructura general del sistema
El menu lateral contiene los modulos principales:
- Dashboard
- Unidades
- Monitoreo
- Notas
- Alertas
- Pendientes
- Viajes
- Operadores
- Remolques
- Seguimiento
- Geocercas
- Historial Rutas
- Reportes
- Usuarios (solo admin)

## 7. Dashboard
El dashboard es la vista inicial de operacion.

### Funciones principales
- Ver total de unidades.
- Ver unidades activas, detenidas y sin senal.
- Ver alertas no leidas.
- Ver viajes activos.
- Ver zonas de riesgo.
- Consultar el panel rapido de unidades.

### Uso
El dashboard sirve para tener una vista inmediata del estado general de la operacion sin entrar a otros modulos.

## 8. Unidades
Este modulo muestra todas las unidades registradas.

### Funciones
- Consultar unidades Samsara.
- Consultar unidades locales registradas manualmente.
- Crear, editar y eliminar unidades locales.
- Filtrar por busqueda.
- Ver estado de cada unidad.

### Para que sirve
Permite mantener una lista operativa de unidades propias del negocio, aunque no todas vengan directamente de Samsara.

## 9. Monitoreo
El modulo de monitoreo muestra las unidades en mapa.

### Funciones
- Visualizar ubicacion de unidades.
- Ver velocidad y estado.
- Seleccionar unidades en el mapa.
- Consultar informacion rapida de cada unidad.

### Uso
Es la vista para seguimiento operativo en tiempo real.

## 10. Notas
Las notas sirven para registrar informacion interna de cada unidad.

### Funciones
- Registrar observaciones.
- Guardar informacion operativa.
- Consultar notas historicas.

### Uso
Sirve para dejar contexto operativo que no pertenece al viaje como tal.

## 11. Alertas
Aqui se muestran las alertas generadas por el sistema.

### Tipos de alertas
- Geocercas.
- Combustible bajo.
- Otras alertas operativas.

### Funciones
- Ver alertas registradas.
- Marcar una alerta como leida.
- Eliminar una alerta individual.
- **Limpiar todas las alertas** con un solo boton.

### Uso
Este modulo permite reaccionar rapido ante eventos importantes y mantener limpia la bandeja de alertas cuando ya fueron atendidas.

## 12. Pendientes
El tablero de pendientes permite organizar trabajo interno.

### Funciones
- Crear pendientes.
- Editar pendientes.
- Cambiar estado por arrastrar y soltar.
- Asignar responsable y turno.
- Agregar comentarios a cada pendiente.

### Estados
- Pendiente
- En proceso
- Completado

### Uso
Se usa para coordinar el trabajo operativo entre turnos.

## 13. Viajes
Modulo para registrar y administrar viajes.

### Funciones
- Crear viajes.
- Editar viajes.
- Eliminar viajes.
- Ver viajes programados y activos.
- Relacionar unidad, conductor, destino, origen, telefono y remolque.

### Uso
Sirve para dar seguimiento a la planeacion y ejecucion de transportes.

## 14. Operadores
Este modulo gestiona los operadores asignados a las unidades.

### Funciones
- Ver lista de operadores.
- Asignar operador a una unidad.
- Sincronizar con el catalogo de Samsara.

### Uso
Ayuda a saber quien lleva cada unidad o a quien se le asigno seguimiento.

## 15. Remolques
Modulo para administrar remolques.

### Funciones
- Registrar remolques.
- Ver remolques disponibles.
- Asignar o desasignar remolques a unidades.
- Consultar historial de asignaciones.

### Uso
Permite controlar la trazabilidad de los remolques.

## 16. Seguimiento
El modulo de seguimiento permite concentrar informacion por unidad o grupo.

### Funciones
- Crear registros de seguimiento.
- Ver seguimiento historico.
- Editar informacion.
- Generar mensajes de seguimiento para compartir por WhatsApp.

### Uso
Se usa para comunicar el estado operativo de cargas, descargas, citas y observaciones.

## 17. Geocercas
Modulo para control de zonas geograficas.

### Funciones
- Crear geocercas manuales.
- Editar geocercas.
- Eliminar geocercas.
- Activar o desactivar geocercas.
- Ver historial de eventos de entrada y salida.

### Uso
Permite controlar si una unidad entra o sale de una zona importante.

## 18. Historial de Rutas
Este modulo muestra el recorrido historico por vehiculo y fecha.

### Funciones
- Seleccionar unidad.
- Seleccionar fecha.
- Visualizar puntos de ruta.
- Ver el mapa con linea del recorrido.
- Consultar lista de puntos registrados.

### Uso
Sirve para revisar por donde paso una unidad en un dia especifico.

## 19. Reportes
Modulo de salida de informacion para analisis.

### Funciones
- Generar reportes de pendientes.
- Generar reportes de viajes.
- Generar reportes de seguimiento.
- Filtrar por fechas y por unidad.
- Descargar reporte en PDF.

### Uso
Ayuda a entregar informacion a supervisores o a la operacion.

## 20. Usuarios
Disponible solo para administradores.

### Funciones
- Crear usuarios nuevos.
- Asignar nombre y rol.
- Ver listado de usuarios.

### Roles
- `admin`: puede ver y administrar usuarios.
- `user`: acceso normal al sistema.

## 21. Botones y acciones rapidas
- **Actualizar**: recarga la informacion actual.
- **Salir**: cierra la sesion.
- **Limpiar alertas**: elimina todas las alertas.
- **Crear usuario**: guarda un usuario nuevo.

## 22. Flujo recomendado de trabajo
1. Iniciar sesion.
2. Revisar dashboard.
3. Consultar alertas.
4. Revisar unidades y monitoreo.
5. Registrar pendientes o viajes.
6. Consultar geocercas y rutas historicas si hay eventos.
7. Generar reportes al final del turno.

## 23. Recomendaciones de uso
- Cerrar sesion al terminar turno.
- Revisar alertas antes de comenzar operaciones.
- Mantener actualizados usuarios, operadores y remolques.
- Apoyarse en el historial de rutas para aclaraciones.
- Limpiar alertas ya atendidas para evitar ruido visual.

## 24. Observacion tecnica
El sistema corre con Docker y guarda la informacion operativa en una base SQLite persistente. Esto permite apagar y encender el servidor sin perder datos.
