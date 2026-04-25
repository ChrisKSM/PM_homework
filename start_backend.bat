@echo off
echo ========================================
echo  Jira WBS Dashboard - Backend Startup
echo ========================================

cd /d "%~dp0backend"

if not exist ".env" (
    echo [WARNING] .env file not found!
    echo Please copy .env.example to .env and fill in your credentials.
    copy .env.example .env
    echo .env created from template. Please edit it before running again.
    pause
    exit /b 1
)

if not exist "venv" (
    echo [INFO] Creating virtual environment...
    python -m venv venv
)

echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat

echo [INFO] Installing dependencies...
pip install -r requirements.txt --quiet

echo [INFO] Starting FastAPI server on http://localhost:8000
echo [INFO] API Docs available at http://localhost:8000/docs
echo.
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
