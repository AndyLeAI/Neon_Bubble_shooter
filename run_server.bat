@echo off
cd /d "%~dp0"
start "Bobble Pop Server" cmd /k python -m http.server 8080
ping 127.0.0.1 -n 3 > nul
start "" http://localhost:8080/index.html
