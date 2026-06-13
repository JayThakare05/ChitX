@echo off
REM ChitX ML Prediction Server — Flask / port 5050
REM This is the SEPARATE ML server that handles /predict and /parse-csv.
REM It must be running for pool simulation and emergency reprioritisation to work.
REM
REM Usage: Double-click this file OR run: start_ml.bat
REM
REM NOTE: This is NOT the FastAPI Oracle (port 8000).
REM       Run BOTH servers simultaneously for full functionality:
REM       - This file  → port 5050  (ML prediction)
REM       - start_ai.bat → port 8000  (AI Oracle, Groq, chat)

echo.
echo ============================================================
echo  ChitX ML Prediction Server
echo  Flask running on http://localhost:5050
echo ============================================================
echo.

REM Use venv Python if available, otherwise fall back to system Python
if exist "venv\Scripts\python.exe" (
    echo Using venv Python...
    venv\Scripts\python all_models\server.py
) else (
    echo Using system Python...
    python all_models\server.py
)

pause
