@echo off
echo ===================================
echo  GERS - Plataforma Logistica
echo  Iniciando en modo local
echo ===================================
echo.

if not exist "backend\node_modules" (
  echo [INFO] Instalando dependencias del backend...
  pushd backend
  npm install
  popd
)

if not exist "frontend\node_modules" (
  echo [INFO] Instalando dependencias del frontend...
  pushd frontend
  npm install --legacy-peer-deps
  popd
)

echo Iniciando backend en una ventana nueva...
start "GERS Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

echo Iniciando frontend en una ventana nueva...
start "GERS Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ===================================
echo  GERS iniciado correctamente!
echo ===================================
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:3001
echo ===================================
echo.
pause
