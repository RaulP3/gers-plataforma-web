@echo off
echo Cerrando procesos locales de GERS en puertos 3000/3001...
set "found=0"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":3000 .*LISTENING" /C:":3001 .*LISTENING"') do (
  set "found=1"
  echo   Matando PID %%P
  taskkill /F /PID %%P /T >nul 2>&1
  if errorlevel 1 echo   [AVISO] No se pudo terminar PID %%P (puede que ya no exista)
)
if "%found%"=="0" (
  echo   No se encontraron procesos escuchando en los puertos 3000/3001.
)
echo Listo.
pause
exit /b 0
