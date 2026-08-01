@echo off
setlocal
cd /d "%~dp0"
echo ===================================
echo  GERS - Plataforma Logistica
echo  Iniciando con Docker...
echo ===================================
echo.

if not exist ".env" (
    echo [ERROR] Falta el archivo .env.
    echo Crealo a partir de .env.example y reemplaza todos los valores de ejemplo.
    pause
    exit /b 1
)

findstr /R /C:"=elige_" /C:"=reemplaza_" /C:"=genera_" ".env" >nul
if not errorlevel 1 (
    echo [ERROR] .env aun contiene valores de ejemplo. Reemplazalos antes de iniciar.
    pause
    exit /b 1
)

REM Verificar si Docker esta corriendo
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker no esta corriendo.
    echo Por favor abre Docker Desktop y espera a que este listo.
    pause
    exit /b 1
)

echo Construyendo e iniciando servicios...
docker compose --env-file ".env" config --quiet
if errorlevel 1 (
    echo [ERROR] .env no contiene todas las variables requeridas.
    pause
    exit /b 1
)

docker compose --env-file ".env" up --build --detach --wait
if errorlevel 1 (
    echo [ERROR] Los servicios no iniciaron correctamente o no estan saludables.
    docker compose --env-file ".env" ps
    pause
    exit /b 1
)

echo.
echo ===================================
echo  GERS iniciado correctamente!
echo ===================================
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:3001
echo ===================================
echo.
echo Para ver logs: docker compose --env-file .env logs -f
echo Para detener:  stop.bat
echo.
pause
exit /b 0
