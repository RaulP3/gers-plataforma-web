@echo off
setlocal
cd /d "%~dp0"
echo Deteniendo servicios GERS...
if exist ".env" (
    docker compose --env-file ".env" down
) else (
    docker compose down
)
if errorlevel 1 (
    echo [ERROR] No se pudieron detener los servicios.
    pause
    exit /b 1
)
echo Servicios detenidos.
pause
exit /b 0
