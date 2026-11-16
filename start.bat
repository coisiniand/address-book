@echo off
title EE308FZ Address Book
cd /d "%~dp0"

rem ---- Locate Node.js: PATH first, then the Node bundled with WorkBuddy ----
set "NODE_EXE="
where node >nul 2>nul
if not errorlevel 1 set "NODE_EXE=node"
if not defined NODE_EXE (
  for /d %%V in ("%USERPROFILE%\.workbuddy\binaries\node\versions\*") do (
    if exist "%%~fV\node.exe" set "NODE_EXE=%%~fV\node.exe"
  )
)
if not defined NODE_EXE (
  echo [ERROR] Node.js was not found.
  echo Please install Node.js 18 or newer from https://nodejs.org/
  pause
  exit /b 1
)

rem ---- Optional: run the smoke test with   start.bat test ----
if /i "%~1"=="test" (
  echo Running the end-to-end smoke test ...
  "%NODE_EXE%" scripts\smoke-test.js
  echo.
  pause
  exit /b 0
)

rem ---- Do not start a second instance if port 3000 is already in use ----
netstat -ano | findstr /r /c:":3000 .*LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo The server is already running on port 3000.
  echo Opening http://localhost:3000 ...
  start http://localhost:3000
  pause
  exit /b 0
)

echo ==================================================
echo   EE308FZ Address Book
echo   URL : http://localhost:3000
echo   Keep this window open. Press Ctrl+C to stop.
echo ==================================================
echo.
start http://localhost:3000
"%NODE_EXE%" server\index.js
echo.
echo Server stopped.
pause
