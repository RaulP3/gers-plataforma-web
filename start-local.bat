@echo off
setlocal
cd /d "%~dp0"
echo ===================================
echo  GERS - Plataforma Logistica
echo  Iniciando en modo local
echo ===================================
echo.

if not exist "backend\.env" (
  echo [ERROR] Falta backend\.env.
  echo Crealo desde backend\.env.example y define credenciales de administrador propias.
  pause
  exit /b 1
)

findstr /R /C:"^ADMIN_USERNAME=..*" "backend\.env" >nul
if errorlevel 1 (
  echo [ERROR] ADMIN_USERNAME debe tener un valor explicito en backend\.env.
  pause
  exit /b 1
)

findstr /R /C:"^ADMIN_PASSWORD=..*" "backend\.env" >nul
if errorlevel 1 (
  echo [ERROR] ADMIN_PASSWORD debe tener un valor explicito en backend\.env.
  pause
  exit /b 1
)

echo [INFO] Instalando dependencias reproducibles del backend...
pushd backend
call npm ci
if errorlevel 1 (
  popd
  echo [ERROR] No se pudieron instalar las dependencias del backend.
  pause
  exit /b 1
)
popd

echo [INFO] Instalando dependencias reproducibles del frontend...
pushd frontend
call npm ci
if errorlevel 1 (
  popd
  echo [ERROR] No se pudieron instalar las dependencias del frontend.
  pause
  exit /b 1
)
popd

echo Iniciando backend en una ventana nueva...
start "GERS Backend" cmd /k "cd /d ""%~dp0backend"" && npm.cmd run dev"
if errorlevel 1 (
  echo [ERROR] No se pudo abrir el proceso del backend.
  pause
  exit /b 1
)

echo Iniciando frontend en una ventana nueva...
start "GERS Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm.cmd run dev"
if errorlevel 1 (
  echo [ERROR] No se pudo abrir el proceso del frontend.
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
pause
exit /b 0
