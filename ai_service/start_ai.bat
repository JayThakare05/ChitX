@echo off
REM ChitX AI Oracle — start script
REM Always uses the local venv Python so python-multipart and all deps are available.
REM Usage: Double-click this file OR run: start_ai.bat

echo Starting ChitX AI Oracle on http://localhost:8000 ...
venv\Scripts\python run.py
pause
