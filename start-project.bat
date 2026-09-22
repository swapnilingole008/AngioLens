@echo off

echo Starting Flask backend...
start "Flask Backend" cmd /k "cd /d %~dp0backend && py -3.13 app.py"

echo Starting React frontend...
start "React Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo AngioLens is starting...
echo Flask: http://127.0.0.1:5000
echo React: http://localhost:5173
echo.

pause