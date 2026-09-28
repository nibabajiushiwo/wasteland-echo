@echo off
cd /d "%~dp0"
if not defined PORT set "PORT=8788"
start "" http://localhost:%PORT%
node server.mjs
pause
