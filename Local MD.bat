@echo off
setlocal
cd /d "%~dp0"
set "PORT=4173"
set "URL=http://127.0.0.1:%PORT%"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js bulunamadi. Paketli Windows surumunu kullanin veya Node.js kurun.
  pause
  exit /b 1
)

start "" "%URL%"
node server.mjs
