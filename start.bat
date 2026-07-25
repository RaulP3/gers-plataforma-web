@echo off
echo ===================================
echo  GERS - Plataforma Logistica
echo  Iniciando con Docker...
echo ===================================
echo.

REM Verificar si Docker esta corriendo
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker no esta corriendo.
    echo Por favor abre Docker Desktop y espera a que este listo.
    pause
    exit /b 1
)

echo Construyendo e iniciando servicios...
docker-compose up --build -d

echo.
echo ===================================
echo  GERS iniciado correctamente!
echo ===================================
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:3001
echo ===================================
echo.
echo Para ver logs: docker-compose logs -f
echo Para detener:  docker-compose down
echo.
pause
