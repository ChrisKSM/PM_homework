@echo off
echo ========================================
echo  Jira WBS Dashboard - Frontend Startup
echo ========================================

cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo [INFO] Installing npm dependencies...
    npm install
)

echo [INFO] Starting Vite dev server on http://localhost:5173
echo.
npm run dev

pause
