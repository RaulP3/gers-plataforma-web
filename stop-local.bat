@echo off
echo Cerrando procesos locales de GERS...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":3000 .*LISTENING" /C:":3001 .*LISTENING"') do (
  taskkill /F /PID %%P /T >nul 2>&1
)
echo Listo.
pause
exit /b 0
