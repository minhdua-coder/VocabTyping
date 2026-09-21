@echo off
setlocal
cd /d "%~dp0"

echo === VocabTyping: closing any running instance ===
taskkill /IM electron.exe /F >nul 2>&1

echo === VocabTyping: installing dependencies ===
call npm install
if errorlevel 1 (
  echo.
  echo npm install failed.
  pause
  exit /b 1
)

echo === VocabTyping: starting app ===
call npm start

endlocal
