@echo off
echo Cerrando procesos locales de GERS...
taskkill /F /IM node.exe /T >nul 2>&1
echo Listo.
pause
